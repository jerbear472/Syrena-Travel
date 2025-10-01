import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface FriendshipData {
  id: string;
  status: string;
  created_at: string;
  requester: ProfileData;
  addressee: ProfileData;
}

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

    if (!friendships) {
      return NextResponse.json({
        friends: [],
        pending_sent: [],
        pending_received: []
      }, { status: 200 });
    }

    // Transform the data to show the friend (not the current user)
    const transformedFriendships = (friendships as any[]).map((friendship: any) => {
      const requester = Array.isArray(friendship.requester) ? friendship.requester[0] : friendship.requester;
      const addressee = Array.isArray(friendship.addressee) ? friendship.addressee[0] : friendship.addressee;

      const isRequester = requester?.id === user.id;
      const friend = isRequester ? addressee : requester;

      return {
        id: friendship.id,
        status: friendship.status,
        created_at: friendship.created_at,
        is_requester: isRequester,
        friend: {
          id: friend?.id || '',
          username: friend?.username || '',
          display_name: friend?.display_name || '',
          avatar_url: friend?.avatar_url || null
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
