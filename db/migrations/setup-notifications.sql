-- ============================================
-- SYRENA TRAVEL - COMPLETE NOTIFICATIONS SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'new_place',
    'place_comment',
    'place_shared',
    'place_visit',
    'welcome',
    'weekly_digest',
    'achievement',
    'reminder'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System/triggers can create notifications for any user
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. ENABLE SUPABASE REALTIME FOR NOTIFICATIONS
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 4. CREATE HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.send_notification TO authenticated;

-- ============================================
-- 5. WELCOME NOTIFICATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_welcome()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.id,
    'welcome',
    'Welcome to Syrena!',
    'Start exploring by adding your favorite places and connecting with friends.',
    jsonb_build_object(
      'tips', ARRAY[
        'Tap the + button to add a place',
        'Search for friends to see their recommendations',
        'Mark places as visited to track your adventures'
      ]
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail user creation if notification fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_welcome();

-- ============================================
-- 6. FRIEND REQUEST NOTIFICATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_name TEXT;
BEGIN
  -- Only notify for pending requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get requester's display name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_requester_name
  FROM public.profiles
  WHERE id = NEW.requester_id;

  -- Create notification for addressee
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.addressee_id,
    'friend_request',
    'New Friend Request',
    v_requester_name || ' sent you a friend request',
    jsonb_build_object(
      'friendship_id', NEW.id,
      'requester_id', NEW.requester_id,
      'requester_name', v_requester_name
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_request_created ON public.friendships;
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request();

-- ============================================
-- 7. FRIEND ACCEPTED NOTIFICATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_accepter_name TEXT;
BEGIN
  -- Only notify if status changed to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get accepter's display name
    SELECT COALESCE(display_name, username, 'Someone') INTO v_accepter_name
    FROM public.profiles
    WHERE id = NEW.addressee_id;

    -- Notify the original requester
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      v_accepter_name || ' accepted your friend request',
      jsonb_build_object(
        'friendship_id', NEW.id,
        'friend_id', NEW.addressee_id,
        'friend_name', v_accepter_name
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.friendships;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_accepted();

-- ============================================
-- 8. NEW PLACE NOTIFICATION TRIGGER
-- Uses COALESCE to handle both user_id and created_by columns
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_friends_new_place()
RETURNS TRIGGER AS $$
DECLARE
  v_friend_id UUID;
  v_user_name TEXT;
  v_place_category TEXT;
  v_owner_id UUID;
BEGIN
  -- Get owner ID - handle both column names (user_id or created_by)
  v_owner_id := COALESCE(NEW.user_id, NEW.created_by);

  -- If no owner, skip
  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only notify for public places (if is_public column exists and is false, skip)
  IF NEW.is_public IS NOT NULL AND NEW.is_public = false THEN
    RETURN NEW;
  END IF;

  -- Get the user's display name
  SELECT COALESCE(display_name, username, 'A friend') INTO v_user_name
  FROM public.profiles
  WHERE id = v_owner_id;

  -- Get category display name
  v_place_category := COALESCE(NEW.category, 'place');

  -- Find all accepted friends and notify them
  FOR v_friend_id IN
    SELECT
      CASE
        WHEN requester_id = v_owner_id THEN addressee_id
        ELSE requester_id
      END as friend_id
    FROM public.friendships
    WHERE (requester_id = v_owner_id OR addressee_id = v_owner_id)
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
        'added_by', v_owner_id,
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

-- ============================================
-- 9. PLACE VISITS TABLE (create if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS public.place_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, user_id)
);

-- Enable RLS on place_visits
ALTER TABLE public.place_visits ENABLE ROW LEVEL SECURITY;

-- Place visits policies
DROP POLICY IF EXISTS "Users can view place visits" ON public.place_visits;
CREATE POLICY "Users can view place visits"
  ON public.place_visits FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own visits" ON public.place_visits;
CREATE POLICY "Users can insert own visits"
  ON public.place_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own visits" ON public.place_visits;
CREATE POLICY "Users can delete own visits"
  ON public.place_visits FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for place_visits
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.place_visits;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 10. PLACE VISIT NOTIFICATION TRIGGER
-- Uses COALESCE to handle both user_id and created_by columns
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_place_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_place_owner_id UUID;
  v_place_name TEXT;
  v_visitor_name TEXT;
  v_is_friend BOOLEAN;
BEGIN
  -- Get place details - handle both column names
  SELECT COALESCE(user_id, created_by), name INTO v_place_owner_id, v_place_name
  FROM public.places
  WHERE id = NEW.place_id;

  -- If no owner found, skip
  IF v_place_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if visiting own place
  IF v_place_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check if they are friends
  SELECT EXISTS(
    SELECT 1 FROM public.friendships
    WHERE ((requester_id = NEW.user_id AND addressee_id = v_place_owner_id)
        OR (requester_id = v_place_owner_id AND addressee_id = NEW.user_id))
      AND status = 'accepted'
  ) INTO v_is_friend;

  -- Only notify for friends
  IF NOT v_is_friend THEN
    RETURN NEW;
  END IF;

  -- Get visitor's name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_visitor_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Create notification for place owner
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_place_owner_id,
    'place_visit',
    'Place Visited!',
    v_visitor_name || ' visited your place: ' || v_place_name,
    jsonb_build_object(
      'place_id', NEW.place_id,
      'place_name', v_place_name,
      'visitor_id', NEW.user_id,
      'visitor_name', v_visitor_name,
      'visited_at', NEW.visited_at
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_place_visited_notify ON public.place_visits;
CREATE TRIGGER on_place_visited_notify
  AFTER INSERT ON public.place_visits
  FOR EACH ROW EXECUTE FUNCTION public.notify_place_visit();

-- ============================================
-- 11. CLEANUP FUNCTION (Optional - for maintenance)
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE read = true
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE! Your notification system is now ready.
-- ============================================

-- Quick verification:
SELECT 'Notifications table created' AS status WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications');
