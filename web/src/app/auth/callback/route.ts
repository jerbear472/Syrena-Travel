import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  // If there's a code, exchange it for a session
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.auth.exchangeCodeForSession(code);

    // For recovery, redirect to confirm page which will handle the app redirect
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/confirm#type=recovery', requestUrl.origin));
    }
  }

  // Pass through token_hash if present
  if (token_hash && type) {
    return NextResponse.redirect(
      new URL(`/auth/confirm?token_hash=${token_hash}&type=${type}`, requestUrl.origin)
    );
  }

  // Default redirect to confirm page
  return NextResponse.redirect(new URL('/auth/confirm', requestUrl.origin));
}
