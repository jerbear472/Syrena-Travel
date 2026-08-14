import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read-through cache for Google Places verification.
//
// verifyAndEnrichPlace() does what the per-route verifyAndEnrichWithGoogle()
// functions used to do (Find Place -> Place Details, 2 API calls) BUT checks a
// shared `place_cache` table first. The same landmarks recur across trips,
// regenerations, and users, so most lookups become a DB read instead of two
// Google calls — which is what was burning the 2,000/day quota.
//
// See db/migrations/create-place-cache-table.sql for the table.

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Google's terms allow caching place data for up to 30 days. After that we
// re-fetch so ratings, photos, and closures stay reasonably fresh.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface PlaceInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface EnrichedPlace {
  verified: boolean;
  google_name: string | null;
  photo_url: string | null;
  price_level: number | null;
  rating: number | null;
  user_ratings_total: number | null;
  google_place_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface VerifyOptions {
  // Width passed to the Place Photo endpoint. Onboarding uses small thumbs,
  // guides use full-width heroes — so the URL is built per-call from the
  // cached photo_reference rather than stored at a fixed size.
  photoMaxWidth: number;
  // When Google is unreachable (no key / quota / denied), should the place be
  // trusted (verified: true) instead of dropped? Onboarding trusts Claude;
  // itinerary + guide drop on a missing key. Defaults to false.
  trustWhenUnavailable?: boolean;
}

const NOT_FOUND: EnrichedPlace = {
  verified: false, google_name: null, photo_url: null,
  price_level: null, rating: null, user_ratings_total: null,
  google_place_id: null, address: null, lat: null, lng: null,
};

let _client: SupabaseClient | null = null;
function cacheClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  _client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// Stable key: lowercased name + coords rounded to ~1km. Claude's coordinates
// for the same place drift slightly between generations, so we bucket loosely
// to maximise cache hits; two distinct places sharing a name within 1km is
// vanishingly rare.
function cacheKey(p: PlaceInput): string {
  const name = p.name.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${name}|${p.lat.toFixed(2)}|${p.lng.toFixed(2)}`;
}

// Public origin of the web app, used to build absolute photo-proxy URLs.
// Absolute (not relative) because the mobile app consumes these responses and
// renders the URLs directly — a relative path won't resolve in React Native.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrena-web-new.vercel.app')
  .replace(/\/$/, '');

// Build a URL to our own /api/photo proxy instead of embedding the API key.
// The place_id rides along so the proxy can mint a fresh photo reference if
// the embedded one expires (Google 400s old refs after a few weeks).
function photoUrl(ref: string | null, maxWidth: number, placeId?: string | null): string | null {
  if (!ref) return null;
  const pid = placeId ? `&pid=${encodeURIComponent(placeId)}` : '';
  return `${SITE_URL}/api/photo?ref=${encodeURIComponent(ref)}&w=${maxWidth}${pid}`;
}

interface CacheRow {
  verified: boolean;
  google_place_id: string | null;
  google_name: string | null;
  photo_reference: string | null;
  price_level: number | null;
  rating: number | null;
  user_ratings_total: number | null;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  fetched_at: string;
}

function rowToEnriched(row: CacheRow, photoMaxWidth: number): EnrichedPlace {
  return {
    verified: row.verified,
    google_name: row.google_name,
    photo_url: photoUrl(row.photo_reference, photoMaxWidth, row.google_place_id),
    price_level: row.price_level,
    rating: row.rating,
    user_ratings_total: row.user_ratings_total,
    google_place_id: row.google_place_id,
    address: row.formatted_address,
    lat: row.lat,
    lng: row.lng,
  };
}

// Fire-and-forget cache write. Never blocks the response on cache failures.
async function writeCache(key: string, row: Omit<CacheRow, 'fetched_at'>): Promise<void> {
  const client = cacheClient();
  if (!client) return;
  try {
    await client.from('place_cache').upsert(
      { cache_key: key, ...row, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' }
    );
  } catch (err) {
    console.error('[place-cache] write failed:', err);
  }
}

/**
 * Verify a Claude-suggested place against Google Places, reusing a cached
 * result when one exists and is fresh. Returns Google's ground-truth name,
 * coordinates, address, rating, and a photo URL at the requested width.
 *
 * Drop-in replacement for the old per-route verifyAndEnrichWithGoogle().
 */
export async function verifyAndEnrichPlace(
  place: PlaceInput,
  opts: VerifyOptions
): Promise<EnrichedPlace> {
  const { photoMaxWidth, trustWhenUnavailable = false } = opts;
  const unavailable: EnrichedPlace = trustWhenUnavailable
    ? { ...NOT_FOUND, verified: true }
    : NOT_FOUND;

  if (!GOOGLE_API_KEY) return unavailable;

  const key = cacheKey(place);

  // 1) Read-through: serve a fresh cached answer (positive OR negative) without
  //    touching Google. Negative hits suppress repeat lookups of hallucinated
  //    places, which were silently re-querying every generation.
  // Holds a cached row that exists but is past its TTL. We still prefer a live
  // refresh, but if Google turns out to be rate-limited below, serving this
  // slightly-stale data beats returning a bare verified stub with no
  // photo/rating/coords.
  let staleRow: CacheRow | null = null;

  const client = cacheClient();
  if (client) {
    try {
      const { data } = await client
        .from('place_cache')
        .select('*')
        .eq('cache_key', key)
        .maybeSingle();
      if (data) {
        const row = data as CacheRow;
        const age = Date.now() - new Date(row.fetched_at).getTime();
        if (age < CACHE_TTL_MS) {
          return rowToEnriched(row, photoMaxWidth);
        }
        staleRow = row;
      }
    } catch (err) {
      console.error('[place-cache] read failed:', err);
      // Fall through to a live Google lookup.
    }
  }

  // 2) Cache miss / stale — ask Google.
  try {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(place.name + ', ' + place.address)}` +
      `&inputtype=textquery` +
      `&locationbias=circle:5000@${place.lat},${place.lng}` +
      `&fields=place_id` +
      `&key=${GOOGLE_API_KEY}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();

    // Transient (quota / denied) — DON'T cache, so we retry. Prefer slightly
    // stale cached data over a bare trusted stub when we have it.
    if (findData.status === 'OVER_QUERY_LIMIT' || findData.status === 'REQUEST_DENIED') {
      return staleRow ? rowToEnriched(staleRow, photoMaxWidth) : { ...NOT_FOUND, verified: true };
    }
    // Definitive "not found" — cache the negative result.
    if (findData.status !== 'OK' || !findData.candidates?.length) {
      await writeCache(key, {
        verified: false, google_place_id: null, google_name: null,
        photo_reference: null, price_level: null, rating: null,
        user_ratings_total: null, formatted_address: null, lat: null, lng: null,
      });
      return NOT_FOUND;
    }

    const placeId = findData.candidates[0].place_id;

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}` +
      `&fields=name,rating,user_ratings_total,price_level,photos,formatted_address,geometry` +
      `&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (detailsData.status === 'OVER_QUERY_LIMIT' || detailsData.status === 'REQUEST_DENIED') {
      // Existence confirmed, details unavailable — don't cache. Prefer stale
      // cached detail over a bare stub when available.
      if (staleRow) return rowToEnriched(staleRow, photoMaxWidth);
      return { ...NOT_FOUND, verified: true, google_place_id: placeId };
    }
    if (detailsData.status !== 'OK' || !detailsData.result) {
      const row = {
        verified: true, google_place_id: placeId, google_name: null,
        photo_reference: null, price_level: null, rating: null,
        user_ratings_total: null, formatted_address: null, lat: null, lng: null,
      };
      await writeCache(key, row);
      return { ...NOT_FOUND, verified: true, google_place_id: placeId };
    }

    const d = detailsData.result;
    const photoRef = d.photos?.length ? d.photos[0].photo_reference : null;

    const row = {
      verified: true,
      google_place_id: placeId,
      google_name: d.name || null,
      photo_reference: photoRef,
      price_level: d.price_level ?? null,
      rating: d.rating ?? null,
      user_ratings_total: d.user_ratings_total ?? null,
      formatted_address: d.formatted_address || null,
      lat: d.geometry?.location?.lat ?? null,
      lng: d.geometry?.location?.lng ?? null,
    };
    await writeCache(key, row);

    return {
      verified: true,
      google_name: row.google_name,
      photo_url: photoUrl(photoRef, photoMaxWidth, placeId),
      price_level: row.price_level,
      rating: row.rating,
      user_ratings_total: row.user_ratings_total,
      google_place_id: placeId,
      address: row.formatted_address,
      lat: row.lat,
      lng: row.lng,
    };
  } catch (err) {
    console.error(`[place-cache] Google verify failed for ${place.name}:`, err);
    return NOT_FOUND;
  }
}
