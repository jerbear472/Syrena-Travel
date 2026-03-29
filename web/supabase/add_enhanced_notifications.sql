-- Enhanced Notifications Migration
-- Adds: welcome notifications, friend's new place notifications, and more

-- ============================================
-- 1. UPDATE NOTIFICATION TYPES
-- ============================================

-- Drop the old constraint and add new notification types
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'friend_request',      -- Someone sent you a friend request
  'friend_accepted',     -- Your friend request was accepted
  'new_place',           -- A friend added a new place
  'place_comment',       -- Someone commented on your place
  'place_shared',        -- A place was shared with you
  'place_visit',         -- A friend visited one of your places
  'welcome',             -- Welcome to the app
  'weekly_digest',       -- Weekly activity summary
  'achievement',         -- Unlocked an achievement
  'reminder'             -- General reminder
));

-- ============================================
-- 2. WELCOME NOTIFICATION FOR NEW USERS
-- ============================================

-- Function to create welcome notification when a new profile is created
CREATE OR REPLACE FUNCTION public.notify_welcome()
RETURNS TRIGGER AS $$
BEGIN
  -- Create welcome notification
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for welcome notification on new profile
DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_welcome();

-- ============================================
-- 3. NOTIFY FRIENDS WHEN USER ADDS NEW PLACE
-- ============================================

-- Function to notify all friends when a user adds a new place
CREATE OR REPLACE FUNCTION public.notify_friends_new_place()
RETURNS TRIGGER AS $$
DECLARE
  v_friend_id UUID;
  v_user_name TEXT;
  v_place_category TEXT;
BEGIN
  -- Only notify for public places
  IF NEW.is_public = false THEN
    RETURN NEW;
  END IF;

  -- Get the user's display name
  SELECT COALESCE(display_name, username, 'A friend') INTO v_user_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Get category display name
  v_place_category := COALESCE(NEW.category, 'place');

  -- Find all accepted friends and notify them
  FOR v_friend_id IN
    SELECT
      CASE
        WHEN requester_id = NEW.user_id THEN addressee_id
        ELSE requester_id
      END as friend_id
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new place notifications
DROP TRIGGER IF EXISTS on_place_created_notify_friends ON public.places;
CREATE TRIGGER on_place_created_notify_friends
  AFTER INSERT ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.notify_friends_new_place();

-- ============================================
-- 4. NOTIFY WHEN FRIEND VISITS YOUR PLACE
-- ============================================

-- Function to notify place owner when a friend visits their place
CREATE OR REPLACE FUNCTION public.notify_place_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_place_owner_id UUID;
  v_place_name TEXT;
  v_visitor_name TEXT;
  v_is_friend BOOLEAN;
BEGIN
  -- Get place details
  SELECT user_id, name INTO v_place_owner_id, v_place_name
  FROM public.places
  WHERE id = NEW.place_id;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for place visit notifications (if place_visits table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'place_visits') THEN
    DROP TRIGGER IF EXISTS on_place_visited_notify ON public.place_visits;
    CREATE TRIGGER on_place_visited_notify
      AFTER INSERT ON public.place_visits
      FOR EACH ROW EXECUTE FUNCTION public.notify_place_visit();
  END IF;
END $$;

-- ============================================
-- 5. HELPER FUNCTION: SEND CUSTOM NOTIFICATION
-- ============================================

-- Improved create_notification function with more options
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
-- 6. POLICY FOR SYSTEM TO CREATE NOTIFICATIONS
-- ============================================

-- Allow the system to create notifications for any user
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 7. CLEANUP OLD NOTIFICATIONS (Optional)
-- ============================================

-- Function to clean up old read notifications (older than 30 days)
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
-- SUMMARY OF NEW NOTIFICATION TYPES
-- ============================================
/*
  Notification Types:

  1. welcome          - Sent when user creates profile
  2. friend_request   - Sent when someone sends friend request
  3. friend_accepted  - Sent when friend request is accepted
  4. new_place        - Sent to friends when user adds a public place
  5. place_visit      - Sent when friend visits your place
  6. place_comment    - (Future) When someone comments on your place
  7. place_shared     - (Future) When a place is shared with you
  8. achievement      - (Future) When user unlocks achievement
  9. weekly_digest    - (Future) Weekly activity summary
  10. reminder        - (Future) General reminders

  All notifications include:
  - user_id: Who receives the notification
  - type: Category of notification
  - title: Short headline
  - message: Detailed message
  - data: JSON with extra context (IDs, names, etc.)
  - read: Boolean for read status
  - created_at: Timestamp
*/
