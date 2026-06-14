-- Google Places verification cache.
--
-- The itinerary / onboarding / source-of-journey routes verify every
-- Claude-suggested place against Google Places (Find Place + Place Details =
-- 2 API calls each). With no cache, regenerating a trip or re-running a guide
-- re-pays Google for places we already looked up — the same famous landmarks
-- recur constantly across users. This table is a read-through cache so each
-- (place, location) is fetched from Google at most once per 30 days.
--
-- Data stored is public Google place data only (no user data), so anon
-- read/write is acceptable. We cache the photo_reference (not a full photo
-- URL) so each route can build a URL at its own maxwidth without baking the
-- API key or a fixed size into the cache.
--
-- Run this in the Supabase SQL editor.

create table if not exists public.place_cache (
  cache_key          text primary key,            -- "<lowercased name>|<lat .2f>|<lng .2f>"
  verified           boolean not null,            -- false = Google couldn't find it (negative cache)
  google_place_id    text,
  google_name        text,
  photo_reference    text,
  price_level        integer,
  rating             numeric,
  user_ratings_total integer,
  formatted_address  text,
  lat                double precision,
  lng                double precision,
  fetched_at         timestamptz not null default now()
);

-- TTL sweeps query by age; index keeps that cheap.
create index if not exists place_cache_fetched_at_idx
  on public.place_cache (fetched_at);

alter table public.place_cache enable row level security;

-- Public place data — allow anon + authenticated to read and populate.
drop policy if exists place_cache_select on public.place_cache;
create policy place_cache_select on public.place_cache
  for select using (true);

drop policy if exists place_cache_insert on public.place_cache;
create policy place_cache_insert on public.place_cache
  for insert with check (true);

drop policy if exists place_cache_update on public.place_cache;
create policy place_cache_update on public.place_cache
  for update using (true) with check (true);
