-- Add missing columns to places table that the mobile app expects
-- This ensures all columns used by ExploreScreen, GuideScreen, and OnboardingService exist

-- address: used by Guide screen and OnboardingService for place addresses
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS address TEXT;

-- photo_url: used for place photos from Google Places
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- google_place_id: used to link to Google Places for verification
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- price_level: 1-4 price range indicator
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS price_level INTEGER;

-- city: stored once on creation to avoid repeated geocoding
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS city TEXT;

-- rating: place rating (0-5)
-- Note: may already exist with CHECK constraint from fix_places_table.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'places' AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.places ADD COLUMN rating INTEGER;
  END IF;
END $$;

-- Index on google_place_id for duplicate detection
CREATE INDEX IF NOT EXISTS idx_places_google_place_id ON public.places(google_place_id);

-- Index on city for feed filtering
CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);

-- Reset onboarding for all users so Syrena Picks can be generated
-- (The original migration incorrectly marked everyone as complete)
UPDATE public.profiles SET onboarding_complete = FALSE WHERE onboarding_complete = TRUE;
