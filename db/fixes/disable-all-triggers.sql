-- NUCLEAR OPTION: Disable ALL triggers on place_visits
ALTER TABLE public.place_visits DISABLE TRIGGER ALL;

-- This will make Mark as Visited work (without notifications for now)
SELECT 'All triggers disabled on place_visits' as status;
