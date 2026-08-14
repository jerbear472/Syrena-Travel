import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminClient } from '@/lib/auth-server';

// Server-side Google Places Photo proxy WITH persistent caching.
//
// Google's Place Photo endpoint is billed on every request. This route fetches
// each photo from Google exactly once, stores it in a public Supabase Storage
// bucket, and on every subsequent request redirects straight to the cached
// Supabase copy — so a given photo costs at most one Google Photos request ever,
// no matter how many times it renders across the map, feed, itineraries, etc.
//
// Clients request `/api/photo?ref=<photo_reference>&w=<maxwidth>`. The key never
// leaves the server. Degrades gracefully to streaming from Google if the
// service-role client / bucket is unavailable.

const KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const BUCKET = 'place-photos';

// Redirect that the CDN/clients can cache hard (photo references are stable).
function cachedRedirect(location: string) {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'public, max-age=86400, s-maxage=2592000, immutable',
    },
  });
}

// Fetch photo bytes from Google for a given reference. Null on any failure.
async function fetchGooglePhoto(
  ref: string,
  maxwidth: number
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/photo` +
        `?maxwidth=${maxwidth}&photoreference=${encodeURIComponent(ref)}&key=${KEY}`
    );
    if (!res.ok || !res.body) return null;
    return {
      bytes: await res.arrayBuffer(),
      contentType: res.headers.get('content-type') || 'image/jpeg',
    };
  } catch (err) {
    console.error('[photo-proxy] google fetch failed:', err);
    return null;
  }
}

// Google photo references expire (old itineraries hold refs Google now 400s).
// Given the place_id we can mint a fresh reference with one Details call.
async function freshPhotoRef(placeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${KEY}`
    );
    const data = await res.json();
    return data?.result?.photos?.[0]?.photo_reference || null;
  } catch (err) {
    console.error('[photo-proxy] details refresh failed:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  const wRaw = request.nextUrl.searchParams.get('w');
  const pid = request.nextUrl.searchParams.get('pid');

  if (!ref || ref.length > 2000) {
    return NextResponse.json({ error: 'Missing or invalid ref' }, { status: 400 });
  }
  if (pid && pid.length > 512) {
    return NextResponse.json({ error: 'Invalid pid' }, { status: 400 });
  }
  if (!KEY) {
    return NextResponse.json({ error: 'Maps key not configured' }, { status: 500 });
  }

  // Clamp width to a sane range (Google caps photos at 1600px).
  const maxwidth = Math.min(Math.max(parseInt(wRaw || '600', 10) || 600, 1), 1600);

  // Deterministic object path per (reference, width) so the same photo always
  // maps to the same cached object.
  const hash = createHash('sha256').update(ref).digest('hex').slice(0, 40);
  const objectPath = `${maxwidth}/${hash}.jpg`;

  const admin = adminClient();
  const publicUrl = admin
    ? admin.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl
    : null;

  // 1) Already cached? Redirect to Supabase — no Google call.
  if (publicUrl) {
    try {
      const head = await fetch(publicUrl, { method: 'HEAD' });
      if (head.ok) return cachedRedirect(publicUrl);
    } catch {
      // ignore — fall through to fetch + cache
    }
  }

  // 2) Fetch from Google exactly once. If the stored reference has expired
  //    and we know the place_id, mint a fresh reference and retry — the result
  //    is cached under the ORIGINAL ref's object path, so every stored URL
  //    pointing at the dead ref heals permanently after one request.
  let photo = await fetchGooglePhoto(ref, maxwidth);
  if (!photo && pid) {
    const fresh = await freshPhotoRef(pid);
    if (fresh && fresh !== ref) {
      photo = await fetchGooglePhoto(fresh, maxwidth);
      if (photo) console.log(`[photo-proxy] healed expired ref via place ${pid.slice(0, 20)}…`);
    }
  }
  if (!photo) {
    return NextResponse.json({ error: 'Photo unavailable' }, { status: 502 });
  }
  const { bytes, contentType } = photo;

  // 3) Cache to Supabase Storage (best-effort), then redirect there.
  if (admin && publicUrl) {
    try {
      const body = Buffer.from(bytes);
      const opts = { contentType, upsert: true, cacheControl: '604800' };
      let up = await admin.storage.from(BUCKET).upload(objectPath, body, opts);
      // Auto-create the public bucket the first time it's needed.
      if (up.error && /bucket|not found|does not exist/i.test(up.error.message)) {
        await admin.storage.createBucket(BUCKET, { public: true });
        up = await admin.storage.from(BUCKET).upload(objectPath, body, opts);
      }
      if (!up.error) return cachedRedirect(publicUrl);
      console.error('[photo-proxy] supabase upload failed:', up.error.message);
    } catch (err) {
      console.error('[photo-proxy] caching error:', err);
    }
  }

  // 4) Fallback: stream the bytes directly (still works without caching).
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
    },
  });
}
