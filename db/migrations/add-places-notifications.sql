-- ============================================
-- ADD PLACES NOTIFICATIONS
-- Run after the minimal setup succeeded
-- ============================================

-- 1. NEW PLACE NOTIFICATION TRIGGER
CREATE OR REPLACE FUNCTION public.notify_friends_new_place()
RETURNS TRIGGER AS $$
DECLARE
  v_friend_id UUID;
  v_user_name TEXT;
  v_place_category TEXT;
BEGIN
  -- Skip private places
  IF NEW.is_public = false THEN
    RETURN NEW;
  END IF;

  -- Get user's display name
  SELECT COALESCE(display_name, username, 'A friend') INTO v_user_name
  FROM public.profiles WHERE id = NEW.user_id;

  v_place_category := COALESCE(NEW.category, 'place');

  -- Notify all accepted friends
  FOR v_friend_id IN
    SELECT CASE
      WHEN requester_id = NEW.user_id THEN addressee_id
      ELSE requester_id
    END
    FROM public.friendships
    WHERE (requester_id = NEW.user_id OR addressee_id = NEW.user_id)
      AND status = 'accepted'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_friend_id,
      'new_place',
      'New Place Added',
      v_user_name || ' added a new ' || v_place_category || ': ' || NEW.name,
      jsonb_build_object(
        'place_id', NEW.id,
        'place_name', NEW.name,
        'category', NEW.category,
        'lat', NEW.lat,
        'lng', NEW.lng,
        'photo_url', NEW.photo_url,
        'added_by', NEW.user_id,
        'added_by_name', v_user_name
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_place_created_notify_friends ON public.places;
CREATE TRIGGER on_place_created_notify_friends
  AFTER INSERT ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.notify_friends_new_place();

-- 2. PLACE VISITS TABLE
CREATE TABLE IF NOT EXISTS public.place_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, user_id)
);

ALTER TABLE public.place_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view visits" ON public.place_visits;
CREATE POLICY "Anyone can view visits" ON public.place_visits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert visits" ON public.place_visits;
CREATE POLICY "Users can insert visits" ON public.place_visits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete visits" ON public.place_visits;
CREATE POLICY "Users can delete visits" ON public.place_visits FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.place_visits;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. PLACE VISIT NOTIFICATION TRIGGER
CREATE OR REPLACE FUNCTION public.notify_place_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_place_name TEXT;
  v_visitor_name TEXT;
  v_is_friend BOOLEAN;
BEGIN
  SELECT user_id, name INTO v_owner_id, v_place_name
  FROM public.places WHERE id = NEW.place_id;

  -- Don't notify self
  IF v_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  -- Check friendship
  SELECT EXISTS(
    SELECT 1 FROM public.friendships
    WHERE ((requester_id = NEW.user_id AND addressee_id = v_owner_id)
        OR (requester_id = v_owner_id AND addressee_id = NEW.user_id))
      AND status = 'accepted'
  ) INTO v_is_friend;

  IF NOT v_is_friend THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_visitor_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_owner_id,
    'place_visit',
    'Place Visited!',
    v_visitor_name || ' visited your place: ' || v_place_name,
    jsonb_build_object(
      'place_id', NEW.place_id,
      'place_name', v_place_name,
      'visitor_id', NEW.user_id,
      'visitor_name', v_visitor_name
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_place_visited_notify ON public.place_visits;
CREATE TRIGGER on_place_visited_notify
  AFTER INSERT ON public.place_visits
  FOR EACH ROW EXECUTE FUNCTION public.notify_place_visit();

SELECT 'SUCCESS: Places notifications added!' AS status;
