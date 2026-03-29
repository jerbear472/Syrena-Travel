-- Run this first to see what columns exist in your places table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'places'
AND table_schema = 'public'
ORDER BY ordinal_position;
