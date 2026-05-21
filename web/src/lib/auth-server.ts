import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export interface AuthedRequest {
  userId: string;
  supabase: SupabaseClient;
}

/**
 * Extracts the Supabase JWT from `Authorization: Bearer <jwt>` and returns
 * a Supabase client scoped to that user (RLS policies fire normally).
 * Returns null when no/invalid token. Callers should 401 on null.
 */
export async function authFromRequest(
  request: NextRequest
): Promise<AuthedRequest | null> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { userId: data.user.id, supabase };
}

/**
 * Plain anon client for server-side calls (RPC reads with no user context).
 */
export function anonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
