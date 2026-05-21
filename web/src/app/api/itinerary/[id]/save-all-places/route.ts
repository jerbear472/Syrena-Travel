import { NextRequest, NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/auth-server';

interface ItineraryPlace {
  name?: string;
  description?: string;
  category?: string;
  address?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  photo_url?: string;
  rating?: number;
  price_level?: number;
  why?: string;
}

/**
 * POST /api/itinerary/[id]/save-all-places
 * Bulk-inserts every place in the itinerary into the owner's places table.
 * Skips duplicates by google_place_id when present.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read itinerary days (RLS gates to owner)
  const { data: days, error: daysErr } = await auth.supabase
    .from('itinerary_days')
    .select('places')
    .eq('itinerary_id', id);

  if (daysErr) {
    return NextResponse.json({ error: daysErr.message }, { status: 500 });
  }
  if (!days || days.length === 0) {
    return NextResponse.json({ error: 'No itinerary places found' }, { status: 404 });
  }

  // Flatten all places across all days
  const allPlaces: ItineraryPlace[] = [];
  for (const d of days as Array<{ places: ItineraryPlace[] }>) {
    if (Array.isArray(d.places)) allPlaces.push(...d.places);
  }

  if (allPlaces.length === 0) {
    return NextResponse.json({ saved: 0, skipped: 0 });
  }

  // Skip duplicates: fetch existing google_place_ids for this user
  const incomingIds = allPlaces.map(p => p.google_place_id).filter(Boolean) as string[];
  const { data: existing } = await auth.supabase
    .from('places')
    .select('google_place_id')
    .in('google_place_id', incomingIds.length ? incomingIds : ['__none__']);

  const existingSet = new Set((existing || []).map((p: { google_place_id: string }) => p.google_place_id));

  const rows = allPlaces
    .filter(p => !p.google_place_id || !existingSet.has(p.google_place_id))
    .map(p => ({
      user_id: auth.userId,
      name: p.name || 'Unnamed place',
      description: p.description || p.why || null,
      category: p.category || 'other',
      address: p.address || null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      google_place_id: p.google_place_id || null,
      photo_url: p.photo_url || null,
      rating: p.rating ?? null,
      price_level: p.price_level ?? null,
      notes: p.why || null,
      visited: false,
      is_public: true,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ saved: 0, skipped: allPlaces.length });
  }

  const { error: insertErr } = await auth.supabase.from('places').insert(rows);
  if (insertErr) {
    console.error('[Itinerary] save-all-places insert error:', insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    saved: rows.length,
    skipped: allPlaces.length - rows.length,
  });
}
