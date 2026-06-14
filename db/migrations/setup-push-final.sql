-- ============================================================
-- PUSH NOTIFICATIONS — FINAL WIRING (run once in SQL Editor)
-- ============================================================
-- Replaces the dead push_queue design: the old trigger queued
-- rows into push_queue, but nothing ever consumed the queue, so
-- pushes never sent. This version delivers directly from
-- Postgres to Expo's push API via pg_net — no edge function,
-- no queue, no secrets (Expo's send endpoint needs no auth).
--
-- In-app notifications already work (notifications table +
-- realtime badge). This adds the device push on top.
-- ============================================================

-- 1. pg_net for HTTP calls from Postgres (built into Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Direct-to-Expo sender. Looks up the recipient's device
--    token and fires the push. Errors never block the insert.
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT token INTO v_token
  FROM public.push_tokens
  WHERE user_id = NEW.user_id;

  IF v_token IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', v_token,
        'title', NEW.title,
        'body', NEW.message,
        'data', COALESCE(NEW.data, '{}'::jsonb),
        'sound', 'default'
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-point the existing trigger at the new sender
DROP TRIGGER IF EXISTS on_notification_created_push ON public.notifications;
CREATE TRIGGER on_notification_created_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.send_push_on_notification();

-- 4. Retire the dead queue machinery (safe: nothing consumes it)
DROP FUNCTION IF EXISTS public.trigger_push_notification();
DROP TABLE IF EXISTS public.push_queue;

-- 5. Smoke test helper — AFTER running this file, insert a test
--    notification for your own user and your iPhone should buzz
--    (requires the app run once on the device with notification
--    permission granted, so a push token exists):
--
-- INSERT INTO public.notifications (user_id, type, title, message, data)
-- SELECT user_id, 'test', 'Pocket Compass', 'Push notifications are live!', '{}'::jsonb
-- FROM public.push_tokens LIMIT 1;

SELECT 'SUCCESS: pushes now deliver directly to Expo' AS status;
