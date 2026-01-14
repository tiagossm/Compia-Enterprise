-- Down Migration for 53_security_hardening_rls.sql
-- Rollback RLS policies and indexes

-- Drop RLS policies
DROP POLICY IF EXISTS inspection_tenant_isolation ON inspections;
DROP POLICY IF EXISTS inspection_items_tenant_isolation ON inspection_items;
DROP POLICY IF EXISTS inspection_media_tenant_isolation ON inspection_media;
DROP POLICY IF EXISTS action_items_tenant_isolation ON action_items;
DROP POLICY IF EXISTS checklist_templates_tenant_isolation ON checklist_templates;

-- Disable RLS
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_media DISABLE ROW LEVEL SECURITY;
ALTER TABLE action_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates DISABLE ROW LEVEL SECURITY;

-- Drop indexes (optional, usually keep for performance)
-- DROP INDEX IF EXISTS idx_inspection_items_inspection_id;
-- DROP INDEX IF EXISTS idx_inspection_media_inspection_id;
-- DROP INDEX IF EXISTS idx_action_items_inspection_id;
-- DROP INDEX IF EXISTS idx_inspection_reports_inspection_id;
-- DROP INDEX IF EXISTS idx_inspections_organization_id;
-- DROP INDEX IF EXISTS idx_users_organization_id;
-- DROP INDEX IF EXISTS idx_checklist_templates_organization_id;

-- Remove audit columns
ALTER TABLE inspections DROP COLUMN IF EXISTS updated_by;
ALTER TABLE inspection_items DROP COLUMN IF EXISTS updated_by;
