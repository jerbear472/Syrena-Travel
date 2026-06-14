-- ============================================
-- COMPLETE PUSH NOTIFICATION SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PUSH TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own token" ON public.push_tokens;
CREATE POLICY "Users can manage own token"
  ON public.push_tokens FOR ALL USING (auth.uid() = user_id);

-- 2. ENABLE REALTIME
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.push_tokens;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. UPDATE NOTIFICATION TRIGGERS TO SEND PUSH
-- We'll modify triggers to call the Edge Function

-- Update friend request trigger to include push
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_token TEXT;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_name
  FROM public.profiles WHERE id = NEW.requester_id;

  -- Create in-app notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.addressee_id,
    'friend_request',
    'New Friend Request',
    v_name || ' sent you a friend request',
    jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.requester_id, 'type', 'friend_request')
  );

  -- Send push notification via Edge Function (requires pg_net extension)
  -- This will be handled by the webhook listener instead

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update friend accepted trigger
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT COALESCE(display_name, username, 'Someone') INTO v_name
    FROM public.profiles WHERE id = NEW.addressee_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      v_name || ' accepted your friend request',
      jsonb_build_object('friendship_id', NEW.id, 'friend_id', NEW.addressee_id, 'type', 'friend_accepted')
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE WEBHOOK TRIGGER FOR PUSH NOTIFICATIONS
-- This function will be called when a notification is created
-- It prepares data for the Edge Function

CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_token TEXT;
  v_payload JSONB;
BEGIN
  -- Get user's push token
  SELECT token INTO v_token
  FROM public.push_tokens
  WHERE user_id = NEW.user_id;

  IF v_token IS NOT NULL THEN
    -- Prepare payload for Expo push
    v_payload := jsonb_build_object(
      'to', v_token,
      'title', NEW.title,
      'body', NEW.message,
      'data', COALESCE(NEW.data, '{}'::jsonb),
      'sound', 'default'
    );

    -- Queue for processing (Edge Function will pick this up)
    INSERT INTO public.push_queue (token, title, body, data, notification_id)
    VALUES (v_token, NEW.title, NEW.message, NEW.data, NEW.id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PUSH QUEUE TABLE
CREATE TABLE IF NOT EXISTS public.push_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  notification_id UUID,
  sent BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_sent ON public.push_queue(sent) WHERE sent = false;

-- Enable realtime for push_queue (Edge Function can listen)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.push_queue;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. CREATE TRIGGER ON NOTIFICATIONS TABLE
DROP TRIGGER IF EXISTS on_notification_created_push ON public.notifications;
CREATE TRIGGER on_notification_created_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_push_notification();

SELECT 'SUCCESS: Push notification system ready!' AS status;
