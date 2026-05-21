import { NextRequest, NextResponse } from 'next/server';
import { authFromRequest, anonClient } from '@/lib/auth-server';

interface DayPatch {
  day_number: number;
  narrative?: string;
  places?: unknown[]; // ordered array of place objects
}

interface PatchBody {
  title?: string;
  days?: DayPatch[];
}

/**
 * GET /api/itinerary/[id]
 * - With ?token=xyz: anonymous read via SECURITY DEFINER RPC (share link)
 * - Without token: requires owner auth
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('token');

  // --- Public share path ---
  if (token) {
    const client = anonClient();
    if (!client) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    const { data, error } = await client.rpc('get_itinerary_by_token', {
      p_itinerary_id: id,
      p_token: token,
    });
    if (error) {
      console.error('[Itinerary] public read RPC error:', error);
      return NextResponse.json({ error: 'Read failed' }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(data[0]);
  }

  // --- Owner-authenticated path ---
  const auth = await authFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: itin, error: itinErr } = await auth.supabase
    .from('itineraries')
    .select('id, title, destination, num_days, prompt, constraints, shareable_token, created_at, updated_at')
    .eq('id', id)
    .single();

  if (itinErr || !itin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: days } = await auth.supabase
    .from('itinerary_days')
    .select('day_number, narrative, places')
    .eq('itinerary_id', id)
    .order('day_number', { ascending: true });

  return NextResponse.json({ ...itin, days: days || [] });
}

/**
 * PATCH /api/itinerary/[id]
 * Owner-only. Updates title and/or one or more days (places array, narrative).
 * Drag-reorder = client sends the new places[] for the affected day(s).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as PatchBody;

  // Verify ownership (RLS will also block, but fail fast with a clear error)
  const { data: owned } = await auth.supabase
    .from('itineraries')
    .select('id')
    .eq('id', id)
    .single();
  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (body.title !== undefined) {
    const { error } = await auth.supabase
      .from('itineraries')
      .update({ title: body.title })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.days?.length) {
    for (const d of body.days) {
      if (!d.day_number) continue;
      const patch: Record<string, unknown> = {};
      if (d.narrative !== undefined) patch.narrative = d.narrative;
      if (d.places !== undefined) patch.places = d.places;
      if (Object.keys(patch).length === 0) continue;

      const { error } = await auth.supabase
        .from('itinerary_days')
        .update(patch)
        .eq('itinerary_id', id)
        .eq('day_number', d.day_number);
      if (error) {
        console.error('[Itinerary] day patch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/itinerary/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { error } = await auth.supabase
    .from('itineraries')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
