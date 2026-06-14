-- COMPLETE FIX: Drop everything and recreate clean

-- 1. Drop ALL triggers on place_visits
DROP TRIGGER IF EXISTS on_place_visit ON public.place_visits;
DROP TRIGGER IF EXISTS on_place_visited_notify ON public.place_visits;
DROP TRIGGER IF EXISTS trigger_place_visit ON public.place_visits;
DROP TRIGGER IF EXISTS place_visit_trigger ON public.place_visits;

-- 2. Drop the function
DROP FUNCTION IF EXISTS public.notify_place_visit() CASCADE;

-- 3. Create clean function (places.user_id, place_visits.visitor_id)
CREATE OR REPLACE FUNCTION public.notify_place_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_place_owner_id UUID;
  v_place_name TEXT;
  v_visitor_name TEXT;
BEGIN
  -- Get place owner (places table has user_id column)
  SELECT user_id, name INTO v_place_owner_id, v_place_name
  FROM public.places
  WHERE id = NEW.place_id;

  -- Skip if place not found or visiting own place
  IF v_place_owner_id IS NULL OR v_place_owner_id = NEW.visitor_id THEN
    RETURN NEW;
  END IF;

  -- Get visitor name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_visitor_name
  FROM public.profiles
  WHERE id = NEW.visitor_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_place_owner_id,
    'place_visit',
    'Place Visited!',
    v_visitor_name || ' visited your place "' || v_place_name || '"',
    jsonb_build_object('place_id', NEW.place_id, 'visitor_id', NEW.visitor_id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create single trigger
CREATE TRIGGER on_place_visited_notify
  AFTER INSERT ON public.place_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_place_visit();

-- Verify
SELECT 'SUCCESS - Trigger fixed!' as status;
