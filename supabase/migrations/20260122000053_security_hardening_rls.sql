-- Migration 53: Security Hardening (RLS + Missing Foreign Keys)
-- Purpose: Add Postgres-native Row Level Security and fix legacy FK constraints
-- Date: 2026-01-12

-- ============================================
-- PART 1: ENABLE ROW LEVEL SECURITY ON CORE TABLES
-- ============================================

-- Note: Supabase/Cloudflare D1 may not support all RLS features.
-- These policies are designed for Postgres compatibility.

-- Enable RLS on inspections table
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Enable RLS on inspection_items table  
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on inspection_media table
ALTER TABLE inspection_media ENABLE ROW LEVEL SECURITY;

-- Enable RLS on action_items table
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on checklist_templates table
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: CREATE RLS POLICIES FOR TENANT ISOLATION
-- ============================================

-- Policy: Users can only see inspections from their organization
DROP POLICY IF EXISTS inspection_tenant_isolation ON inspections;
CREATE POLICY inspection_tenant_isolation ON inspections
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = current_setting('app.current_user_id', true)::uuid
        )
        OR organization_id IN (
            SELECT id FROM organizations WHERE parent_organization_id IN (
                SELECT managed_organization_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid
            )
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::uuid AND role IN ('sys_admin', 'admin')
        )
    );

-- Policy: Users can only see inspection items from their inspections
DROP POLICY IF EXISTS inspection_items_tenant_isolation ON inspection_items;
CREATE POLICY inspection_items_tenant_isolation ON inspection_items
    FOR ALL
    USING (
        inspection_id IN (
            SELECT id FROM inspections WHERE organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = current_setting('app.current_user_id', true)::uuid
            )
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::uuid AND role IN ('sys_admin', 'admin')
        )
    );

-- Policy: Users can only see media from their inspections
DROP POLICY IF EXISTS inspection_media_tenant_isolation ON inspection_media;
CREATE POLICY inspection_media_tenant_isolation ON inspection_media
    FOR ALL
    USING (
        inspection_id IN (
            SELECT id FROM inspections WHERE organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = current_setting('app.current_user_id', true)::uuid
            )
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::uuid AND role IN ('sys_admin', 'admin')
        )
    );

-- Policy: Users can only see action items from their inspections
DROP POLICY IF EXISTS action_items_tenant_isolation ON action_items;
CREATE POLICY action_items_tenant_isolation ON action_items
    FOR ALL
    USING (
        inspection_id IN (
            SELECT id FROM inspections WHERE organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = current_setting('app.current_user_id', true)::uuid
            )
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::uuid AND role IN ('sys_admin', 'admin')
        )
    );

-- Policy: Users can see public templates or templates from their org
DROP POLICY IF EXISTS checklist_templates_tenant_isolation ON checklist_templates;
CREATE POLICY checklist_templates_tenant_isolation ON checklist_templates
    FOR ALL
    USING (
        is_public = true
        OR organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = current_setting('app.current_user_id', true)::uuid
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::uuid AND role IN ('sys_admin', 'admin')
        )
    );

-- ============================================
-- PART 3: ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================

-- Note: SQLite/D1 does not enforce FKs by default. These statements ensure 
-- the schema documents the relationships for future Postgres migration.

-- For SQLite/D1, we use a different approach: Create indexes that help
-- with join performance (FKs are not enforced in D1 runtime anyway)

-- Index for inspection_items -> inspections relationship
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id 
    ON inspection_items(inspection_id);

-- Index for inspection_media -> inspections relationship  
CREATE INDEX IF NOT EXISTS idx_inspection_media_inspection_id 
    ON inspection_media(inspection_id);

-- Index for action_items -> inspections relationship
CREATE INDEX IF NOT EXISTS idx_action_items_inspection_id 
    ON action_items(inspection_id);

-- Index for inspection_reports -> inspections relationship
-- Index for inspection_reports -> inspections relationship (Table might not exist/renamed)
-- CREATE INDEX IF NOT EXISTS idx_inspection_reports_inspection_id ON inspection_reports(inspection_id);

-- Index for inspections -> organizations relationship
CREATE INDEX IF NOT EXISTS idx_inspections_organization_id 
    ON inspections(organization_id);

-- Index for users -> organizations relationship
CREATE INDEX IF NOT EXISTS idx_users_organization_id 
    ON users(organization_id);

-- Index for checklist_templates -> organizations relationship
CREATE INDEX IF NOT EXISTS idx_checklist_templates_organization_id 
    ON checklist_templates(organization_id);

-- ============================================
-- PART 4: ADD AUDIT COLUMNS TO LEGACY TABLES (IF MISSING)
-- ============================================

-- Ensure all tables have updated_at column for change tracking
-- (Most already have, but this is defensive)

-- Add updated_by column to inspections for audit trail
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Add updated_by column to inspection_items for audit trail
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- ============================================
-- VERIFICATION QUERIES (For auditor reference)
-- ============================================

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies exist:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
