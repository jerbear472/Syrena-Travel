import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAndEnrichPlace } from '@/lib/place-cache';

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
  friend_name?: string;
}

// Verification + enrichment is shared across the guide, itinerary, and
// onboarding routes and backed by a 30-day Google Places cache
// (web/src/lib/place-cache.ts). Guide photos render as full-width heroes (800px).
const verifyAndEnrichWithGoogle = (place: ClaudePlace) =>
  verifyAndEnrichPlace(place, { photoMaxWidth: 800 });

const GUIDE_SYSTEM_PROMPT = `You are Pocket Compass — part concierge, part poet, part that friend who somehow always knows the perfect spot. You have impeccable taste but zero pretension. You're warm, witty, and occasionally funny. You talk like a real person who genuinely loves showing people incredible places.

YOUR PERSONALITY:
- You mirror the user's energy. If they're hyped, you're hyped. If they're romantic, you're swooning. If they want to get wrecked on a Tuesday, you respect that journey.
- You're clever and playful. You make observations, crack jokes, use metaphors. "The kind of bar where your tab outlives your dignity" or "A cafe so quiet you can hear your ambition returning."
- You NEVER repeat yourself. Every vibe_intro must be completely unique and specific to what the user asked. Never use the word "pulses." Avoid "hidden gem" as a phrase. Don't say "tucked away" more than once ever.
- You read between the lines. "Perfect date spot" means intimate, not Instagram-basic. "Get blasted" means you're curating a proper crawl, not suggesting a wine bar. "With my girlfriend" means you're thinking about the vibe of the evening, not just the food.
- You have OPINIONS. You don't just list places — you have a take on why each one matters.

YOUR AESTHETIC:
- Brooklyn energy: industrial-chic cafes, natural wine bars, vintage bookshops, galleries in converted warehouses
- Silver Lake vibes: sun-drenched patios, ceramics studios, farm-to-table everything, independent record shops
- Globally cultured: izakayas in Tokyo back alleys, trattorias in Rome where the menu is the wall, mezcalerias in Oaxaca, riads in Marrakech
- Authenticity over everything: weathered wood, chalkboard menus, open kitchens, the kind of place where the owner remembers your order
- Never touristy. Never chain. Never the place with the line out the door because someone on TikTok filmed a reel there.

THE VIBE_INTRO (this is the most important part):
- This is your opening line. It sets the entire tone. Make it GREAT.
- It should feel like the first line of an essay you'd actually want to read.
- Match the user's mood and language. If they're casual, be casual. If they're poetic, be poetic. If they're funny, be funnier.
- Be specific to the neighborhood/city. Reference actual streets, landmarks, the light at a certain hour, the smell of a particular bakery.
- 2-3 sentences max. Every word earns its place.
- Examples of the RANGE you should have:
  - For "get blasted in Hackney": "Hackney doesn't do half-measures and neither should you. Here's your evening in ascending order of regret."
  - For "romantic dinner in the West Village": "The West Village at dusk is practically doing the work for you — cobblestones, candlelight, the distant hum of someone playing jazz badly. All you have to do is show up."
  - For "best coffee in Melbourne": "Melbourne treats coffee the way some cities treat religion — with absolute devotion, quiet reverence, and the occasional holy war over extraction times."
  - For "exploring Shibuya": "Shibuya is a city within a city, a place where a 90-year-old tempura counter and a seven-floor vintage store coexist on the same block without anyone finding it unusual."
  - For "brunch spots near me": "The perfect brunch is less about the food and more about the specific angle of sunlight hitting your table while you pretend you're going to do something productive afterward."

PLACE DESCRIPTIONS:
- Each description should be one vivid, specific line — not generic. Capture what it FEELS like to be there.
- Bad: "A cozy Italian restaurant with great pasta"
- Good: "The kind of trattoria where the nonna eyes your plate to make sure you finished"
- Bad: "A trendy cocktail bar"
- Good: "Drinks that take longer to make than your last relationship"

THE "WHY" FIELD:
- This is your personal take. Be honest, be specific, be opinionated.
- Not "Great atmosphere and food" but "Because the carbonara here made me briefly reconsider every life choice that led me away from Rome"

RECOMMENDATIONS:
- Give 8-10 specific, real places with their actual names and addresses. We verify every one against Google Maps, check its public rating, and keep only the strongest 5-6 — so give us a deep bench of your genuine favorites, not filler.
- A category for each: restaurant, cafe, bar, hotel, viewpoint, nature, shopping, museum, hidden-gem
- Approximate coordinates (lat/lng) for each place
- Match the places to the user's ACTUAL request. If they want bars, give them bars. If they want a date itinerary, build an evening.

USER'S SAVED PLACES:
- When the user has saved places that match the query, ALWAYS include them first with isUserPlace: true
- For user's saved places, use the exact name they saved - don't modify it
- These are places the user already knows and loves, so acknowledge that in the "why" field (e.g., "You saved this one for a reason...")

FRIEND'S PLACES:
- For friend recommendations, set isFriendPlace: true and include friend_name

CRITICAL: Only recommend NEW places (not user's saved places) that you are confident actually exist RIGHT NOW. Use their real, full, official name (the name you'd see on Google Maps). If you're not 95% sure a place exists, don't include it — we verify every recommendation against Google Places, and fake ones get dropped.`;

// Structured-outputs schema — the API guarantees the response conforms,
// so no fence-stripping or parse fallbacks are needed.
const GUIDE_SCHEMA = {
  type: 'object',
  properties: {
    vibe_intro: { type: 'string' },
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
  },
  required: ['vibe_intro', 'places'],
  additionalProperties: false,
};

// Quality gate for NEW (non-saved) recommendations, applied after Google
// verification. A place is dropped when Google clearly disagrees with the
// model's taste (well-reviewed but poorly rated); unrated places survive —
// tiny gems often have no rating yet, and verification already proved they
// exist. Survivors are ranked by rating weighted by review volume.
const MIN_RATING = 4.0;
const MIN_REVIEWS_FOR_FLOOR = 25;
const MAX_NEW_PLACES = 6;

function qualityScore(rating: number | null, reviews: number | null): number {
  // Unrated → neutral prior so they sort mid-pack rather than first or last.
  const r = rating ?? 4.2;
  const v = (reviews ?? 20) + 10;
  return r * Math.log10(v);
}

export async function POST(request: NextRequest) {
  try {
    // Validate content length to prevent large payload attacks
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50000) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await request.json();
    const { query, userPlaces, friendPlaces, lat, lng } = body;

    // Input validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (query.length > 500) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 });
    }

    // Validate coordinates if provided
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

    // Build location context
    let locationContext = '';
    if (lat && lng) {
      locationContext = `\n\nThe user's current location is approximately ${lat}, ${lng}. If their query is vague about location (e.g. "best brunch near me"), use these coordinates to determine their city/neighborhood. If they specify a different location in their query, use that instead.`;
    }

    // Build context about user's saved places if available
    let userPlacesContext = '';
    if (userPlaces && userPlaces.length > 0) {
      userPlacesContext = `\n\nIMPORTANT - The user has already saved these places to their collection:\n${userPlaces.map((p: any) =>
        `- "${p.name}" (${p.category}) in ${p.city || 'unknown location'}: ${p.description || 'no description'}`
      ).join('\n')}\n\nPrioritize recommending places from their saved collection if they match the query. These are places they already love! Include them first, then supplement with new discoveries they might enjoy.`;
    }

    // Build context about friends' places if available
    let friendContext = '';
    if (friendPlaces && friendPlaces.length > 0) {
      friendContext = `\n\nThe user's friends have saved these places:\n${friendPlaces.map((p: any) =>
        `- "${p.name}" (${p.category}) by ${p.friend_name}: ${p.description || 'no description'}`
      ).join('\n')}\n\nIf any of these match the query, mention them as "friend's pick". Suggest complementary places that would round out the experience.`;
    }

    const userMessage = `"${query}"${locationContext}${userPlacesContext}${friendContext}\n\nGive me your best. JSON format only, real places only. Read the vibe of what I'm asking for and match it perfectly. Prioritize places from the user's saved collection when relevant.`;

    // Sonnet 4.6 (claude-sonnet-4-20250514 is deprecated) with structured
    // outputs so the JSON shape is guaranteed; 4000 tokens covers 10
    // candidate places + a vibe intro without truncation.
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: GUIDE_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage }
      ],
      output_config: {
        format: { type: 'json_schema', schema: GUIDE_SCHEMA },
      },
    });

    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'Response was cut short — please try again' }, { status: 502 });
    }

    // Extract text content
    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let parsed: { vibe_intro: string; places: ClaudePlace[] };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: 'Model returned malformed JSON' }, { status: 502 });
    }

    // Verify and enrich places with Google in parallel (all at once for speed)
    // Skip verification for user's saved places - they're already trusted
    // ONLY verify NEW places to filter out hallucinated ones
    if (parsed.places && parsed.places.length > 0) {
      const originalCount = parsed.places.length;
      const verifiedPlaces: any[] = [];

      // Separate user's saved places from new recommendations
      const userSavedPlaces = parsed.places.filter(p => p.isUserPlace);
      const newPlaces = parsed.places.filter(p => !p.isUserPlace);

      // Add user's saved places directly (no verification needed)
      userSavedPlaces.forEach(place => {
        verifiedPlaces.push({
          ...place,
          isUserPlace: true,
        });
      });

      // Verify new places with Google, then gate on quality and rank.
      // Pipeline: over-generate (8-10 candidates) → verify existence →
      // drop well-reviewed-but-poorly-rated → rank by rating × review
      // volume → keep the top MAX_NEW_PLACES.
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
            console.log(`[Guide] Dropped unverified place: ${place.name}`);
            return; // Skip — Google couldn't find it, probably hallucinated
          }
          if (
            google.rating !== null &&
            google.rating < MIN_RATING &&
            (google.user_ratings_total ?? 0) >= MIN_REVIEWS_FOR_FLOOR
          ) {
            console.log(`[Guide] Dropped low-rated place: ${place.name} (${google.rating}★, ${google.user_ratings_total} reviews)`);
            return;
          }

          rankedCandidates.push({
            score: qualityScore(google.rating, google.user_ratings_total),
            place: {
              ...place,
              // Use Google's ground truth for coordinates, address, and name
              name: google.google_name || place.name,
              address: google.address || place.address,
              lat: google.lat || place.lat,
              lng: google.lng || place.lng,
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
      console.log(`[Guide] ${verifiedPlaces.length} places returned (${userSavedPlaces.length} user saved, ${verifiedPlaces.length - userSavedPlaces.length} kept from ${newPlaces.length} candidates)`);
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Source of Journey API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
