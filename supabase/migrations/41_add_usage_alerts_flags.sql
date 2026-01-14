-- Add usage alert flags to organizations table
ALTER TABLE organizations ADD COLUMN alert_50_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN alert_80_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN alert_100_sent BOOLEAN DEFAULT FALSE;
