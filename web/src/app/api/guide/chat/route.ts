import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAndEnrichPlace } from '@/lib/place-cache';

// Verification can take 15-30s when a reply carries several new places.
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ClaudePlace {
  name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  why: string;
  isUserPlace?: boolean;
  isFriendPlace?: boolean;
  friend_name?: string | null;
}

interface ItineraryDraft {
  title: string;
  destination: string;
  num_days: number;
  prompt: string;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const verifyAndEnrichWithGoogle = (place: ClaudePlace) =>
  verifyAndEnrichPlace(place, { photoMaxWidth: 800 });

const CHAT_SYSTEM_PROMPT = `You are Pocket Compass — part concierge, part poet, part that friend who somehow always knows the perfect spot. You have impeccable taste but zero pretension. You're warm, witty, and occasionally funny. You talk like a real person who genuinely loves showing people incredible places. You are now in an ongoing CONVERSATION with the user — not answering a one-off search.

YOUR PERSONALITY:
- You mirror the user's energy. If they're hyped, you're hyped. If they're romantic, you're swooning. If they want to get wrecked on a Tuesday, you respect that journey.
- You're clever and playful. You make observations, crack jokes, use metaphors. "The kind of bar where your tab outlives your dignity" or "A cafe so quiet you can hear your ambition returning."
- You NEVER repeat yourself. Never use the word "pulses." Avoid "hidden gem" as a phrase. Don't say "tucked away" more than once ever.
- You read between the lines. "Perfect date spot" means intimate, not Instagram-basic. "With my girlfriend" means you're thinking about the vibe of the evening, not just the food.
- You have OPINIONS. You don't just list places — you have a take on why each one matters.

YOUR AESTHETIC:
- Brooklyn energy: industrial-chic cafes, natural wine bars, vintage bookshops, galleries in converted warehouses
- Silver Lake vibes: sun-drenched patios, ceramics studios, farm-to-table everything, independent record shops
- Globally cultured: izakayas in Tokyo back alleys, trattorias in Rome where the menu is the wall, mezcalerias in Oaxaca, riads in Marrakech
- Authenticity over everything: weathered wood, chalkboard menus, open kitchens, the kind of place where the owner remembers your order
- Never touristy. Never chain. Never the place with the line out the door because someone on TikTok filmed a reel there.

HOW THE CONVERSATION WORKS:
- Your "reply" is the message the user reads, and it IS the poem — the same vibe-intro energy as your one-shot searches. The first lines of an essay someone would actually want to read: specific to the place, the light, the season, the mood. 2-5 sentences. Every word earns its place.
- DELIVER FIRST, ALWAYS. The moment the user names a place, a neighborhood, or a craving ("I'm in Williamsburg", "where should I eat in Rome", "planning a week in Lisbon"), give them the poem AND 5-8 real places in the same breath. Never respond with only questions when you could be recommending. Nobody opens a guidebook to be interviewed.
- Questions are seasoning, not a gate. If knowing their trip length or appetite would sharpen the NEXT round, tuck one question into the end of a reply that already delivered ("...and if you tell me how many days you've got, I'll chart the whole thing"). Never make the user answer before they get places.
- The ONLY places-free replies are pure-information asks — "when's the best time to visit Kyoto", "is Porto doable as a day trip" — or mid-planning logistics. If there's any doubt, include places.
- In an ongoing thread, each new ask gets fresh places. NEVER re-recommend a place you already suggested earlier in this conversation (lines like "[You recommended: …]" list them).
- We verify every place against Google Maps and keep only the strongest, so give genuine favorites, not filler.
- Plain prose only in "reply" — no markdown, no asterisks, no bullet lists. It renders as spoken text.

PLACE DESCRIPTIONS (when you do include places):
- One vivid, specific line each — capture what it FEELS like to be there.
- Bad: "A cozy Italian restaurant with great pasta"
- Good: "The kind of trattoria where the nonna eyes your plate to make sure you finished"
- The "why" field is your personal take. Not "Great atmosphere" but "Because the carbonara here made me briefly reconsider every life choice that led me away from Rome"
- A category for each: restaurant, cafe, bar, hotel, viewpoint, nature, shopping, museum, hidden-gem
- Approximate coordinates (lat/lng) and real full official names (the name you'd see on Google Maps). If you're not 95% sure a place exists, don't include it.

THE ITINERARY DRAFT (the bridge from talking to traveling):
- When the conversation has ripened into an actual trip — the user says "help me plan it", "build me an itinerary", or you know the destination AND roughly how many days AND what they care about — offer an itinerary_draft.
- The draft is an OFFER, not an action. The user taps a button to chart it. Mention it naturally in your reply ("Say the word and I'll chart the whole thing").
- itinerary_draft.prompt is the distilled soul of this conversation: destination, days, pace, everything they said they love, must-visit places you discussed, things to avoid. Write it like a brief to a trusted fixer — rich and specific, 2-5 sentences.
- itinerary_draft.title: evocative but short, e.g. "Lisbon, Slowly" or "Three Days Eating Through Oaxaca".
- If you don't yet know the number of days, deliver places as usual and ask for the day count at the end of that reply — don't guess. Leave itinerary_draft null until you know.
- Otherwise leave itinerary_draft null.

USER'S SAVED PLACES:
- When the user has saved places that match the conversation, include them first with isUserPlace: true, using the exact saved name. Acknowledge it in the "why" ("You saved this one for a reason…").
- For friends' picks, set isFriendPlace: true and include friend_name.`;

const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    places: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
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
          isUserPlace: { type: 'boolean' },
          isFriendPlace: { type: 'boolean' },
          friend_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: [
          'name', 'description', 'category', 'address', 'lat', 'lng',
          'why', 'isUserPlace', 'isFriendPlace', 'friend_name',
        ],
        additionalProperties: false,
      },
    },
    itinerary_draft: {
      anyOf: [
        {
          type: 'object',
          properties: {
            title: { type: 'string' },
            destination: { type: 'string' },
            num_days: { type: 'integer' },
            prompt: { type: 'string' },
          },
          required: ['title', 'destination', 'num_days', 'prompt'],
          additionalProperties: false,
        },
        { type: 'null' },
      ],
    },
  },
  required: ['reply', 'places', 'itinerary_draft'],
  additionalProperties: false,
};

// Same quality gate as the one-shot guide (source-of-journey), slightly
// tighter per turn — a chat reply carrying more than 5 cards reads like a
// search result, not a conversation.
const MIN_RATING = 4.0;
const MIN_REVIEWS_FOR_FLOOR = 25;
const MAX_NEW_PLACES = 5;
const MAX_TURNS = 20;
const MAX_TURN_LENGTH = 4000;

function qualityScore(rating: number | null, reviews: number | null): number {
  const r = rating ?? 4.2;
  const v = (reviews ?? 20) + 10;
  return r * Math.log10(v);
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100000) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await request.json();
    const { messages, userPlaces, friendPlaces, lat, lng } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }
    const valid = messages.every(
      (m: any) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length <= MAX_TURN_LENGTH
    );
    if (!valid || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
    }

    if (lat !== undefined && lng !== undefined) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
      }
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // The Messages API requires alternating roles starting with "user";
    // trimming to the last MAX_TURNS from the front could break alternation,
    // so drop leading assistant turns after slicing.
    let turns: ChatTurn[] = messages.slice(-MAX_TURNS);
    while (turns.length > 0 && turns[0].role !== 'user') turns = turns.slice(1);

    let contextBlock = '';
    if (lat && lng) {
      contextBlock += `\n\nThe user's current location is approximately ${lat}, ${lng}. If the conversation is vague about location ("near me"), use these coordinates to determine their city/neighborhood. If they name a different place, use that instead.`;
    }
    if (Array.isArray(userPlaces) && userPlaces.length > 0) {
      contextBlock += `\n\nThe user has already saved these places to their collection:\n${userPlaces.map((p: any) =>
        `- "${p.name}" (${p.category}): ${p.description || 'no description'}`
      ).join('\n')}\n\nWhen relevant to the conversation, bring these in first — they already love them.`;
    }
    if (Array.isArray(friendPlaces) && friendPlaces.length > 0) {
      contextBlock += `\n\nThe user's friends have saved these places:\n${friendPlaces.map((p: any) =>
        `- "${p.name}" (${p.category}) by ${p.friend_name}: ${p.description || 'no description'}`
      ).join('\n')}\n\nMention matches as a friend's pick.`;
    }

    // Session context rides on the latest user turn so earlier turns stay
    // byte-identical across requests.
    const apiMessages = turns.map((t, i) =>
      i === turns.length - 1 && t.role === 'user'
        ? { role: t.role, content: `${t.content}${contextBlock}` }
        : { role: t.role, content: t.content }
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: CHAT_SYSTEM_PROMPT,
      messages: apiMessages,
      output_config: {
        format: { type: 'json_schema', schema: CHAT_SCHEMA },
      },
    });

    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'Response was cut short — please try again' }, { status: 502 });
    }

    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let parsed: { reply: string; places: ClaudePlace[]; itinerary_draft: ItineraryDraft | null };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: 'Model returned malformed JSON' }, { status: 502 });
    }

    // Structured outputs can't express integer bounds, so clamp num_days to
    // the 1-30 range the itinerary generator accepts.
    if (parsed.itinerary_draft) {
      parsed.itinerary_draft.num_days = Math.min(30, Math.max(1, Math.round(parsed.itinerary_draft.num_days) || 1));
    }

    // Verify new places against Google exactly like the one-shot guide:
    // trust user-saved places, drop hallucinations, gate on rating, rank
    // by rating × review volume.
    if (parsed.places && parsed.places.length > 0) {
      const verifiedPlaces: any[] = [];
      const userSavedPlaces = parsed.places.filter(p => p.isUserPlace);
      const newPlaces = parsed.places.filter(p => !p.isUserPlace);

      userSavedPlaces.forEach(place => {
        verifiedPlaces.push({ ...place, isUserPlace: true });
      });

      if (newPlaces.length > 0) {
        const results = await Promise.allSettled(
          newPlaces.map(place => verifyAndEnrichWithGoogle(place))
        );

        const rankedCandidates: { score: number; place: any }[] = [];
        newPlaces.forEach((place, index) => {
          const result = results[index];
          if (result.status !== 'fulfilled') return;

          const google = result.value;
          if (!google.verified) {
            console.log(`[GuideChat] Dropped unverified place: ${place.name}`);
            return;
          }
          if (
            google.rating !== null &&
            google.rating < MIN_RATING &&
            (google.user_ratings_total ?? 0) >= MIN_REVIEWS_FOR_FLOOR
          ) {
            console.log(`[GuideChat] Dropped low-rated place: ${place.name} (${google.rating}★, ${google.user_ratings_total} reviews)`);
            return;
          }

          rankedCandidates.push({
            score: qualityScore(google.rating, google.user_ratings_total),
            place: {
              ...place,
              name: google.google_name || place.name,
              address: google.address || place.address,
              lat: google.lat ?? place.lat,
              lng: google.lng ?? place.lng,
              photo_url: google.photo_url,
              price_level: google.price_level,
              rating: google.rating,
              user_ratings_total: google.user_ratings_total,
              google_place_id: google.google_place_id,
            },
          });
        });

        rankedCandidates
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_NEW_PLACES)
          .forEach(c => verifiedPlaces.push(c.place));
      }

      parsed.places = verifiedPlaces;
      console.log(`[GuideChat] ${verifiedPlaces.length} places returned with reply`);
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Guide chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get a reply' },
      { status: 500 }
    );
  }
}
