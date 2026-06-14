-- Syrena Travel — Public itinerary share RPC
-- Run after itinerary-schema.sql. Adds a SECURITY DEFINER function that lets
-- anon callers read a single itinerary + its days when they present the
-- correct shareable_token. Avoids the need for a service-role key.

CREATE OR REPLACE FUNCTION public.get_itinerary_by_token(
  p_itinerary_id UUID,
  p_token TEXT
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  destination VARCHAR,
  num_days INTEGER,
  prompt TEXT,
  constraints JSONB,
  created_at TIMESTAMPTZ,
  days JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.destination,
    i.num_days,
    i.prompt,
    i.constraints,
    i.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'day_number', d.day_number,
            'narrative', d.narrative,
            'places',    d.places
          )
          ORDER BY d.day_number
        )
        FROM itinerary_days d
        WHERE d.itinerary_id = i.id
      ),
      '[]'::jsonb
    ) AS days
  FROM itineraries i
  WHERE i.id = p_itinerary_id
    AND i.shareable_token = p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_itinerary_by_token(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_itinerary_by_token(UUID, TEXT) TO anon, authenticated;
