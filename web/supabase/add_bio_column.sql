-- Add bio column to profiles table if it doesn't exist
-- Run this in the Supabase SQL editor

-- Add bio column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'bio';
