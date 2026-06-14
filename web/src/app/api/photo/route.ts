import { NextRequest, NextResponse } from 'next/server';

// Server-side Google Places Photo proxy.
//
// Previously photo URLs were built with the API key inline
// (`.../photo?...&key=${KEY}`) and sent to clients (web bundle + mobile app),
// exposing the key to anyone who inspected a response. This route fetches the
// photo server-side so the key never leaves the server. Clients request
// `/api/photo?ref=<photo_reference>&w=<maxwidth>`.
//
// Prefers a server-only GOOGLE_MAPS_API_KEY; falls back to the existing
// NEXT_PUBLIC_ key so it keeps working before that env var is added. Once a
// server-only key is set you can restrict the NEXT_PUBLIC_ one to the JS Maps
// SDK referrers and this proxy uses the unrestricted server key.
const KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  const wRaw = request.nextUrl.searchParams.get('w');

  if (!ref || ref.length > 2000) {
    return NextResponse.json({ error: 'Missing or invalid ref' }, { status: 400 });
  }
  if (!KEY) {
    return NextResponse.json({ error: 'Maps key not configured' }, { status: 500 });
  }

  // Clamp width to a sane range (Google caps photos at 1600px).
  const maxwidth = Math.min(Math.max(parseInt(wRaw || '600', 10) || 600, 1), 1600);

  // The host is fixed and `ref` is URL-encoded, so there is no SSRF / param
  // injection surface — only the photoreference is attacker-influenced.
  const url = `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${maxwidth}&photoreference=${encodeURIComponent(ref)}&key=${KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'Photo unavailable' }, { status: 502 });
    }
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        // Photo references are stable; let the CDN/browser cache hard.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      },
    });
  } catch (err) {
    console.error('[photo-proxy] fetch failed:', err);
    return NextResponse.json({ error: 'Photo fetch failed' }, { status: 502 });
  }
}
