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
    const { friendship_id, action } = body;

    if (!friendship_id || !action) {
      return NextResponse.json({
        error: 'friendship_id and action are required'
      }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({
        error: 'action must be either "accept" or "decline"'
      }, { status: 400 });
    }

    // Verify the friendship exists and user is the addressee
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendship_id)
      .eq('addressee_id', user.id)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json({
        error: 'Friendship request not found or you are not authorized'
      }, { status: 404 });
    }

    if (friendship.status !== 'pending') {
      return NextResponse.json({
        error: 'This friendship request has already been responded to'
      }, { status: 400 });
    }

    // Update friendship status
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const { data: updatedFriendship, error: updateError } = await supabase
      .from('friendships')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', friendship_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating friendship:', updateError);
      return NextResponse.json({ error: 'Failed to update friendship' }, { status: 500 });
    }

    return NextResponse.json({ friendship: updatedFriendship }, { status: 200 });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
