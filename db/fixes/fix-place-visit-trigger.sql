-- Fix the place visit notification trigger
-- places table uses: user_id (owner)
-- place_visits table uses: visitor_id (who visited)

CREATE OR REPLACE FUNCTION public.notify_place_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_place_owner_id UUID;
  v_place_name TEXT;
  v_visitor_name TEXT;
  v_is_friend BOOLEAN;
BEGIN
  -- Get place details (places table uses user_id for owner)
  SELECT user_id, name INTO v_place_owner_id, v_place_name
  FROM public.places
  WHERE id = NEW.place_id;

  IF v_place_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if visiting own place (place_visits uses visitor_id)
  IF v_place_owner_id = NEW.visitor_id THEN
    RETURN NEW;
  END IF;

  -- Check if they are friends
  SELECT EXISTS(
    SELECT 1 FROM public.friendships
    WHERE ((requester_id = NEW.visitor_id AND addressee_id = v_place_owner_id)
        OR (requester_id = v_place_owner_id AND addressee_id = NEW.visitor_id))
      AND status = 'accepted'
  ) INTO v_is_friend;

  IF NOT v_is_friend THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_visitor_name
  FROM public.profiles
  WHERE id = NEW.visitor_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_place_owner_id,
    'place_visit',
    'Place Visited!',
    v_visitor_name || ' visited your place "' || v_place_name || '"',
    jsonb_build_object(
      'place_id', NEW.place_id,
      'visitor_id', NEW.visitor_id,
      'place_name', v_place_name
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in notify_place_visit: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop ALL possible trigger names and recreate
DROP TRIGGER IF EXISTS on_place_visit ON public.place_visits;
DROP TRIGGER IF EXISTS on_place_visited_notify ON public.place_visits;

CREATE TRIGGER on_place_visited_notify
  AFTER INSERT ON public.place_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_place_visit();
