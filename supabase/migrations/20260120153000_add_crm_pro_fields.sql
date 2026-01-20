
-- Add Professional CRM Fields
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS deal_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0, -- 0-100%
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update status_updated_at for existing records
UPDATE leads SET status_updated_at = updated_at WHERE status_updated_at IS NULL;
