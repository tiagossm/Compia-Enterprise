-- Allow deferred configuration for inspections created via Agenda (idempotent)
DO $$
BEGIN
    -- Only drop NOT NULL if column is currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspections' AND column_name = 'template_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE inspections ALTER COLUMN template_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inspections' AND column_name = 'ai_assistant_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE inspections ALTER COLUMN ai_assistant_id DROP NOT NULL;
    END IF;
END $$;
