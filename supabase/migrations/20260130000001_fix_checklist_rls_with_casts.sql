-- ============================================================================
-- Migration: Fix RLS Policies for Checklist Tables (COM TYPE CASTS EXPLÍCITOS)
-- Date: 2026-01-30
-- Purpose: Add missing RLS policies for checklist_folders and checklist_templates
--          Versão com casts explícitos para lidar com TEXT vs UUID
-- ============================================================================

-- Helper function (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
DECLARE
    user_id_text TEXT;
BEGIN
    -- Get the user ID from request context (set by middleware)
    user_id_text := current_setting('request.jwt.claim.sub', true);

    -- Return NULL if empty or not set
    IF user_id_text IS NULL OR user_id_text = '' THEN
        RETURN NULL;
    END IF;

    -- Cast to UUID
    RETURN user_id_text::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- CHECKLIST_FOLDERS POLICIES
-- ============================================================================

-- Enable RLS (should already be enabled, but just in case)
ALTER TABLE public.checklist_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "checklist_folders_select" ON public.checklist_folders;
DROP POLICY IF EXISTS "checklist_folders_insert" ON public.checklist_folders;
DROP POLICY IF EXISTS "checklist_folders_update" ON public.checklist_folders;
DROP POLICY IF EXISTS "checklist_folders_delete" ON public.checklist_folders;

-- SELECT: Users can see folders from their organization OR public folders
CREATE POLICY "checklist_folders_select" ON public.checklist_folders
    FOR SELECT USING (
        -- System admins see everything
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        -- Users see their organization's folders
        COALESCE(organization_id::text, '') IN (
            SELECT COALESCE(organization_id::text, '') FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
        )
        OR
        -- Users see public/shared folders (organization_id IS NULL)
        organization_id IS NULL
    );

-- INSERT: Org admins and managers can create folders
CREATE POLICY "checklist_folders_insert" ON public.checklist_folders
    FOR INSERT WITH CHECK (
        -- System admins can create anywhere
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        -- Org admins/managers can create in their org
        (
            COALESCE(organization_id::text, '') IN (
                SELECT COALESCE(organization_id::text, '') FROM public.users
                WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
                AND role IN ('org_admin', 'manager')
            )
        )
    );

-- UPDATE: Same as INSERT
CREATE POLICY "checklist_folders_update" ON public.checklist_folders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        (
            COALESCE(organization_id::text, '') IN (
                SELECT COALESCE(organization_id::text, '') FROM public.users
                WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
                AND role IN ('org_admin', 'manager')
            )
        )
    );

-- DELETE: Only system admins and org admins
CREATE POLICY "checklist_folders_delete" ON public.checklist_folders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        (
            COALESCE(organization_id::text, '') IN (
                SELECT COALESCE(organization_id::text, '') FROM public.users
                WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
                AND role = 'org_admin'
            )
        )
    );

-- ============================================================================
-- CHECKLIST_TEMPLATES POLICIES
-- ============================================================================

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "checklist_templates_select" ON public.checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_insert" ON public.checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_update" ON public.checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_delete" ON public.checklist_templates;

-- SELECT: Users can see templates from their organization OR public templates
CREATE POLICY "checklist_templates_select" ON public.checklist_templates
    FOR SELECT USING (
        -- System admins see everything
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        -- Users see their organization's templates
        COALESCE(organization_id::text, '') IN (
            SELECT COALESCE(organization_id::text, '') FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
        )
        OR
        -- Users see public templates (organization_id IS NULL)
        organization_id IS NULL
        OR
        -- Users see public templates (is_public = true)
        is_public = true
    );

-- INSERT: Authenticated users can create templates in their org
CREATE POLICY "checklist_templates_insert" ON public.checklist_templates
    FOR INSERT WITH CHECK (
        -- System admins can create anywhere
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        -- Users can create in their org
        (
            COALESCE(organization_id::text, '') IN (
                SELECT COALESCE(organization_id::text, '') FROM public.users
                WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            )
        )
    );

-- UPDATE: Owner or org admins can update
CREATE POLICY "checklist_templates_update" ON public.checklist_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        (
            COALESCE(organization_id::text, '') IN (
                SELECT COALESCE(organization_id::text, '') FROM public.users
                WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
                AND role IN ('org_admin', 'manager')
            )
        )
        OR
        -- Template creator can update their own
        COALESCE(created_by::text, '') = COALESCE(auth.uid(), current_user_id())::text
    );

-- DELETE: System admins, org admins, or creator
CREATE POLICY "checklist_templates_delete" ON public.checklist_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
            AND role IN ('sys_admin', 'system_admin', 'admin')
        )
        OR
        (
            COALESCE(organization_id::text, '') IN (
                SELECT COALESCE(organization_id::text, '') FROM public.users
                WHERE id::text = COALESCE(auth.uid(), current_user_id())::text
                AND role = 'org_admin'
            )
        )
        OR
        COALESCE(created_by::text, '') = COALESCE(auth.uid(), current_user_id())::text
    );

-- ============================================================================
-- Create indexes for performance (if not exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_checklist_folders_org_id ON public.checklist_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_folders_parent_id ON public.checklist_folders(parent_id);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_org_id ON public.checklist_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_folder_id ON public.checklist_templates(folder_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_created_by ON public.checklist_templates(created_by);
