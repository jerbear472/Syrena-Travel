-- Add XP and Level system
-- Users gain 10 XP when someone marks they've visited their place

-- Add XP and level columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Create place_visits table to track who has visited which places
CREATE TABLE IF NOT EXISTS public.place_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, visitor_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_place_visits_place_id ON public.place_visits(place_id);
CREATE INDEX IF NOT EXISTS idx_place_visits_visitor_id ON public.place_visits(visitor_id);

-- Enable RLS
ALTER TABLE public.place_visits ENABLE ROW LEVEL SECURITY;

-- Place visits policies
DROP POLICY IF EXISTS "Users can view place visits" ON public.place_visits;
CREATE POLICY "Users can view place visits"
  ON public.place_visits FOR SELECT
  USING (true); -- Everyone can see visits (public data)

DROP POLICY IF EXISTS "Users can create their own visits" ON public.place_visits;
CREATE POLICY "Users can create their own visits"
  ON public.place_visits FOR INSERT
  WITH CHECK (auth.uid() = visitor_id);

DROP POLICY IF EXISTS "Users can delete their own visits" ON public.place_visits;
CREATE POLICY "Users can delete their own visits"
  ON public.place_visits FOR DELETE
  USING (auth.uid() = visitor_id);

-- Function to calculate level from XP (every 100 XP = 1 level)
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(xp_amount / 100.0) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to award XP when someone visits a place
CREATE OR REPLACE FUNCTION public.award_visit_xp()
RETURNS TRIGGER AS $$
DECLARE
  place_owner_id UUID;
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  -- Get the place owner
  SELECT created_by INTO place_owner_id
  FROM public.places
  WHERE id = NEW.place_id;

  -- Don't award XP if user visits their own place
  IF place_owner_id = NEW.visitor_id THEN
    RETURN NEW;
  END IF;

  -- Award 10 XP to the place owner
  UPDATE public.profiles
  SET xp = xp + 10,
      level = calculate_level(xp + 10)
  WHERE id = place_owner_id
  RETURNING xp, level INTO new_xp, new_level;

  -- Optionally log the XP gain (for debugging)
  RAISE NOTICE 'Awarded 10 XP to user %. New XP: %, New Level: %',
    place_owner_id, new_xp, new_level;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to award XP when someone visits a place
DROP TRIGGER IF EXISTS on_place_visited ON public.place_visits;
CREATE TRIGGER on_place_visited
  AFTER INSERT ON public.place_visits
  FOR EACH ROW EXECUTE FUNCTION public.award_visit_xp();

-- Add visit_count column to places table (cached count for performance)
ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;

-- Function to update visit count on places
CREATE OR REPLACE FUNCTION public.update_place_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.places
    SET visit_count = visit_count + 1
    WHERE id = NEW.place_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.places
    SET visit_count = GREATEST(visit_count - 1, 0)
    WHERE id = OLD.place_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update visit count
DROP TRIGGER IF EXISTS update_visit_count ON public.place_visits;
CREATE TRIGGER update_visit_count
  AFTER INSERT OR DELETE ON public.place_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_place_visit_count();

-- Initialize visit counts for existing places
UPDATE public.places p
SET visit_count = (
  SELECT COUNT(*)
  FROM public.place_visits v
  WHERE v.place_id = p.id
);

SELECT 'XP and Level system added successfully!' as status;
