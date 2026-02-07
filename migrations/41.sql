-- Migration 41: Fix Supabase Linter Issues
-- Fixes: auth_rls_initplan, multiple_permissive_policies, duplicate_index

-- ============================================================================
-- PART 1: Fix auth_rls_initplan - Wrap auth.* calls with (select ...)
-- ============================================================================

-- Drop and recreate policies with optimized auth calls
-- This prevents re-evaluation of auth functions for each row

-- system_email_config policies
DROP POLICY IF EXISTS "SysAdmin Access" ON public.system_email_config;
CREATE POLICY "SysAdmin Access" ON public.system_email_config
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

-- users policies
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (
    id = (SELECT auth.uid())
  );

-- inspection_media policies
DROP POLICY IF EXISTS "Delete own org inspection_media" ON public.inspection_media;
CREATE POLICY "Delete own org inspection_media" ON public.inspection_media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_media.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- action_items policies
DROP POLICY IF EXISTS "rls_action_items_select" ON public.action_items;
CREATE POLICY "rls_action_items_select" ON public.action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = action_items.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- action_plans policies
DROP POLICY IF EXISTS "rls_action_plans_select" ON public.action_plans;
CREATE POLICY "rls_action_plans_select" ON public.action_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = action_plans.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- system_settings policies
DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
CREATE POLICY "system_settings_select" ON public.system_settings
  FOR SELECT USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

DROP POLICY IF EXISTS "system_settings_update" ON public.system_settings;
CREATE POLICY "system_settings_update" ON public.system_settings
  FOR UPDATE USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

DROP POLICY IF EXISTS "system_settings_insert" ON public.system_settings;
CREATE POLICY "system_settings_insert" ON public.system_settings
  FOR INSERT WITH CHECK (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

DROP POLICY IF EXISTS "system_settings_delete" ON public.system_settings;
CREATE POLICY "system_settings_delete" ON public.system_settings
  FOR DELETE USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

-- ai_usage_logs policies
DROP POLICY IF EXISTS "System Admin can view all ai logs" ON public.ai_usage_logs;
CREATE POLICY "System Admin can view all ai logs" ON public.ai_usage_logs
  FOR SELECT USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

DROP POLICY IF EXISTS "Users can insert logs" ON public.ai_usage_logs;
CREATE POLICY "Users can insert logs" ON public.ai_usage_logs
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- leads policies
DROP POLICY IF EXISTS "System Admin can manage leads" ON public.leads;
CREATE POLICY "System Admin can manage leads" ON public.leads
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

-- inspection_logs policies
DROP POLICY IF EXISTS "Read own org inspection_logs" ON public.inspection_logs;
CREATE POLICY "Read own org inspection_logs" ON public.inspection_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_logs.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Insert inspection_logs for own org" ON public.inspection_logs;
CREATE POLICY "Insert inspection_logs for own org" ON public.inspection_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_logs.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- subscriptions policies
DROP POLICY IF EXISTS "Org admins see own subscription" ON public.subscriptions;
CREATE POLICY "Org admins see own subscription" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = subscriptions.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- invoices policies
DROP POLICY IF EXISTS "Org admins see own invoices" ON public.invoices;
CREATE POLICY "Org admins see own invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      JOIN public.users u ON u.organization_id = s.organization_id
      WHERE s.id = invoices.subscription_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- usage_metrics policies
DROP POLICY IF EXISTS "Org admins see own usage" ON public.usage_metrics;
CREATE POLICY "Org admins see own usage" ON public.usage_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = usage_metrics.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- organizations policies
DROP POLICY IF EXISTS "orgs_select_own" ON public.organizations;
CREATE POLICY "orgs_select_own" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = organizations.id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "orgs_select_sysadmin" ON public.organizations;
CREATE POLICY "orgs_select_sysadmin" ON public.organizations
  FOR SELECT USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

DROP POLICY IF EXISTS "orgs_update_admin" ON public.organizations;
CREATE POLICY "orgs_update_admin" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = organizations.id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- inspection_atas policies
DROP POLICY IF EXISTS "Users can view ATAs from their organization" ON public.inspection_atas;
CREATE POLICY "Users can view ATAs from their organization" ON public.inspection_atas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_atas.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert ATAs for their organization" ON public.inspection_atas;
CREATE POLICY "Users can insert ATAs for their organization" ON public.inspection_atas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_atas.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update ATAs from their organization" ON public.inspection_atas;
CREATE POLICY "Users can update ATAs from their organization" ON public.inspection_atas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_atas.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete ATAs they created" ON public.inspection_atas;
CREATE POLICY "Users can delete ATAs they created" ON public.inspection_atas
  FOR DELETE USING (
    created_by = (SELECT auth.uid())
  );

-- recurring_schedules policies
DROP POLICY IF EXISTS "Users can view org schedules" ON public.recurring_schedules;
CREATE POLICY "Users can view org schedules" ON public.recurring_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = recurring_schedules.organization_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage schedules" ON public.recurring_schedules;
CREATE POLICY "Admins can manage schedules" ON public.recurring_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = recurring_schedules.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- checklist_templates policies
DROP POLICY IF EXISTS "templates_select" ON public.checklist_templates;
CREATE POLICY "templates_select" ON public.checklist_templates
  FOR SELECT USING (
    visibility = 'public' OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checklist_templates.organization_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "templates_insert" ON public.checklist_templates;
CREATE POLICY "templates_insert" ON public.checklist_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checklist_templates.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "templates_update" ON public.checklist_templates;
CREATE POLICY "templates_update" ON public.checklist_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checklist_templates.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- crm_activities policies
DROP POLICY IF EXISTS "crm_activities_select" ON public.crm_activities;
CREATE POLICY "crm_activities_select" ON public.crm_activities
  FOR SELECT USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

DROP POLICY IF EXISTS "crm_activities_insert" ON public.crm_activities;
CREATE POLICY "crm_activities_insert" ON public.crm_activities
  FOR INSERT WITH CHECK (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

-- inspection_ata_segments policies
DROP POLICY IF EXISTS "Users can view segments from their ATAs" ON public.inspection_ata_segments;
CREATE POLICY "Users can view segments from their ATAs" ON public.inspection_ata_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspection_atas ia
      JOIN public.inspections i ON i.id = ia.inspection_id
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE ia.id = inspection_ata_segments.ata_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert segments to their ATAs" ON public.inspection_ata_segments;
CREATE POLICY "Users can insert segments to their ATAs" ON public.inspection_ata_segments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_atas ia
      JOIN public.inspections i ON i.id = ia.inspection_id
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE ia.id = inspection_ata_segments.ata_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update segments from their ATAs" ON public.inspection_ata_segments;
CREATE POLICY "Users can update segments from their ATAs" ON public.inspection_ata_segments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inspection_atas ia
      JOIN public.inspections i ON i.id = ia.inspection_id
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE ia.id = inspection_ata_segments.ata_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete segments from their ATAs" ON public.inspection_ata_segments;
CREATE POLICY "Users can delete segments from their ATAs" ON public.inspection_ata_segments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.inspection_atas ia
      WHERE ia.id = inspection_ata_segments.ata_id
      AND ia.created_by = (SELECT auth.uid())
    )
  );

-- inspections policies
DROP POLICY IF EXISTS "inspections_update" ON public.inspections;
CREATE POLICY "inspections_update" ON public.inspections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = inspections.organization_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- ai_credits_ledger policies
DROP POLICY IF EXISTS "Admins view ledger" ON public.ai_credits_ledger;
CREATE POLICY "Admins view ledger" ON public.ai_credits_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = ai_credits_ledger.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- coupons policies
DROP POLICY IF EXISTS "SysAdmin full access coupons" ON public.coupons;
CREATE POLICY "SysAdmin full access coupons" ON public.coupons
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

-- coupon_redemptions policies
DROP POLICY IF EXISTS "SysAdmin full access coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "SysAdmin full access coupon_redemptions" ON public.coupon_redemptions
  FOR ALL USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

DROP POLICY IF EXISTS "Org admins see own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Org admins see own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = coupon_redemptions.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- checklists policies
DROP POLICY IF EXISTS "insert_checklists_by_creator" ON public.checklists;
CREATE POLICY "insert_checklists_by_creator" ON public.checklists
  FOR INSERT WITH CHECK (
    created_by = (SELECT auth.uid())
  );

-- user_achievements policies
DROP POLICY IF EXISTS "user_achievements_select" ON public.user_achievements;
CREATE POLICY "user_achievements_select" ON public.user_achievements
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

-- user_points_history policies
DROP POLICY IF EXISTS "user_points_history_select" ON public.user_points_history;
CREATE POLICY "user_points_history_select" ON public.user_points_history
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

-- inspection_items policies
DROP POLICY IF EXISTS "Org users can read inspection_items" ON public.inspection_items;
CREATE POLICY "Org users can read inspection_items" ON public.inspection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_items.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org users can insert inspection_items" ON public.inspection_items;
CREATE POLICY "Org users can insert inspection_items" ON public.inspection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_items.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org users can update inspection_items" ON public.inspection_items;
CREATE POLICY "Org users can update inspection_items" ON public.inspection_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_items.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Inspection creator can delete inspection_items" ON public.inspection_items;
CREATE POLICY "Inspection creator can delete inspection_items" ON public.inspection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_items.inspection_id
      AND i.created_by = (SELECT auth.uid())
    )
  );

-- checklist_fields policies for template organization
DROP POLICY IF EXISTS "Enable select for users based on template organization" ON public.checklist_fields;
CREATE POLICY "Enable select for users based on template organization" ON public.checklist_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates ct
      JOIN public.users u ON u.organization_id = ct.organization_id
      WHERE ct.id = checklist_fields.template_id
      AND u.id = (SELECT auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.checklist_templates ct
      WHERE ct.id = checklist_fields.template_id
      AND ct.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "Enable insert for users based on template organization" ON public.checklist_fields;
CREATE POLICY "Enable insert for users based on template organization" ON public.checklist_fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_templates ct
      JOIN public.users u ON u.organization_id = ct.organization_id
      WHERE ct.id = checklist_fields.template_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Enable update for users based on template organization" ON public.checklist_fields;
CREATE POLICY "Enable update for users based on template organization" ON public.checklist_fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates ct
      JOIN public.users u ON u.organization_id = ct.organization_id
      WHERE ct.id = checklist_fields.template_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Enable delete for users based on template organization" ON public.checklist_fields;
CREATE POLICY "Enable delete for users based on template organization" ON public.checklist_fields
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates ct
      JOIN public.users u ON u.organization_id = ct.organization_id
      WHERE ct.id = checklist_fields.template_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- inspection_shares policies
DROP POLICY IF EXISTS "User can manage their own inspection shares" ON public.inspection_shares;
CREATE POLICY "User can manage their own inspection shares" ON public.inspection_shares
  FOR ALL USING (
    created_by = (SELECT auth.uid())
  );

-- inspection_media policies (Creator or inspection owner)
DROP POLICY IF EXISTS "Creator or inspection owner can manage media" ON public.inspection_media;
CREATE POLICY "Creator or inspection owner can manage media" ON public.inspection_media
  FOR ALL USING (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_media.inspection_id
      AND i.created_by = (SELECT auth.uid())
    )
  );

-- inspection_reopening_history policies
DROP POLICY IF EXISTS "Access if user belongs to inspection's organization" ON public.inspection_reopening_history;
CREATE POLICY "Access if user belongs to inspection's organization" ON public.inspection_reopening_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_reopening_history.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- checklist_folders policies
DROP POLICY IF EXISTS "Enable select for users based on organization" ON public.checklist_folders;
CREATE POLICY "Enable select for users based on organization" ON public.checklist_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checklist_folders.organization_id
      AND u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Enable insert for users based on organization" ON public.checklist_folders;
CREATE POLICY "Enable insert for users based on organization" ON public.checklist_folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checklist_folders.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Enable update for users based on organization" ON public.checklist_folders;
CREATE POLICY "Enable update for users based on organization" ON public.checklist_folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checklist_folders.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Enable delete for users based on organization" ON public.checklist_folders;
CREATE POLICY "Enable delete for users based on organization" ON public.checklist_folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checklist_folders.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- inspection_status_history policies
DROP POLICY IF EXISTS "Usuários podem ver histórico de status das inspeções da sua" ON public.inspection_status_history;
CREATE POLICY "Usuários podem ver histórico de status das inspeções da sua" ON public.inspection_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.users u ON u.organization_id = i.organization_id
      WHERE i.id = inspection_status_history.inspection_id
      AND u.id = (SELECT auth.uid())
    )
  );

-- user_credentials policies
DROP POLICY IF EXISTS "user_credentials_insert" ON public.user_credentials;
CREATE POLICY "user_credentials_insert" ON public.user_credentials
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "user_credentials_update" ON public.user_credentials;
CREATE POLICY "user_credentials_update" ON public.user_credentials
  FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "user_credentials_delete" ON public.user_credentials;
CREATE POLICY "user_credentials_delete" ON public.user_credentials
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
  );

-- notifications policies
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
  );

-- inspection_status_history duplicate policy
DROP POLICY IF EXISTS "Usuários podem ver histórico de status de inspeções da sua " ON public.inspection_status_history;

-- session_log policies
DROP POLICY IF EXISTS "rls_session_log_select" ON public.session_log;
CREATE POLICY "rls_session_log_select" ON public.session_log
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

-- user_sessions policies
DROP POLICY IF EXISTS "rls_user_sessions_select" ON public.user_sessions;
CREATE POLICY "rls_user_sessions_select" ON public.user_sessions
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "rls_user_sessions_insert" ON public.user_sessions;
CREATE POLICY "rls_user_sessions_insert" ON public.user_sessions
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "rls_user_sessions_delete" ON public.user_sessions;
CREATE POLICY "rls_user_sessions_delete" ON public.user_sessions
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
  );

-- checkout_attempts policies
DROP POLICY IF EXISTS "rls_checkout_attempts_select" ON public.checkout_attempts;
CREATE POLICY "rls_checkout_attempts_select" ON public.checkout_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.organization_id = checkout_attempts.organization_id
      AND u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'owner')
    )
  );

-- webhook_events policies
DROP POLICY IF EXISTS "rls_webhook_events_select" ON public.webhook_events;
CREATE POLICY "rls_webhook_events_select" ON public.webhook_events
  FOR SELECT USING (
    (SELECT auth.jwt() ->> 'user_metadata'::text)::jsonb ->> 'is_sys_admin'::text = 'true'::text
  );

-- user_gamification policies
DROP POLICY IF EXISTS "user_gamification_select" ON public.user_gamification;
CREATE POLICY "user_gamification_select" ON public.user_gamification
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

-- ============================================================================
-- PART 2: Remove duplicate policies (multiple_permissive_policies)
-- ============================================================================

-- These policies are duplicates and should be removed
-- Keeping only the most restrictive/comprehensive version

-- action_items - remove duplicate policies
DROP POLICY IF EXISTS "action_items_delete_policy" ON public.action_items;
DROP POLICY IF EXISTS "action_items_insert_policy" ON public.action_items;
DROP POLICY IF EXISTS "action_items_select_policy" ON public.action_items;
DROP POLICY IF EXISTS "action_items_update_policy" ON public.action_items;
DROP POLICY IF EXISTS "action_items_delete" ON public.action_items;
DROP POLICY IF EXISTS "action_items_insert" ON public.action_items;
DROP POLICY IF EXISTS "action_items_select" ON public.action_items;
DROP POLICY IF EXISTS "action_items_update" ON public.action_items;

-- Keep only rls_action_items_* policies for action_items
-- These are already fixed above with (select auth.uid())

-- activity_log - remove duplicates
DROP POLICY IF EXISTS "insert_activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "select_activity_log" ON public.activity_log;
-- Keep activity_log_insert and activity_log_select

-- ai_credits_ledger - remove duplicates
DROP POLICY IF EXISTS "select_ai_credits_ledger" ON public.ai_credits_ledger;
DROP POLICY IF EXISTS "credits_ledger_select" ON public.ai_credits_ledger;
-- Keep "Admins view ledger"

-- ai_usage_log - remove duplicates
DROP POLICY IF EXISTS "insert_ai_usage_log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "select_ai_usage_log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "ai_usage_log_insert" ON public.ai_usage_log;
DROP POLICY IF EXISTS "ai_usage_log_select" ON public.ai_usage_log;

-- ai_usage_logs - remove duplicates
DROP POLICY IF EXISTS "insert_ai_usage_logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "select_ai_usage_logs" ON public.ai_usage_logs;

-- checklist_fields - remove duplicates for checklist-based policies
DROP POLICY IF EXISTS "checklist_fields_select" ON public.checklist_fields;
DROP POLICY IF EXISTS "checklist_fields_insert" ON public.checklist_fields;
DROP POLICY IF EXISTS "checklist_fields_update" ON public.checklist_fields;
DROP POLICY IF EXISTS "checklist_fields_delete" ON public.checklist_fields;
-- Keep "Enable * for users based on organization" and template organization policies

-- checklist_folders - remove duplicates
DROP POLICY IF EXISTS "checklist_folders_select" ON public.checklist_folders;
DROP POLICY IF EXISTS "checklist_folders_insert" ON public.checklist_folders;
DROP POLICY IF EXISTS "checklist_folders_update" ON public.checklist_folders;
DROP POLICY IF EXISTS "checklist_folders_delete" ON public.checklist_folders;
-- Keep "Enable * for users based on organization"

-- checklist_templates - remove duplicates
DROP POLICY IF EXISTS "checklist_templates_select" ON public.checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_insert" ON public.checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_update" ON public.checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_delete" ON public.checklist_templates;
DROP POLICY IF EXISTS "rls_checklist_templates_select" ON public.checklist_templates;
DROP POLICY IF EXISTS "rls_checklist_templates_insert" ON public.checklist_templates;
DROP POLICY IF EXISTS "rls_checklist_templates_update" ON public.checklist_templates;
DROP POLICY IF EXISTS "rls_checklist_templates_delete" ON public.checklist_templates;
-- Keep templates_* and "Enable * for users based on organization"

-- checklists - remove duplicates
DROP POLICY IF EXISTS "delete_checklists_admins" ON public.checklists;
DROP POLICY IF EXISTS "delete_own_checklists" ON public.checklists;
DROP POLICY IF EXISTS "select_checklists_same_org" ON public.checklists;
DROP POLICY IF EXISTS "update_checklists_admins" ON public.checklists;
-- Keep "Enable * for users based on organization" and insert_checklists_by_creator

-- checkout_attempts - remove duplicates
DROP POLICY IF EXISTS "select_checkout_attempts" ON public.checkout_attempts;
DROP POLICY IF EXISTS "insert_checkout_attempts" ON public.checkout_attempts;
DROP POLICY IF EXISTS "update_checkout_attempts" ON public.checkout_attempts;
DROP POLICY IF EXISTS "delete_checkout_attempts" ON public.checkout_attempts;
DROP POLICY IF EXISTS "rls_checkout_attempts_insert" ON public.checkout_attempts;
-- Keep rls_checkout_attempts_select

-- coupon_redemptions - remove duplicates
DROP POLICY IF EXISTS "select_coupon_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "insert_coupon_redemptions" ON public.coupon_redemptions;
-- Keep "SysAdmin full access coupon_redemptions" and "Org admins see own redemptions"

-- coupons - remove "Auth users read active coupons" if too permissive
-- Keep "SysAdmin full access coupons"

-- crm_activities - remove duplicates
DROP POLICY IF EXISTS "select_crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "insert_crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "update_crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "delete_crm_activities" ON public.crm_activities;
-- Keep crm_activities_select and crm_activities_insert

-- inspection_ata_segments - remove duplicates
DROP POLICY IF EXISTS "Org users can read inspection_ata_segments" ON public.inspection_ata_segments;
DROP POLICY IF EXISTS "Org users can insert inspection_ata_segments" ON public.inspection_ata_segments;
DROP POLICY IF EXISTS "Org users can update inspection_ata_segments" ON public.inspection_ata_segments;
DROP POLICY IF EXISTS "Owner can delete inspection_ata_segments" ON public.inspection_ata_segments;
DROP POLICY IF EXISTS "temp_allow_authenticated" ON public.inspection_ata_segments;
-- Keep "Users can * segments from/to their ATAs"

-- inspection_atas - remove duplicates
DROP POLICY IF EXISTS "inspection_atas_select" ON public.inspection_atas;
DROP POLICY IF EXISTS "inspection_atas_insert" ON public.inspection_atas;
DROP POLICY IF EXISTS "inspection_atas_update" ON public.inspection_atas;
DROP POLICY IF EXISTS "inspection_atas_delete" ON public.inspection_atas;
DROP POLICY IF EXISTS "Org users can access their inspection_atas" ON public.inspection_atas;
DROP POLICY IF EXISTS "Org users can insert their inspection_atas" ON public.inspection_atas;
DROP POLICY IF EXISTS "Org users can update their inspection_atas" ON public.inspection_atas;
DROP POLICY IF EXISTS "Owner can delete inspection_atas" ON public.inspection_atas;
DROP POLICY IF EXISTS "temp_allow_all_insert" ON public.inspection_atas;
DROP POLICY IF EXISTS "temp_allow_all_select" ON public.inspection_atas;
DROP POLICY IF EXISTS "temp_allow_all_update" ON public.inspection_atas;
DROP POLICY IF EXISTS "temp_allow_authenticated" ON public.inspection_atas;
-- Keep "Users can * ATAs from/for their organization" and "Users can delete ATAs they created"

-- inspection_items - remove duplicates
DROP POLICY IF EXISTS "inspection_items_select" ON public.inspection_items;
DROP POLICY IF EXISTS "inspection_items_insert" ON public.inspection_items;
DROP POLICY IF EXISTS "inspection_items_update" ON public.inspection_items;
DROP POLICY IF EXISTS "inspection_items_delete" ON public.inspection_items;
DROP POLICY IF EXISTS "rls_inspection_items_select" ON public.inspection_items;
DROP POLICY IF EXISTS "rls_inspection_items_insert" ON public.inspection_items;
DROP POLICY IF EXISTS "rls_inspection_items_update" ON public.inspection_items;
DROP POLICY IF EXISTS "rls_inspection_items_delete" ON public.inspection_items;
DROP POLICY IF EXISTS "Read own or org inspection_items" ON public.inspection_items;
DROP POLICY IF EXISTS "Insert inspection_items for own org" ON public.inspection_items;
DROP POLICY IF EXISTS "Update own org inspection_items" ON public.inspection_items;
DROP POLICY IF EXISTS "Delete own org inspection_items" ON public.inspection_items;
-- Keep "Org users can * inspection_items" and "Inspection creator can delete inspection_items"

-- inspection_logs - remove duplicates
DROP POLICY IF EXISTS "inspection_logs_select" ON public.inspection_logs;
DROP POLICY IF EXISTS "inspection_logs_insert" ON public.inspection_logs;
DROP POLICY IF EXISTS "Usuários podem ver logs de inspeções da sua organização" ON public.inspection_logs;
-- Keep "Read own org inspection_logs" and "Insert inspection_logs for own org"

-- inspection_media - remove duplicates
DROP POLICY IF EXISTS "inspection_media_select" ON public.inspection_media;
DROP POLICY IF EXISTS "inspection_media_insert" ON public.inspection_media;
DROP POLICY IF EXISTS "inspection_media_update" ON public.inspection_media;
DROP POLICY IF EXISTS "inspection_media_delete" ON public.inspection_media;
DROP POLICY IF EXISTS "rls_inspection_media_select" ON public.inspection_media;
DROP POLICY IF EXISTS "rls_inspection_media_insert" ON public.inspection_media;
DROP POLICY IF EXISTS "rls_inspection_media_update" ON public.inspection_media;
DROP POLICY IF EXISTS "rls_inspection_media_delete" ON public.inspection_media;
DROP POLICY IF EXISTS "Read own org inspection_media" ON public.inspection_media;
DROP POLICY IF EXISTS "Insert inspection_media for own org" ON public.inspection_media;
DROP POLICY IF EXISTS "Update own org inspection_media" ON public.inspection_media;
DROP POLICY IF EXISTS "Delete own org inspection_media" ON public.inspection_media;
-- Keep "Creator or inspection owner can manage media"

-- inspection_reopening_history - remove duplicates
DROP POLICY IF EXISTS "inspection_reopening_history_select" ON public.inspection_reopening_history;
DROP POLICY IF EXISTS "inspection_reopening_history_insert" ON public.inspection_reopening_history;
-- Keep "Access if user belongs to inspection's organization"

-- inspection_shares - remove duplicates
DROP POLICY IF EXISTS "inspection_shares_select" ON public.inspection_shares;
DROP POLICY IF EXISTS "inspection_shares_insert" ON public.inspection_shares;
DROP POLICY IF EXISTS "inspection_shares_delete" ON public.inspection_shares;
DROP POLICY IF EXISTS "Access via active share_token" ON public.inspection_shares;
-- Keep "User can manage their own inspection shares"

-- inspection_status_history - remove duplicate
DROP POLICY IF EXISTS "inspection_status_history_select" ON public.inspection_status_history;
-- Keep "Usuários podem ver histórico de status das inspeções da sua"

-- inspections - remove duplicates
DROP POLICY IF EXISTS "inspections_select" ON public.inspections;
DROP POLICY IF EXISTS "inspections_insert" ON public.inspections;
DROP POLICY IF EXISTS "inspections_update" ON public.inspections;
DROP POLICY IF EXISTS "inspections_delete" ON public.inspections;
DROP POLICY IF EXISTS "inspections_select_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_insert_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_update_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_delete_policy" ON public.inspections;
DROP POLICY IF EXISTS "select_own_inspections" ON public.inspections;
DROP POLICY IF EXISTS "insert_own_inspections" ON public.inspections;
DROP POLICY IF EXISTS "update_own_inspections" ON public.inspections;
-- Keep rls_inspections_* policies

-- invoices - remove duplicates
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "select_invoices" ON public.invoices;
-- Keep "Org admins see own invoices"

-- leads - remove duplicates
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
-- Keep "System Admin can manage leads"

-- notifications - remove duplicates
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
-- Keep notifications_update and notifications_delete

-- plans - remove duplicates
DROP POLICY IF EXISTS "plans_select_public" ON public.plans;
-- Keep plans_all_sysadmin and plans_select_auth

-- subscriptions - remove duplicates
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
DROP POLICY IF EXISTS "select_subscriptions" ON public.subscriptions;
-- Keep "Org admins see own subscription"

-- usage_metrics - remove duplicates
DROP POLICY IF EXISTS "usage_metrics_select" ON public.usage_metrics;
DROP POLICY IF EXISTS "select_usage_metrics" ON public.usage_metrics;
-- Keep "Org admins see own usage"

-- user_credentials - remove duplicates
DROP POLICY IF EXISTS "user_credentials_select" ON public.user_credentials;
-- Keep user_credentials_insert, update, delete

-- user_invitations - remove duplicate
DROP POLICY IF EXISTS "user_invitations_select" ON public.user_invitations;

-- user_organizations - remove duplicate
DROP POLICY IF EXISTS "user_organizations_select" ON public.user_organizations;

-- ============================================================================
-- PART 3: Remove duplicate indexes
-- ============================================================================

-- action_items - drop duplicate
DROP INDEX IF EXISTS public.idx_action_items_inspection;
-- Keep idx_action_items_inspection_id

-- activity_log - drop duplicate
DROP INDEX IF EXISTS public.idx_activity_log_org_id;
-- Keep idx_activity_log_organization_id

-- checklist_templates - drop duplicate
DROP INDEX IF EXISTS public.idx_checklist_templates_org_id;
-- Keep idx_checklist_templates_organization_id

-- inspection_items - drop duplicate
DROP INDEX IF EXISTS public.idx_inspection_items_inspection;
-- Keep idx_inspection_items_inspection_id

-- inspection_media - drop duplicate
DROP INDEX IF EXISTS public.idx_inspection_media_inspection;
-- Keep idx_inspection_media_inspection_id

-- inspections - drop duplicates (keeping the most explicit one)
DROP INDEX IF EXISTS public.idx_inspections_org_id;
DROP INDEX IF EXISTS public.idx_inspections_organization;
-- Keep idx_inspections_organization_id

-- users - drop duplicate
DROP INDEX IF EXISTS public.idx_users_organization;
-- Keep idx_users_organization_id

-- ============================================================================
-- END OF MIGRATION 41
-- ============================================================================
