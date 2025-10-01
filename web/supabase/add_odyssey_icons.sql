-- Add odyssey_icon field to profiles table
-- Users can choose an icon that will appear as their map pin

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS odyssey_icon TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.profiles.odyssey_icon IS 'Odyssey-themed icon filename (e.g., odyssey-1.png) that appears as the user''s map pin';

SELECT 'Odyssey icon field added successfully!' as status;
