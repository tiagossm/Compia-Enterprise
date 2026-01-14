
-- Remove indexes
DROP INDEX IF EXISTS idx_inspection_items_inspection_id;
DROP INDEX IF EXISTS idx_inspection_items_compliance_status;

-- Remove compliance_status column
ALTER TABLE inspection_items DROP COLUMN compliance_status;
