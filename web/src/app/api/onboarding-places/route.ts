import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const ONBOARDING_SYSTEM_PROMPT = `You are Syrena, an AI travel concierge with impeccable taste. You are creating a welcome collection of 10 curated places for a new user. Your aesthetic is:

- Brooklyn-coded: industrial-chic cafes, natural wine bars, vintage bookshops, galleries in converted warehouses
- Silver Lake energy: sun-drenched patios, ceramics studios, farm-to-table brunch, independent record shops
- International & worldly: hidden trattorias in Rome, izakayas in Tokyo back alleys, riads in Marrakech, mezcalerias in Oaxaca
- Rustic authenticity: weathered wood, handmade ceramics, chalkboard menus, open kitchens, local ingredients
- Never touristy, never chain, never generic. Only places with soul.

Generate exactly 15 places that form a complete "starter guide" to the city. We filter out places that don't have Google photos, so generating more ensures we end up with ~10 great picks. Aim for this mix:
- 3-4 restaurants (mix of casual and special occasion)
- 2-3 cafes or coffee spots
- 2-3 bars
- 1-2 hotels or boutique stays
- 3-4 activities, experiences, or hidden gems

Each place MUST be a real, verifiable establishment that currently exists. We verify every recommendation against Google Places, and fake ones get dropped. Better to recommend 8 real places than 10 with 2 hallucinated ones.

IMPORTANT: Use only these category values: "hotel", "restaurant", "cafe", "bar", "viewpoint", "nature", "shopping", "museum", "hidden-gem"
- Use "cafe" for cafes and coffee spots
- Use "hidden-gem" for unique or unusual places that don't fit other categories
- Use "viewpoint" for scenic spots, lookouts, rooftops with views
- Use "nature" for parks, gardens, outdoor spaces
- Use "museum" for galleries, museums, cultural institutions
- Use "shopping" for markets, boutiques, vintage shops

Respond in JSON format only:
{
  "places": [
    {
      "name": "Place Name",
      "description": "One-line poetic description that captures its essence",
      "category": "restaurant",
      "address": "Full street address",
      "lat": 40.7128,
      "lng": -74.0060,
      "why": "Why this place fits the Syrena aesthetic"
    }
  ]
}`;

interface ClaudePlace {
  name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  why: string;
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

  if (!GOOGLE_API_KEY) return { ...notFound, verified: true }; // Trust Claude when no key

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

    // If rate-limited or API error, trust Claude rather than dropping places
    if (findData.status === 'OVER_QUERY_LIMIT' || findData.status === 'REQUEST_DENIED') {
      return { ...notFound, verified: true };
    }

    if (findData.status !== 'OK' || !findData.candidates?.length) {
      return notFound;
    }

    const placeId = findData.candidates[0].place_id;

    // Get full details including geometry for real coordinates
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
    console.error(`[Onboarding] Google verification failed for ${place.name}:`, error);
    return notFound;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await request.json();
    const { lat, lng, city } = body;

    // Validate required fields
    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    // Validate coordinate types and ranges
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Validate city if provided
    if (city && (typeof city !== 'string' || city.length > 100)) {
      return NextResponse.json({ error: 'Invalid city name' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const cityName = city || 'the area';
    const userMessage = `Create a starter guide of 15 curated places in ${cityName} (coordinates: ${lat}, ${lng}). These are the first places a new Syrena user will see — make them count. Real places only, JSON format only.`;

    // Generate places with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4500,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse JSON response, strip markdown fences if present
    let responseText = textBlock.text.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: { places: ClaudePlace[] };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error('[Onboarding] Failed to parse Claude response:', responseText.substring(0, 200));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    if (!parsed.places || parsed.places.length === 0) {
      return NextResponse.json({ error: 'No places generated' }, { status: 500 });
    }

    // Verify and enrich places with Google in batches of 3
    // Filter out hallucinated places, use Google's ground truth for coords/address
    const verifiedPlaces: any[] = [];
    const claudeCount = parsed.places.length;

    for (let i = 0; i < parsed.places.length; i += 3) {
      const batch = parsed.places.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(place => verifyAndEnrichWithGoogle(place))
      );

      batch.forEach((place, batchIndex) => {
        const result = results[batchIndex];
        if (result.status !== 'fulfilled') return;

        const google = result.value;
        if (!google.verified) {
          console.log(`[Onboarding] Dropped unverified place: ${place.name}`);
          return; // Skip — Google couldn't find it, probably hallucinated
        }

        if (!google.photo_url) {
          console.log(`[Onboarding] Dropped place without photo: ${place.name}`);
          return; // Skip — must have a Google photo
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
          city: cityName,
        });
      });
    }

    // Cap at 10 best picks
    const finalPlaces = verifiedPlaces.slice(0, 10);
    console.log(`[Onboarding] ${finalPlaces.length} places with photos (from ${claudeCount} Claude suggestions) for ${cityName}`);

    return NextResponse.json({ places: finalPlaces });
  } catch (error: any) {
    console.error('[Onboarding] API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate onboarding places' },
      { status: 500 }
    );
  }
}
