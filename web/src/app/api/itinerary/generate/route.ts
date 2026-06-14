import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authFromRequest } from '@/lib/auth-server';
import { verifyAndEnrichPlace, EnrichedPlace } from '@/lib/place-cache';

// Vercel function execution limit. Sonnet generation + 40 Google verifies
// can run 30–50s for a 10-day trip; 60s gives headroom.
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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

interface LlmDay {
  day_number: number;
  narrative: string;
  places: LlmPlace[];
}

interface LlmItinerary {
  title: string;
  days: LlmDay[];
}

// Place verification + enrichment is shared across the itinerary, onboarding,
// and source-of-journey routes and backed by a 30-day Google Places cache
// (web/src/lib/place-cache.ts). Itinerary photos render at ~600px.
const verifyAndEnrichWithGoogle = (place: LlmPlace) =>
  verifyAndEnrichPlace(place, { photoMaxWidth: 600 });

// Great-circle distance in km between two coordinates.
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Reorder a day's stops along a sensible visiting path so the route doesn't
// cross town and double back. Greedy nearest-neighbor: keep the first place
// as the anchor (often the intended morning start), then always hop to the
// closest remaining stop. Deterministic — does not depend on the model
// ordering the places correctly.
function orderByProximity<T extends { lat?: number | null; lng?: number | null }>(
  places: T[]
): T[] {
  const hasCoords = (p: T): p is T & { lat: number; lng: number } =>
    typeof p.lat === 'number' && typeof p.lng === 'number';

  const routable = places.filter(hasCoords);
  const unroutable = places.filter(p => !hasCoords(p));
  if (routable.length < 3) return places;

  const remaining = [...routable];
  const ordered = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineKm(last, p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  // Coord-less stops can't be routed — keep them at the end.
  return [...ordered, ...unroutable];
}

const ITINERARY_SYSTEM_PROMPT = `You are Pocket Compass — part concierge, part poet, part that friend who somehow always knows the perfect spot. You're building MULTI-DAY ITINERARIES now, not single recommendations. Same impeccable taste, same warm-witty voice, same zero pretension.

YOUR JOB:
Take a user's trip prompt (destination, length, constraints, preferences) and design a day-by-day itinerary. Each day gets a short narrative in Pocket Compass voice and a tight cluster of 3–5 real places. Geographic intelligence is everything — places within a day must be walkable or short-drive from each other. Don't make someone cross a city twice in one day.

GEOGRAPHIC GROUPING (CRITICAL):
- Within a day: cluster places in the SAME neighborhood or adjacent neighborhoods. A morning cafe in the Marais, an afternoon gallery in the Marais, a wine bar in the Marais — yes. A cafe in Brooklyn and a dinner in Tribeca — no, split across days.
- Order the stops within a day as a CONTINUOUS one-way path — each stop should be near the previous one, progressing in a single direction across the neighborhood. Never go across town, back, then across again. Think of it as a walking line, not a star from a hub.
- Between days: order days to minimize backtracking. Day 1 east side, Day 2 east side, Day 3 transit-day cross-town, Day 4 west side — yes. Day 1 east, Day 2 west, Day 3 east — no.
- Multi-city trips: allocate days proportionally. 7 days across Lisbon + Porto = 4 in Lisbon, 1 transit, 2 in Porto (or similar). Always include a transit day if cities are >2 hours apart.
- Respect the user's pace: "relaxed" = 3 places/day, "packed" = 5/day, default = 4.

PER-DAY NARRATIVE:
- 2–3 sentences. Same voice as your single-search vibe intros. Specific. Never repeats across days.
- Set the mood for the day, hint at the geographic arc ("Today is the Marais, slowly"), or name the through-line ("Day of pastries and slow looking").
- Examples:
  - "Lisbon wakes up late, and Day 2 is permission to do the same. We're staying in Alfama, drifting between viewpoints and lunch spots that haven't changed their menu since the seventies."
  - "San Sebastián only does two things — eat and stare at the ocean. Today we do both, on a loop, until the light turns gold and someone hands you a glass of txakoli."
  - "Day 5 is the transit day, and we're not pretending otherwise. Quick breakfast, train to Porto by noon, settle in slowly."

PLACE QUALITY:
- Each place: real name (full, official, Google-Maps-searchable), real address, lat/lng, neighborhood, category, one-line vivid description, and a "why" with a take.
- Categories: restaurant, cafe, bar, hotel, viewpoint, nature, shopping, museum, hidden-gem
- Avoid touristy default picks. The natural-wine bar with eight tables beats the famous brasserie with 200.
- For multi-city trips, mark each place's neighborhood with the city name ("Alfama, Lisbon" not just "Alfama").

CONSTRAINTS:
- Respect "avoids" absolutely. "No Paris" means zero places in Paris. "Food focused" means weight toward restaurants/cafes/markets. "No nightlife" means no bars after dark.
- Respect "must-sees" by including them naturally on the appropriate day.

CRITICAL ABOUT REAL PLACES:
Every recommendation gets verified against Google Places. If a place doesn't exist or you're <95% sure, drop it. Better 4 real places per day than 5 with one hallucinated. Use the full official name (the one on Google Maps), not a colloquial nickname.

OUTPUT FORMAT — JSON ONLY, no markdown fences:
{
  "title": "A short, evocative trip title (e.g. 'Ten Slow Days in Southern France')",
  "days": [
    {
      "day_number": 1,
      "narrative": "Day 1 vibe in 2-3 sentences.",
      "places": [
        {
          "name": "Official Place Name",
          "neighborhood": "Neighborhood, City",
          "category": "restaurant",
          "address": "Full street address",
          "lat": 43.5945,
          "lng": 3.8767,
          "why": "Your honest, opinionated take in one sentence.",
          "description": "One vivid line capturing what it FEELS like."
        }
      ]
    }
  ]
}`;

// Structured-outputs schema: the API guarantees the response text is valid
// JSON conforming to this shape, so no fence-stripping or parse retries are
// needed. Keep in sync with LlmItinerary above. (Structured outputs forbid
// min/max numeric constraints and require additionalProperties: false.)
const ITINERARY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
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
  required: ['title', 'days'],
  additionalProperties: false,
};

interface GenerateBody {
  prompt: string;
  destination?: string;
  numDays?: number;
  constraints?: {
    preferences?: string[];
    avoids?: string[];
    pace?: 'relaxed' | 'standard' | 'packed';
    mustSees?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as GenerateBody;
    const { prompt, destination, numDays, constraints } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }
    if (numDays !== undefined && (numDays < 1 || numDays > 30)) {
      return NextResponse.json({ error: 'numDays must be 1–30' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Build user message with explicit constraint summary so the model
    // doesn't have to parse it out of free-text.
    const constraintLines: string[] = [];
    if (destination) constraintLines.push(`Destination: ${destination}`);
    if (numDays) constraintLines.push(`Length: ${numDays} day${numDays > 1 ? 's' : ''}`);
    if (constraints?.pace) constraintLines.push(`Pace: ${constraints.pace}`);
    if (constraints?.preferences?.length) {
      constraintLines.push(`Preferences: ${constraints.preferences.join(', ')}`);
    }
    if (constraints?.mustSees?.length) {
      constraintLines.push(`Must-sees: ${constraints.mustSees.join(', ')}`);
    }
    if (constraints?.avoids?.length) {
      constraintLines.push(`Avoid: ${constraints.avoids.join(', ')}`);
    }

    const userMessage = [
      `"${prompt}"`,
      '',
      constraintLines.length ? constraintLines.join('\n') : null,
      '',
      'Design the itinerary. JSON only, real places only, geographic grouping is non-negotiable.',
    ].filter(Boolean).join('\n');

    // Haiku 4.5 — fast enough to stay well under the 60s Vercel cap on
    // 10-day plans while still producing solid structured JSON + narratives.
    // Sonnet 4.6 was timing out on longer trips.
    // Structured outputs (output_config.format) guarantee schema-valid JSON;
    // max_tokens 12000 because 4000 truncated mid-JSON on week-long trips.
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 12000,
      system: ITINERARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      output_config: {
        format: { type: 'json_schema', schema: ITINERARY_SCHEMA },
      },
    });

    if (message.stop_reason === 'max_tokens') {
      // Output hit the token ceiling — JSON is incomplete. Surface a clear,
      // actionable error instead of a parse failure.
      return NextResponse.json(
        { error: 'That trip is too big to plan in one go — try fewer days or a more relaxed pace.' },
        { status: 502 }
      );
    }

    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let parsed: LlmItinerary;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: 'Model returned malformed JSON' }, { status: 502 });
    }
    if (!parsed.days?.length) {
      return NextResponse.json({ error: 'Model returned no days' }, { status: 502 });
    }

    // Flatten every place across every day, verify in parallel, map back.
    const allPlaces: { dayIdx: number; placeIdx: number; place: LlmPlace }[] = [];
    parsed.days.forEach((day, di) => {
      (day.places || []).forEach((p, pi) => allPlaces.push({ dayIdx: di, placeIdx: pi, place: p }));
    });
    const results = await Promise.allSettled(
      allPlaces.map(x => verifyAndEnrichWithGoogle(x.place))
    );

    const enrichedDays = parsed.days.map(day => ({
      day_number: day.day_number,
      narrative: day.narrative,
      places: [] as Array<LlmPlace & Partial<EnrichedPlace>>,
    }));

    allPlaces.forEach((x, i) => {
      const r = results[i];
      if (r.status !== 'fulfilled') return;
      const g = r.value;
      if (!g.verified) {
        console.log(`[Itinerary] Dropped unverified: ${x.place.name}`);
        return;
      }
      enrichedDays[x.dayIdx].places.push({
        ...x.place,
        name: g.google_name || x.place.name,
        address: g.address || x.place.address,
        lat: g.lat ?? x.place.lat,
        lng: g.lng ?? x.place.lng,
        photo_url: g.photo_url,
        price_level: g.price_level,
        rating: g.rating,
        google_place_id: g.google_place_id,
      });
    });

    // Reorder each day's stops along a sensible path using the real
    // (Google-verified) coordinates, so the on-map route doesn't zig-zag
    // across town and back.
    enrichedDays.forEach(d => {
      d.places = orderByProximity(d.places);
    });

    // Drop any day with zero places after verification
    const finalDays = enrichedDays.filter(d => d.places.length > 0);
    if (finalDays.length === 0) {
      return NextResponse.json({ error: 'No places could be verified' }, { status: 502 });
    }

    // Persist
    const title = parsed.title || destination || 'Untitled Trip';
    const finalNumDays = finalDays.length;

    const { data: insertedItin, error: itinErr } = await auth.supabase
      .from('itineraries')
      .insert({
        user_id: auth.userId,
        title,
        destination: destination || title,
        num_days: finalNumDays,
        prompt,
        constraints: constraints || {},
      })
      .select('id, shareable_token, created_at')
      .single();

    if (itinErr || !insertedItin) {
      console.error('[Itinerary] Insert failed:', itinErr);
      return NextResponse.json({ error: 'Failed to save itinerary' }, { status: 500 });
    }

    const dayRows = finalDays.map((d, i) => ({
      itinerary_id: insertedItin.id,
      day_number: i + 1, // re-number contiguously
      narrative: d.narrative,
      places: d.places,
    }));

    const { error: daysErr } = await auth.supabase
      .from('itinerary_days')
      .insert(dayRows);

    if (daysErr) {
      console.error('[Itinerary] Days insert failed:', daysErr);
      await auth.supabase.from('itineraries').delete().eq('id', insertedItin.id);
      return NextResponse.json({ error: 'Failed to save itinerary days' }, { status: 500 });
    }

    return NextResponse.json({
      id: insertedItin.id,
      shareable_token: insertedItin.shareable_token,
      title,
      destination: destination || title,
      num_days: finalNumDays,
      created_at: insertedItin.created_at,
      days: dayRows.map(d => ({
        day_number: d.day_number,
        narrative: d.narrative,
        places: d.places,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Itinerary] generate error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
