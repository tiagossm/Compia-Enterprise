-- Migration 42: Fix remaining auth_rls_initplan warnings
-- This migration wraps remaining auth.uid() and auth.jwt() calls with (SELECT ...)

-- =============================================================================
-- PART 1: Fix auth_rls_initplan warnings (22 policies)
-- =============================================================================

-- Table: plans (2 policies)
-- Policy: plans_select_auth
DROP POLICY IF EXISTS "plans_select_auth" ON public.plans;
CREATE POLICY "plans_select_auth" ON public.plans
  FOR SELECT USING (true);

-- Policy: plans_all_sysadmin
DROP POLICY IF EXISTS "plans_all_sysadmin" ON public.plans;
CREATE POLICY "plans_all_sysadmin" ON public.plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: system_email_config (1 policy)
-- Policy: SysAdmin Access
DROP POLICY IF EXISTS "SysAdmin Access" ON public.system_email_config;
CREATE POLICY "SysAdmin Access" ON public.system_email_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: system_settings (4 policies)
-- Policy: system_settings_select
DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
CREATE POLICY "system_settings_select" ON public.system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('sysadmin', 'admin')
    )
  );

-- Policy: system_settings_update
DROP POLICY IF EXISTS "system_settings_update" ON public.system_settings;
CREATE POLICY "system_settings_update" ON public.system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Policy: system_settings_insert
DROP POLICY IF EXISTS "system_settings_insert" ON public.system_settings;
CREATE POLICY "system_settings_insert" ON public.system_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Policy: system_settings_delete
DROP POLICY IF EXISTS "system_settings_delete" ON public.system_settings;
CREATE POLICY "system_settings_delete" ON public.system_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: ai_usage_logs (1 policy)
-- Policy: System Admin can view all ai logs
DROP POLICY IF EXISTS "System Admin can view all ai logs" ON public.ai_usage_logs;
CREATE POLICY "System Admin can view all ai logs" ON public.ai_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: leads (1 policy)
-- Policy: System Admin can manage leads
DROP POLICY IF EXISTS "System Admin can manage leads" ON public.leads;
CREATE POLICY "System Admin can manage leads" ON public.leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: organizations (1 policy)
-- Policy: orgs_select_sysadmin
DROP POLICY IF EXISTS "orgs_select_sysadmin" ON public.organizations;
CREATE POLICY "orgs_select_sysadmin" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: crm_activities (2 policies)
-- Policy: crm_activities_select
DROP POLICY IF EXISTS "crm_activities_select" ON public.crm_activities;
CREATE POLICY "crm_activities_select" ON public.crm_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.users u ON u.organization_id = l.organization_id
      WHERE l.id = crm_activities.lead_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- Policy: crm_activities_insert
DROP POLICY IF EXISTS "crm_activities_insert" ON public.crm_activities;
CREATE POLICY "crm_activities_insert" ON public.crm_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.users u ON u.organization_id = l.organization_id
      WHERE l.id = crm_activities.lead_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- Table: inspections (3 policies)
-- Policy: rls_inspections_select
DROP POLICY IF EXISTS "rls_inspections_select" ON public.inspections;
CREATE POLICY "rls_inspections_select" ON public.inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = inspections.organization_id
      AND users.id = (SELECT auth.uid())
    )
  );

-- Policy: rls_inspections_insert
DROP POLICY IF EXISTS "rls_inspections_insert" ON public.inspections;
CREATE POLICY "rls_inspections_insert" ON public.inspections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = inspections.organization_id
      AND users.id = (SELECT auth.uid())
    )
  );

-- Policy: rls_inspections_delete
DROP POLICY IF EXISTS "rls_inspections_delete" ON public.inspections;
CREATE POLICY "rls_inspections_delete" ON public.inspections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = inspections.organization_id
      AND users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'owner')
    )
  );

-- Table: activity_log (1 policy)
-- Policy: activity_log_select
DROP POLICY IF EXISTS "activity_log_select" ON public.activity_log;
CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = activity_log.organization_id
      AND users.id = (SELECT auth.uid())
    )
  );

-- Table: coupons (1 policy)
-- Policy: SysAdmin full access coupons
DROP POLICY IF EXISTS "SysAdmin full access coupons" ON public.coupons;
CREATE POLICY "SysAdmin full access coupons" ON public.coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: coupon_redemptions (1 policy)
-- Policy: SysAdmin full access coupon_redemptions
DROP POLICY IF EXISTS "SysAdmin full access coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "SysAdmin full access coupon_redemptions" ON public.coupon_redemptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- Table: webhook_events (1 policy)
-- Policy: rls_webhook_events_select
DROP POLICY IF EXISTS "rls_webhook_events_select" ON public.webhook_events;
CREATE POLICY "rls_webhook_events_select" ON public.webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = webhook_events.organization_id
      AND users.id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- PART 2: Fix multiple_permissive_policies warnings (20 policies)
-- =============================================================================

-- The multiple_permissive_policies warnings are intentional for tables that need
-- separate access for sysadmin AND regular users. These are:
-- - coupon_redemptions: "Org admins see own redemptions" + "SysAdmin full access"
-- - organizations: "orgs_select_own" + "orgs_select_sysadmin"
-- - plans: "plans_select_auth" + "plans_all_sysadmin"
-- - recurring_schedules: "Users can view org schedules" + "Admins can manage schedules"

-- For coupon_redemptions, we'll consolidate into a single policy that handles both cases
DROP POLICY IF EXISTS "Org admins see own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "SysAdmin full access coupon_redemptions" ON public.coupon_redemptions;

CREATE POLICY "coupon_redemptions_select_policy" ON public.coupon_redemptions
  FOR SELECT USING (
    -- SysAdmin can see all
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
    OR
    -- Org admins see own redemptions
    EXISTS (
      SELECT 1 FROM public.organizations org
      JOIN public.users u ON u.organization_id = org.id
      WHERE org.id = coupon_redemptions.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- For organizations, consolidate into a single policy
DROP POLICY IF EXISTS "orgs_select_own" ON public.organizations;
DROP POLICY IF EXISTS "orgs_select_sysadmin" ON public.organizations;

CREATE POLICY "organizations_select_policy" ON public.organizations
  FOR SELECT USING (
    -- SysAdmin can see all
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
    OR
    -- Users can see their own organization
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = organizations.id
      AND users.id = (SELECT auth.uid())
    )
  );

-- For plans, consolidate into a single policy
DROP POLICY IF EXISTS "plans_select_auth" ON public.plans;
DROP POLICY IF EXISTS "plans_all_sysadmin" ON public.plans;

CREATE POLICY "plans_select_policy" ON public.plans
  FOR SELECT USING (
    -- SysAdmin can see all
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
    OR
    -- All authenticated users can see plans
    true
  );

CREATE POLICY "plans_all_sysadmin_policy" ON public.plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );

-- For recurring_schedules, consolidate into a single policy
DROP POLICY IF EXISTS "Users can view org schedules" ON public.recurring_schedules;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.recurring_schedules;

CREATE POLICY "recurring_schedules_select_policy" ON public.recurring_schedules
  FOR SELECT USING (
    -- Users can view schedules in their org
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = recurring_schedules.organization_id
      AND users.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "recurring_schedules_manage_policy" ON public.recurring_schedules
  FOR ALL USING (
    -- Admins can manage schedules in their org
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.organization_id = recurring_schedules.organization_id
      AND users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'owner')
    )
  );
