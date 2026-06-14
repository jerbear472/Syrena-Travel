-- Disable only USER triggers (not system triggers)
ALTER TABLE public.place_visits DISABLE TRIGGER USER;
ALTER TABLE public.notifications DISABLE TRIGGER USER;

-- Show all user triggers
SELECT
  event_object_table as table_name,
  trigger_name
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table;
