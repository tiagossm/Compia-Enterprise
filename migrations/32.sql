
-- Add compliance_status column to inspection_items for explicit compliance tracking
ALTER TABLE inspection_items ADD COLUMN compliance_status TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_items_compliance_status ON inspection_items(compliance_status);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON inspection_items(inspection_id);
