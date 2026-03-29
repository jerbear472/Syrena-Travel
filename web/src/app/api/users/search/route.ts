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

    // Get search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    // Sanitize query - remove special characters that could be used for injection
    // Keep only alphanumeric, spaces, and common name characters
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s._-]/g, '').trim();
    if (sanitizedQuery.length < 2) {
      return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
    }

    // Limit query length
    if (sanitizedQuery.length > 50) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 });
    }

    // Search for users by username or display_name using sanitized input
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${sanitizedQuery}%,display_name.ilike.%${sanitizedQuery}%`)
      .neq('id', user.id) // Exclude current user
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // For each profile, check if there's an existing friendship
    const profilesWithStatus = await Promise.all(
      profiles.map(async (profile) => {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`)
          .single();

        return {
          ...profile,
          friendship_status: friendship?.status || null
        };
      })
    );

    return NextResponse.json({ users: profilesWithStatus }, { status: 200 });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
