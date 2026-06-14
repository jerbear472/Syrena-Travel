-- One-time migration: rewrite stored Google Places photo URLs to the new
-- key-hiding /api/photo proxy.
--
-- WHY: existing rows store absolute Google photo URLs with the OLD API key
-- embedded (e.g. .../place/photo?maxwidth=400&photoreference=ABC&key=AIza...).
-- After the photo-proxy change, NEW data points at /api/photo, but these old
-- rows still embed the key. Rotating the key in Google Cloud would 403 every
-- one of them. This rewrites them to the proxy so rotation is safe and the
-- images keep working.
--
-- WHAT it does: extracts the photoreference (handles both `photoreference=` and
-- the api/ backend's `photo_reference=`) and the maxwidth, and rebuilds the URL
-- as `<SITE_URL>/api/photo?ref=<ref>&w=<width>`. Photo references are already
-- URL-safe, so no re-encoding is needed.
--
-- Covers three stores: places.photo_url, itinerary_days.places (JSONB array,
-- order preserved), and notifications.data->'photo_url'.
--
-- SAFE TO RE-RUN: every WHERE clause only matches maps.googleapis.com URLs, so
-- once rewritten a row no longer matches. Runs in a single transaction.
--
-- BEFORE RUNNING: if your web app's public origin is not the value below,
-- change SITE_URL everywhere in this file (it must match NEXT_PUBLIC_SITE_URL /
-- the deployed web domain — currently https://syrena-web-new.vercel.app).
--
-- Run in the Supabase SQL editor.

-- ── Optional preview: how many rows will change? Run these first. ──────────────
-- SELECT count(*) AS places_to_fix
--   FROM public.places
--  WHERE photo_url LIKE 'https://maps.googleapis.com/maps/api/place/photo%';
-- SELECT count(*) AS itinerary_days_to_fix
--   FROM public.itinerary_days
--  WHERE places::text LIKE '%maps.googleapis.com/maps/api/place/photo%';
-- SELECT count(*) AS notifications_to_fix
--   FROM public.notifications
--  WHERE data->>'photo_url' LIKE 'https://maps.googleapis.com/maps/api/place/photo%';

BEGIN;

-- 1) places.photo_url (plain text column) ──────────────────────────────────────
UPDATE public.places
SET photo_url =
      'https://syrena-web-new.vercel.app/api/photo?ref='
      || substring(photo_url from 'photo_?reference=([^&]+)')
      || '&w='
      || coalesce(substring(photo_url from 'maxwidth=([0-9]+)'), '600')
WHERE photo_url LIKE 'https://maps.googleapis.com/maps/api/place/photo%'
  AND photo_url ~ 'photo_?reference=';

-- 2) itinerary_days.places (JSONB array of place objects) ──────────────────────
--    Rewrite each element's photo_url, preserving array order via ORDINALITY.
UPDATE public.itinerary_days d
SET places = sub.new_places
FROM (
  SELECT
    t.id,
    jsonb_agg(
      CASE
        WHEN elem->>'photo_url' LIKE 'https://maps.googleapis.com/maps/api/place/photo%'
             AND elem->>'photo_url' ~ 'photo_?reference='
        THEN jsonb_set(
               elem,
               '{photo_url}',
               to_jsonb(
                 'https://syrena-web-new.vercel.app/api/photo?ref='
                 || substring(elem->>'photo_url' from 'photo_?reference=([^&]+)')
                 || '&w='
                 || coalesce(substring(elem->>'photo_url' from 'maxwidth=([0-9]+)'), '600')
               )
             )
        ELSE elem
      END
      ORDER BY ord
    ) AS new_places
  FROM public.itinerary_days t,
       jsonb_array_elements(t.places) WITH ORDINALITY AS arr(elem, ord)
  WHERE t.places::text LIKE '%maps.googleapis.com/maps/api/place/photo%'
  GROUP BY t.id
) sub
WHERE d.id = sub.id;

-- 3) notifications.data->'photo_url' (denormalized snapshot) ───────────────────
UPDATE public.notifications
SET data = jsonb_set(
      data,
      '{photo_url}',
      to_jsonb(
        'https://syrena-web-new.vercel.app/api/photo?ref='
        || substring(data->>'photo_url' from 'photo_?reference=([^&]+)')
        || '&w='
        || coalesce(substring(data->>'photo_url' from 'maxwidth=([0-9]+)'), '600')
      )
    )
WHERE data->>'photo_url' LIKE 'https://maps.googleapis.com/maps/api/place/photo%'
  AND data->>'photo_url' ~ 'photo_?reference=';

COMMIT;

-- ── Verify: these should all return 0 after the migration. ────────────────────
-- SELECT count(*) FROM public.places
--   WHERE photo_url LIKE 'https://maps.googleapis.com/maps/api/place/photo%';
-- SELECT count(*) FROM public.itinerary_days
--   WHERE places::text LIKE '%maps.googleapis.com/maps/api/place/photo%';
-- SELECT count(*) FROM public.notifications
--   WHERE data->>'photo_url' LIKE 'https://maps.googleapis.com/maps/api/place/photo%';
