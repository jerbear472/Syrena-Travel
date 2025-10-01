-- Complete Friend Features Migration
-- This script sets up:
-- 1. Profiles table for user information
-- 2. Friendships table for friend connections
-- 3. Notifications table for friend request alerts
-- 4. All necessary functions and triggers

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================

-- Create profiles table to store user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- FRIENDSHIPS TABLE
-- =============================================

-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Friendships policies
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (
    auth.uid() = requester_id OR
    auth.uid() = addressee_id
  );

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friendships;
CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;
CREATE POLICY "Users can update friendships they're part of"
  ON public.friendships FOR UPDATE
  USING (
    auth.uid() = requester_id OR
    auth.uid() = addressee_id
  );

DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;
CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (
    auth.uid() = requester_id OR
    auth.uid() = addressee_id
  );

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'place_comment', 'place_shared')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_data)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create notification when friend request is made
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_name TEXT;
BEGIN
  -- Get requester's display name
  SELECT display_name INTO v_requester_name
  FROM public.profiles
  WHERE id = NEW.requester_id;

  -- Create notification for addressee
  IF NEW.status = 'pending' THEN
    PERFORM public.create_notification(
      NEW.addressee_id,
      'friend_request',
      'New Friend Request',
      v_requester_name || ' sent you a friend request',
      '/friends',
      jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.requester_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when friend request is accepted
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_accepter_name TEXT;
BEGIN
  -- Only notify if status changed to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get accepter's display name
    SELECT display_name INTO v_accepter_name
    FROM public.profiles
    WHERE id = NEW.addressee_id;

    -- Notify the original requester
    PERFORM public.create_notification(
      NEW.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      v_accepter_name || ' accepted your friend request',
      '/friends',
      jsonb_build_object('friendship_id', NEW.id, 'friend_id', NEW.addressee_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friends
CREATE OR REPLACE FUNCTION public.get_friends(user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  friendship_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.requester_id = user_id THEN p.id
      ELSE p2.id
    END as friend_id,
    CASE
      WHEN f.requester_id = user_id THEN p.username
      ELSE p2.username
    END as username,
    CASE
      WHEN f.requester_id = user_id THEN p.display_name
      ELSE p2.display_name
    END as display_name,
    CASE
      WHEN f.requester_id = user_id THEN p.avatar_url
      ELSE p2.avatar_url
    END as avatar_url,
    f.status as friendship_status
  FROM public.friendships f
  LEFT JOIN public.profiles p ON p.id = f.addressee_id
  LEFT JOIN public.profiles p2 ON p2.id = f.requester_id
  WHERE (f.requester_id = user_id OR f.addressee_id = user_id)
    AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for friend request notifications
DROP TRIGGER IF EXISTS on_friend_request_created ON public.friendships;
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request();

DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.friendships;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_accepted();

-- =============================================
-- UPDATE EXISTING PLACES TABLE (if needed)
-- =============================================

-- Update places RLS to only show friends' places (optional - uncomment if needed)
-- DROP POLICY IF EXISTS "Places are viewable by everyone" ON public.places;
--
-- CREATE POLICY "Users can see their own places and friends' places"
--   ON public.places FOR SELECT
--   USING (
--     auth.uid() = created_by OR
--     EXISTS (
--       SELECT 1 FROM public.friendships
--       WHERE status = 'accepted'
--       AND (
--         (requester_id = auth.uid() AND addressee_id = created_by) OR
--         (addressee_id = auth.uid() AND requester_id = created_by)
--       )
--     )
--   );

-- Create profiles for existing users (if any)
INSERT INTO public.profiles (id, username, display_name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Friend features migration completed successfully!' as status;
