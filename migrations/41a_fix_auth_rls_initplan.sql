-- Migration 41a: Fix auth_rls_initplan issues
-- Wrap auth.* calls with (SELECT ...) to prevent re-evaluation per row

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
