import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authFromRequest } from '@/lib/auth-server';
import { verifyAndEnrichPlace } from '@/lib/place-cache';
import { orderByProximity } from '@/lib/itinerary-geo';

// Partial regeneration keeps the LLM call small (only the requested days),
// but verification still fans out to Google; 60s matches the generate route.
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface StoredPlace {
  name: string;
  neighborhood?: string | null;
  category?: string;
  address?: string;
  lat?: number;
  lng?: number;
  why?: string;
  description?: string;
  photo_url?: string | null;
  price_level?: number | null;
  rating?: number | null;
  google_place_id?: string | null;
  locked?: boolean;
}

interface StoredDay {
  day_number: number;
  narrative: string;
  places: StoredPlace[];
}

interface LlmPlace {
  name: string;
  neighborhood?: string | null;
  category: string;
  address: string;
  lat: number;
  lng: number;
  why: string;
  description?: string;
}

interface RegenerateBody {
  dayNumbers: number[];
  instructions?: string;
}

const REGENERATE_SYSTEM_PROMPT = `You are Pocket Compass — part concierge, part poet, part that friend who somehow always knows the perfect spot. The user already has a multi-day itinerary and wants you to REDRAW specific days of it. Same impeccable taste, same warm-witty voice, same zero pretension.

THE RULES OF A REDRAW:
- You will be shown the FULL current trip and told which days to redraw.
- Some places on a redraw day are LOCKED — the user has decided on them. You do NOT return locked places; they stay automatically. Your new suggestions must COMPLEMENT them: same neighborhood or an easy hop away, no category pile-up (if lunch is locked, don't suggest two more restaurants).
- NEVER suggest a place that already appears anywhere in the trip — locked or not, any day.
- Geographic intelligence is everything. New places must cluster with the locked anchors of that day. If a day has no locked places, cluster the day itself sensibly against its neighboring days so the trip still flows without backtracking.
- Respect the trip's pace, preferences, avoids, and start/end points exactly as on first generation.
- Return ONLY the requested days, each with a fresh 2–3 sentence narrative in your voice (acknowledge the locked anchors naturally — they're part of the day's story) and ONLY the NEW places for that day (the number you were asked for).

PLACE QUALITY:
- Real, Google-Maps-searchable official names with real addresses and lat/lng. Every suggestion is verified against Google Places; hallucinated ones get dropped, so only include places you're 95% sure exist.
- Categories: restaurant, cafe, bar, hotel, viewpoint, nature, shopping, museum, hidden-gem
- One vivid description line and one opinionated "why" per place.

OUTPUT FORMAT — JSON ONLY:
{
  "days": [
    {
      "day_number": 2,
      "narrative": "Fresh 2-3 sentence day narrative.",
      "places": [ { "name": "...", "neighborhood": "...", "category": "cafe", "address": "...", "lat": 0, "lng": 0, "why": "...", "description": "..." } ]
    }
  ]
}`;

const REGENERATE_SCHEMA = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day_number: { type: 'integer' },
          narrative: { type: 'string' },
          places: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                neighborhood: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                category: {
                  type: 'string',
                  enum: [
                    'restaurant', 'cafe', 'bar', 'hotel', 'viewpoint',
                    'nature', 'shopping', 'museum', 'hidden-gem',
                  ],
                },
                address: { type: 'string' },
                lat: { type: 'number' },
                lng: { type: 'number' },
                why: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['name', 'neighborhood', 'category', 'address', 'lat', 'lng', 'why', 'description'],
              additionalProperties: false,
            },
          },
        },
        required: ['day_number', 'narrative', 'places'],
        additionalProperties: false,
      },
    },
  },
  required: ['days'],
  additionalProperties: false,
} as const;

const PACE_TARGET: Record<string, number> = { relaxed: 3, standard: 4, packed: 5 };

// Normalized key for duplicate suppression across the whole trip.
const placeKey = (p: { google_place_id?: string | null; name: string }) =>
  p.google_place_id || p.name.trim().toLowerCase();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as RegenerateBody;
    const dayNumbers = [...new Set(body.dayNumbers || [])].filter(
      n => Number.isInteger(n) && n >= 1
    );
    if (!dayNumbers.length || dayNumbers.length > 10) {
      return NextResponse.json({ error: 'Pick 1–10 days to redraw' }, { status: 400 });
    }
    if (body.instructions && body.instructions.length > 500) {
      return NextResponse.json({ error: 'Instructions too long' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Load the trip (RLS scopes to owner).
    const { data: itin, error: itinErr } = await auth.supabase
      .from('itineraries')
      .select('id, title, destination, num_days, prompt, constraints')
      .eq('id', id)
      .single();
    if (itinErr || !itin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: dayRows } = await auth.supabase
      .from('itinerary_days')
      .select('day_number, narrative, places')
      .eq('itinerary_id', id)
      .order('day_number', { ascending: true });
    const days = (dayRows || []) as StoredDay[];

    const regenDays = days.filter(d => dayNumbers.includes(d.day_number));
    if (regenDays.length !== dayNumbers.length) {
      return NextResponse.json({ error: 'Unknown day number' }, { status: 400 });
    }

    // --- Build the trip context for the model ---
    const c = (itin.constraints || {}) as Record<string, any>;
    const pace: string = c.pace || 'standard';
    const target = PACE_TARGET[pace] ?? 4;

    const constraintLines: string[] = [
      `Destination: ${itin.destination}`,
      `Length: ${itin.num_days} days`,
      `Pace: ${pace}`,
    ];
    if (c.preferences?.length) constraintLines.push(`Preferences: ${c.preferences.join(', ')}`);
    if (c.avoids?.length) constraintLines.push(`Avoid: ${c.avoids.join(', ')}`);
    if (c.startPoint) constraintLines.push(`Trip starts at / staying near: ${c.startPoint}`);
    if (c.endPoint) constraintLines.push(`Trip ends at: ${c.endPoint}`);
    if (itin.prompt) constraintLines.push(`Original trip notes: "${itin.prompt}"`);

    const tripLines = days.map(d => {
      const marker = dayNumbers.includes(d.day_number) ? ' [REDRAW THIS DAY]' : '';
      const placeList = (d.places || [])
        .map(p => `${p.name}${p.locked ? ' (LOCKED)' : ''}${p.neighborhood ? ` — ${p.neighborhood}` : ''}`)
        .join('; ') || '(empty)';
      return `Day ${d.day_number}${marker}: ${placeList}`;
    });

    const askLines = regenDays.map(d => {
      const locked = (d.places || []).filter(p => p.locked);
      const want = Math.max(1, target - locked.length);
      const anchors = locked.length
        ? `Locked anchors to build around: ${locked
            .map(p => `${p.name} (${p.category || 'place'}${p.neighborhood ? `, ${p.neighborhood}` : ''})`)
            .join('; ')}.`
        : 'No locked places — you have the whole day.';
      return `Day ${d.day_number}: suggest ${want} NEW place${want !== 1 ? 's' : ''}. ${anchors}`;
    });

    const userMessage = [
      constraintLines.join('\n'),
      '',
      'CURRENT TRIP:',
      tripLines.join('\n'),
      '',
      'REDRAW REQUEST:',
      askLines.join('\n'),
      body.instructions ? `\nUser's direction for this redraw: "${body.instructions}"` : null,
      '',
      'JSON only. Only the requested days. Only NEW places — never repeat anything already in the trip.',
    ].filter(l => l !== null).join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      system: REGENERATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      output_config: {
        format: { type: 'json_schema', schema: REGENERATE_SCHEMA },
      },
    });

    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json(
        { error: 'Too many days at once — redraw fewer days per request.' },
        { status: 502 }
      );
    }
    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let parsed: { days: Array<{ day_number: number; narrative: string; places: LlmPlace[] }> };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: 'Model returned malformed JSON' }, { status: 502 });
    }

    // Everything already in the trip, for duplicate suppression.
    const existingKeys = new Set<string>();
    days.forEach(d => (d.places || []).forEach(p => existingKeys.add(placeKey(p))));

    // Verify the new suggestions (locked places are already verified data —
    // they are never re-verified and never touched).
    const updatedDays: StoredDay[] = [];
    for (const regen of parsed.days) {
      const original = days.find(d => d.day_number === regen.day_number);
      if (!original || !dayNumbers.includes(regen.day_number)) continue;

      const lockedPlaces = (original.places || []).filter(p => p.locked);

      const results = await Promise.allSettled(
        (regen.places || []).map(p => verifyAndEnrichPlace(p, { photoMaxWidth: 600 }))
      );

      const newPlaces: StoredPlace[] = [];
      (regen.places || []).forEach((p, i) => {
        const r = results[i];
        if (r.status !== 'fulfilled') return;
        const g = r.value;
        if (!g.verified) {
          console.log(`[Itinerary] Redraw dropped unverified: ${p.name}`);
          return;
        }
        const candidate: StoredPlace = {
          ...p,
          name: g.google_name || p.name,
          address: g.address || p.address,
          lat: g.lat ?? p.lat,
          lng: g.lng ?? p.lng,
          photo_url: g.photo_url,
          price_level: g.price_level,
          rating: g.rating,
          google_place_id: g.google_place_id,
          locked: false,
        };
        const key = placeKey(candidate);
        if (existingKeys.has(key)) {
          console.log(`[Itinerary] Redraw dropped duplicate: ${candidate.name}`);
          return;
        }
        existingKeys.add(key);
        newPlaces.push(candidate);
      });

      // Locked anchors lead the array so proximity ordering walks out from
      // the user's decided stops.
      const merged = orderByProximity([...lockedPlaces, ...newPlaces]);
      if (merged.length === 0) continue; // nothing verified — keep the old day

      updatedDays.push({
        day_number: regen.day_number,
        narrative: regen.narrative || original.narrative,
        places: merged,
      });
    }

    if (updatedDays.length === 0) {
      return NextResponse.json(
        { error: 'No new places could be verified — try redrawing again' },
        { status: 502 }
      );
    }

    for (const d of updatedDays) {
      const { error } = await auth.supabase
        .from('itinerary_days')
        .update({ narrative: d.narrative, places: d.places })
        .eq('itinerary_id', id)
        .eq('day_number', d.day_number);
      if (error) {
        console.error('[Itinerary] Redraw day update failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Return the full refreshed trip so the client can swap state in place.
    const { data: freshDays } = await auth.supabase
      .from('itinerary_days')
      .select('day_number, narrative, places')
      .eq('itinerary_id', id)
      .order('day_number', { ascending: true });

    return NextResponse.json({
      id: itin.id,
      title: itin.title,
      destination: itin.destination,
      num_days: itin.num_days,
      days: freshDays || [],
      regenerated: updatedDays.map(d => d.day_number),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Itinerary] regenerate error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
