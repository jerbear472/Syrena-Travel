-- Syrena Concierge Onboarding: Add source tracking and onboarding flag
-- This migration adds the ability to distinguish Syrena-generated places from user-created ones

-- 1. Add 'source' column to places table
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';

-- 2. Add check constraint for valid source values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'places_source_check'
  ) THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_source_check CHECK (source IN ('user', 'syrena', 'guide'));
  END IF;
END $$;

-- 3. Add index on source for efficient filtering
CREATE INDEX IF NOT EXISTS idx_places_source ON public.places(source);

-- 4. Add 'onboarding_complete' boolean to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- 5. Backfill: all existing places are user-created
UPDATE public.places SET source = 'user' WHERE source IS NULL;

-- 6. Backfill: mark all existing users as onboarding complete (no re-onboarding)
UPDATE public.profiles SET onboarding_complete = TRUE WHERE onboarding_complete IS NULL;
