-- Add usage alert flags to organizations table (idempotent)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'alert_50_sent') THEN
        ALTER TABLE organizations ADD COLUMN alert_50_sent BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'alert_80_sent') THEN
        ALTER TABLE organizations ADD COLUMN alert_80_sent BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'alert_100_sent') THEN
        ALTER TABLE organizations ADD COLUMN alert_100_sent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
