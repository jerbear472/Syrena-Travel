-- Drop ALL place_visits triggers
DROP TRIGGER IF EXISTS update_visit_count ON public.place_visits;
DROP TRIGGER IF EXISTS on_place_visited_notify ON public.place_visits;
DROP TRIGGER IF EXISTS on_place_visited ON public.place_visits;

-- Drop old functions
DROP FUNCTION IF EXISTS public.increment_visit_count() CASCADE;
DROP FUNCTION IF EXISTS public.notify_place_visit() CASCADE;
DROP FUNCTION IF EXISTS public.handle_place_visited() CASCADE;

-- 1. Create visit count function (uses user_id from places)
CREATE OR REPLACE FUNCTION public.increment_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.places
  SET visit_count = COALESCE(visit_count, 0) + 1
  WHERE id = NEW.place_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create single visit count trigger
CREATE TRIGGER update_visit_count
  AFTER INSERT ON public.place_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_visit_count();

-- Re-enable triggers
ALTER TABLE public.place_visits ENABLE TRIGGER USER;
ALTER TABLE public.notifications ENABLE TRIGGER USER;

SELECT 'SUCCESS! Triggers fixed. Mobile code handles notifications.' as status;
