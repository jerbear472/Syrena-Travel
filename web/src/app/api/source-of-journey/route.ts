import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface ClaudePlace {
  name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  why: string;
  isFriendPlace?: boolean;
  friend_name?: string;
}

interface GoogleVerifiedPlace {
  verified: boolean;
  google_name: string | null;
  photo_url: string | null;
  price_level: number | null;
  rating: number | null;
  google_place_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

async function verifyAndEnrichWithGoogle(place: ClaudePlace): Promise<GoogleVerifiedPlace> {
  const notFound: GoogleVerifiedPlace = {
    verified: false, google_name: null, photo_url: null,
    price_level: null, rating: null, google_place_id: null,
    address: null, lat: null, lng: null,
  };

  if (!GOOGLE_API_KEY) return notFound;

  try {
    // Find the place using text search with location bias
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(place.name + ', ' + place.address)}` +
      `&inputtype=textquery` +
      `&locationbias=circle:5000@${place.lat},${place.lng}` +
      `&fields=place_id` +
      `&key=${GOOGLE_API_KEY}`;

    const findResponse = await fetch(findUrl);
    const findData = await findResponse.json();

    // If rate-limited or API error, return a special status so we don't drop the place
    if (findData.status === 'OVER_QUERY_LIMIT' || findData.status === 'REQUEST_DENIED') {
      return { ...notFound, verified: true }; // Trust Claude when Google is unavailable
    }

    if (findData.status !== 'OK' || !findData.candidates?.length) {
      return notFound;
    }

    const placeId = findData.candidates[0].place_id;

    // Get full details — including geometry for real coordinates
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}` +
      `&fields=name,rating,price_level,photos,formatted_address,geometry` +
      `&key=${GOOGLE_API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status === 'OVER_QUERY_LIMIT' || detailsData.status === 'REQUEST_DENIED') {
      return { ...notFound, verified: true, google_place_id: placeId };
    }

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return { ...notFound, verified: true, google_place_id: placeId };
    }

    const details = detailsData.result;
    const photoUrl = details.photos?.length
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${details.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
      : null;

    return {
      verified: true,
      google_name: details.name || null,
      photo_url: photoUrl,
      price_level: details.price_level || null,
      rating: details.rating || null,
      google_place_id: placeId,
      address: details.formatted_address || null,
      lat: details.geometry?.location?.lat || null,
      lng: details.geometry?.location?.lng || null,
    };
  } catch (error) {
    console.error(`[Guide] Google verification failed for ${place.name}:`, error);
    return notFound;
  }
}

const SYRENA_SYSTEM_PROMPT = `You are Syrena — part concierge, part poet, part that friend who somehow always knows the perfect spot. You have impeccable taste but zero pretension. You're warm, witty, and occasionally funny. You talk like a real person who genuinely loves showing people incredible places.

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
- 8-10 specific, real places with their actual names and addresses
- A category for each: restaurant, cafe, bar, hotel, viewpoint, nature, shopping, museum, hidden-gem
- Approximate coordinates (lat/lng) for each place
- Match the places to the user's ACTUAL request. If they want bars, give them bars. If they want a date itinerary, build an evening.

CRITICAL: Only recommend places you are confident actually exist RIGHT NOW. Use their real, full, official name (the name you'd see on Google Maps). If you're not 95% sure a place exists, don't include it — we verify every recommendation against Google Places, and fake ones get dropped. Better to recommend 6 real places than 10 with 4 hallucinated ones.

Respond in JSON format:
{
  "vibe_intro": "Your brilliant, unique, mood-matched opening",
  "places": [
    {
      "name": "Place Name",
      "description": "One vivid, specific line",
      "category": "cafe",
      "address": "Full address",
      "lat": 40.7128,
      "lng": -74.0060,
      "why": "Your honest, opinionated take"
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const { query, friendPlaces, lat, lng } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Build location context
    let locationContext = '';
    if (lat && lng) {
      locationContext = `\n\nThe user's current location is approximately ${lat}, ${lng}. If their query is vague about location (e.g. "best brunch near me"), use these coordinates to determine their city/neighborhood. If they specify a different location in their query, use that instead.`;
    }

    // Build context about friends' places if available
    let friendContext = '';
    if (friendPlaces && friendPlaces.length > 0) {
      friendContext = `\n\nThe user's friends have saved these places in or near this area:\n${friendPlaces.map((p: any) =>
        `- "${p.name}" (${p.category}) by ${p.friend_name}: ${p.description || 'no description'}`
      ).join('\n')}\n\nIncorporate awareness of these friends' picks. If any are great, mention them. Suggest complementary places that would round out the experience.`;
    }

    const userMessage = `"${query}"${locationContext}${friendContext}\n\nGive me your best. JSON format only, real places only. Read the vibe of what I'm asking for and match it perfectly.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      system: SYRENA_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage }
      ],
    });

    // Extract text content
    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse the JSON response - handle markdown code blocks
    let responseText = textBlock.text.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: { vibe_intro: string; places: ClaudePlace[] };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json({
        vibe_intro: responseText,
        places: []
      });
    }

    // Verify and enrich places with Google in parallel (all at once for speed)
    // ONLY keep places Google can verify — this filters out hallucinated places
    if (parsed.places && parsed.places.length > 0) {
      const originalCount = parsed.places.length;
      const verifiedPlaces: any[] = [];

      // Process all places in parallel for maximum speed
      const results = await Promise.allSettled(
        parsed.places.map(place => verifyAndEnrichWithGoogle(place))
      );

      parsed.places.forEach((place, index) => {
        const result = results[index];
        if (result.status !== 'fulfilled') return;

        const google = result.value;
        if (!google.verified) {
          console.log(`[Guide] Dropped unverified place: ${place.name}`);
          return; // Skip — Google couldn't find it, probably hallucinated
        }

        verifiedPlaces.push({
          ...place,
          // Use Google's ground truth for coordinates, address, and name
          name: google.google_name || place.name,
          address: google.address || place.address,
          lat: google.lat || place.lat,
          lng: google.lng || place.lng,
          photo_url: google.photo_url,
          price_level: google.price_level,
          rating: google.rating,
          google_place_id: google.google_place_id,
        });
      });

      parsed.places = verifiedPlaces;
      console.log(`[Guide] ${verifiedPlaces.length} verified places returned (from ${originalCount} Claude suggestions)`);
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
