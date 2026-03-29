-- ============================================
-- PUSH TOKENS TABLE
-- Stores Expo push tokens for each user
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
DROP POLICY IF EXISTS "Users can view own token" ON public.push_tokens;
CREATE POLICY "Users can view own token"
  ON public.push_tokens FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own token" ON public.push_tokens;
CREATE POLICY "Users can insert own token"
  ON public.push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own token" ON public.push_tokens;
CREATE POLICY "Users can update own token"
  ON public.push_tokens FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own token" ON public.push_tokens;
CREATE POLICY "Users can delete own token"
  ON public.push_tokens FOR DELETE USING (auth.uid() = user_id);

-- Function to send push notification via Supabase Edge Function
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Get user's push token
  SELECT token INTO v_token
  FROM public.push_tokens
  WHERE user_id = p_user_id;

  IF v_token IS NOT NULL THEN
    -- Call Edge Function via pg_net (if available) or queue for processing
    -- For now, we'll use a notifications_queue table approach
    INSERT INTO public.push_queue (token, title, body, data)
    VALUES (v_token, p_title, p_body, p_data);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Silently fail - don't block the main operation
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Queue table for push notifications
CREATE TABLE IF NOT EXISTS public.push_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime on push_queue (Edge Function can listen)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.push_queue;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

SELECT 'SUCCESS: Push tokens table created!' AS status;
