-- Syrena Travel — Itinerary feature schema
-- Run in Supabase SQL Editor. Additive only — does not touch existing tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_bytes (shareable_token)

-- ============================================================
-- itineraries: one row per saved trip plan
-- ============================================================
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  num_days INTEGER NOT NULL CHECK (num_days >= 1 AND num_days <= 30),
  prompt TEXT NOT NULL,
  constraints JSONB DEFAULT '{}'::jsonb,
  shareable_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_shareable_token ON itineraries(shareable_token);
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at ON itineraries(created_at DESC);

-- ============================================================
-- itinerary_days: one row per day, places stored as ordered JSONB array
-- Each place object:
--   { name, description, category, address, lat, lng,
--     why, google_place_id, photo_url, price_level, rating, neighborhood }
-- ============================================================
CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  narrative TEXT,
  places JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(itinerary_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON itinerary_days(itinerary_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_itineraries_updated_at ON itineraries;
CREATE TRIGGER trg_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_itinerary_days_updated_at ON itinerary_days;
CREATE TRIGGER trg_itinerary_days_updated_at
  BEFORE UPDATE ON itinerary_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS — owner full access; public read only via shareable_token
-- ============================================================
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_days ENABLE ROW LEVEL SECURITY;

-- Owners: full CRUD on their own itineraries
DROP POLICY IF EXISTS "Users manage own itineraries" ON itineraries;
CREATE POLICY "Users manage own itineraries"
  ON itineraries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners: full CRUD on days of their itineraries
DROP POLICY IF EXISTS "Users manage own itinerary days" ON itinerary_days;
CREATE POLICY "Users manage own itinerary days"
  ON itinerary_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itineraries i
      WHERE i.id = itinerary_days.itinerary_id
        AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries i
      WHERE i.id = itinerary_days.itinerary_id
        AND i.user_id = auth.uid()
    )
  );

-- NOTE on public sharing: anon SELECT-by-token is enforced server-side in
-- the Next.js /api/itinerary/[id] route using the service-role key. Keeping
-- RLS strict (owner-only) avoids leaking listings via the anon key.

-- ============================================================
-- Grants for service-role (used by Next.js API for public share reads)
-- ============================================================
GRANT ALL ON itineraries TO service_role;
GRANT ALL ON itinerary_days TO service_role;
