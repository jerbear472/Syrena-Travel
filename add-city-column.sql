-- Add city column to places table (if it doesn't exist)
-- Run this in Supabase SQL Editor

-- Add the city column
ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- Create index for city searches
CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'places' AND column_name = 'city';
