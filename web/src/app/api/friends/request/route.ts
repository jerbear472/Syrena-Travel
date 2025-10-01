import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { addressee_id } = body;

    if (!addressee_id) {
      return NextResponse.json({ error: 'addressee_id is required' }, { status: 400 });
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addressee_id}),and(requester_id.eq.${addressee_id},addressee_id.eq.${user.id})`)
      .single();

    if (existing) {
      return NextResponse.json({
        error: `Friendship already exists with status: ${existing.status}`
      }, { status: 400 });
    }

    // Create friend request
    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addressee_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating friend request:', error);
      return NextResponse.json({ error: 'Failed to create friend request' }, { status: 500 });
    }

    return NextResponse.json({ friendship }, { status: 201 });
  } catch (error) {
    console.error('Friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
