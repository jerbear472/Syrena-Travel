import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat or lng parameter' }, { status: 400 });
  }

  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    // Use Google Places API Nearby Search
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10&key=${GOOGLE_API_KEY}`;
    const nearbyResponse = await fetch(nearbyUrl);
    const nearbyData = await nearbyResponse.json();

    if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
      const place = nearbyData.results[0];

      // Fetch detailed information using Place Details API
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,price_level,photos,types,formatted_address,business_status&key=${GOOGLE_API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.status === 'OK' && detailsData.result) {
        const details = detailsData.result;

        // Get photo URLs
        const photos = details.photos?.slice(0, 3).map((photo: any) =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
        ) || [];

        const placeInfo = {
          name: details.name || '',
          rating: details.rating || 0,
          priceLevel: details.price_level || 0,
          photos: photos,
          types: details.types || [],
          address: details.formatted_address || '',
          businessStatus: details.business_status
        };

        return NextResponse.json(placeInfo);
      }
    }

    // No place found
    return NextResponse.json({ error: 'No place found at this location' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching place details:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch place details' }, { status: 500 });
  }
}
