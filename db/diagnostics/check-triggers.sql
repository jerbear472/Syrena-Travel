-- Check all triggers on place_visits
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'place_visits';

-- Check function source code
SELECT prosrc FROM pg_proc WHERE proname = 'notify_place_visit';

-- Check places table columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'places' AND table_schema = 'public';

-- Check place_visits table columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'place_visits' AND table_schema = 'public';
