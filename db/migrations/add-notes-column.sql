-- Add notes column to places table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'places' AND column_name = 'notes'
    ) THEN
        ALTER TABLE places ADD COLUMN notes TEXT;
    END IF;
END $$;
