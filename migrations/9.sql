
-- Add user_id column to existing tables
ALTER TABLE inspections ADD COLUMN created_by TEXT;
ALTER TABLE checklist_templates ADD COLUMN created_by_user_id TEXT;
ALTER TABLE action_items ADD COLUMN assigned_to TEXT;

-- Add organization_id for multi-tenant data segregation
ALTER TABLE inspections ADD COLUMN organization_id INTEGER;
ALTER TABLE checklist_templates ADD COLUMN organization_id INTEGER;
