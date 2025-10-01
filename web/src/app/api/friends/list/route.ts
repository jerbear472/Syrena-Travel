import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all friendships where user is involved
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        requester:requester_id(id, username, display_name, avatar_url),
        addressee:addressee_id(id, username, display_name, avatar_url)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friendships:', error);
      return NextResponse.json({ error: 'Failed to fetch friendships' }, { status: 500 });
    }

    // Transform the data to show the friend (not the current user)
    const transformedFriendships = friendships.map(friendship => {
      const isRequester = friendship.requester.id === user.id;
      const friend = isRequester ? friendship.addressee : friendship.requester;

      return {
        id: friendship.id,
        status: friendship.status,
        created_at: friendship.created_at,
        is_requester: isRequester,
        friend: {
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url
        }
      };
    });

    // Separate into categories
    const accepted = transformedFriendships.filter(f => f.status === 'accepted');
    const pending_sent = transformedFriendships.filter(f => f.status === 'pending' && f.is_requester);
    const pending_received = transformedFriendships.filter(f => f.status === 'pending' && !f.is_requester);

    return NextResponse.json({
      friends: accepted,
      pending_sent,
      pending_received
    }, { status: 200 });
  } catch (error) {
    console.error('List friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
