-- Migration: Add responsible_role column to inspections table
-- This stores the job title/position of the responsible person

ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS responsible_role VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN inspections.responsible_role IS 'Job title or position of the responsible person at the inspected location';
