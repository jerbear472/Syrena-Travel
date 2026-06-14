-- Disable ALL triggers on place_visits
ALTER TABLE public.place_visits DISABLE TRIGGER ALL;

-- Also check and disable triggers on notifications table
ALTER TABLE public.notifications DISABLE TRIGGER ALL;

-- List all triggers to see what exists
SELECT
  event_object_table as table_name,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table;
