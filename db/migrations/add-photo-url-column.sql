-- Add photo_url column to places table if it doesn't exist
ALTER TABLE places
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

-- Add price_level column to places table if it doesn't exist
ALTER TABLE places
ADD COLUMN IF NOT EXISTS price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4);

-- Add comments to document the columns
COMMENT ON COLUMN places.photo_url IS 'URL to the user-uploaded photo stored in Supabase Storage';
COMMENT ON COLUMN places.price_level IS 'Price level from 1-4 ($ to $$$$) from Google Places API';
