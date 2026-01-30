-- ============================================================================
-- APLICAR ESTE SQL DIRETAMENTE NO SUPABASE DASHBOARD
-- URL: https://supabase.com/dashboard/project/vjlvvmriqerfmztwtewa/sql/new
-- ============================================================================
-- INSTRUÇÕES:
-- 1. Copie TODO este arquivo
-- 2. Cole no SQL Editor do Supabase
-- 3. Clique em "Run" ou pressione Ctrl+Enter
-- 4. Aguarde completar (30-60 segundos)
-- 5. Verifique se não houve erros
-- ============================================================================

-- ============================================================================
-- PARTE 1: Criar função helper para RLS
-- ============================================================================

DROP FUNCTION IF EXISTS current_user_id();

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    -- Lê de request.jwt.claim.sub (definido por middleware e D1 wrapper)
    RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_id() IS
'Helper function para RLS policies. Retorna o user ID do contexto da request.
Funciona com queries do backend (via middleware/D1 wrapper).
Para queries do frontend, use COALESCE(auth.uid(), current_user_id())';

-- ============================================================================
-- PARTE 2: Remover políticas conflitantes
-- ============================================================================

-- Users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "System admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Org admins can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "rls_users_select" ON public.users;
DROP POLICY IF EXISTS "rls_users_update" ON public.users;

-- Organizations
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "System admins can view all organizations" ON public.organizations;

-- Inspections
DROP POLICY IF EXISTS "inspection_tenant_isolation" ON public.inspections;
DROP POLICY IF EXISTS "rls_inspections_select" ON public.inspections;
DROP POLICY IF EXISTS "rls_inspections_insert" ON public.inspections;
DROP POLICY IF EXISTS "rls_inspections_update" ON public.inspections;
DROP POLICY IF EXISTS "rls_inspections_delete" ON public.inspections;

-- Inspection items
DROP POLICY IF EXISTS "inspection_items_tenant_isolation" ON public.inspection_items;

-- Inspection media
DROP POLICY IF EXISTS "inspection_media_tenant_isolation" ON public.inspection_media;

-- Action items
DROP POLICY IF EXISTS "action_items_tenant_isolation" ON public.action_items;

-- Checklist templates
DROP POLICY IF EXISTS "checklist_templates_tenant_isolation" ON public.checklist_templates;

-- CRM Activities (overly permissive - will fix)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.crm_activities;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.crm_activities;

-- Plans (duplicate policies)
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
DROP POLICY IF EXISTS "Public read active plans" ON public.plans;
DROP POLICY IF EXISTS "Auth users read active plans" ON public.plans;
DROP POLICY IF EXISTS "SysAdmin full access plans" ON public.plans;

-- ============================================================================
-- PARTE 3: Criar políticas unificadas (híbridas)
-- ============================================================================

-- Pattern: COALESCE(auth.uid(), current_user_id())
-- Funciona no frontend (auth.uid()) E no backend (current_user_id())

-- ---------------------------------------------------------------------------
-- USERS TABLE
-- ---------------------------------------------------------------------------

-- Habilitar RLS (se ainda não estiver)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Ver próprio perfil
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (
        id = COALESCE(auth.uid(), current_user_id())
    );

-- Ver usuários da própria organização (se admin)
CREATE POLICY "users_select_org" ON public.users
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('org_admin', 'sys_admin', 'system_admin')
        )
    );

-- System admins veem todos
CREATE POLICY "users_select_sysadmin" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- Atualizar próprio perfil
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (
        id = COALESCE(auth.uid(), current_user_id())
    );

-- ---------------------------------------------------------------------------
-- ORGANIZATIONS TABLE
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Ver própria organização
CREATE POLICY "orgs_select_own" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
        )
        OR id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
        )
    );

-- System admins veem todas
CREATE POLICY "orgs_select_sysadmin" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- Admins atualizam sua org
CREATE POLICY "orgs_update_admin" ON public.organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('org_admin', 'sys_admin', 'system_admin')
        )
    );

-- ---------------------------------------------------------------------------
-- INSPECTIONS TABLE
-- ---------------------------------------------------------------------------

-- Ver inspeções da própria org
CREATE POLICY "inspections_select" ON public.inspections
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
        )
        OR organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- Inserir inspeções para própria org
CREATE POLICY "inspections_insert" ON public.inspections
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
        )
        OR organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
        )
    );

-- Atualizar inspeções da própria org
CREATE POLICY "inspections_update" ON public.inspections
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
        )
        OR organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
        )
    );

-- Apenas admins deletam
CREATE POLICY "inspections_delete" ON public.inspections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('org_admin', 'sys_admin', 'system_admin')
        )
        AND (
            organization_id IN (
                SELECT organization_id FROM public.users
                WHERE id = COALESCE(auth.uid(), current_user_id())
            )
            OR EXISTS (
                SELECT 1 FROM public.users
                WHERE id = COALESCE(auth.uid(), current_user_id())
                AND role IN ('sys_admin', 'system_admin')
            )
        )
    );

-- ---------------------------------------------------------------------------
-- INSPECTION_ITEMS, INSPECTION_MEDIA, ACTION_ITEMS
-- ---------------------------------------------------------------------------

-- Herdam acesso da inspeção pai
CREATE POLICY "inspection_items_all" ON public.inspection_items
    FOR ALL USING (
        inspection_id IN (
            SELECT id FROM public.inspections
            WHERE organization_id IN (
                SELECT organization_id FROM public.user_organizations
                WHERE user_id = COALESCE(auth.uid(), current_user_id())
            )
            OR organization_id IN (
                SELECT organization_id FROM public.users
                WHERE id = COALESCE(auth.uid(), current_user_id())
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "inspection_media_all" ON public.inspection_media
    FOR ALL USING (
        inspection_id IN (
            SELECT id FROM public.inspections
            WHERE organization_id IN (
                SELECT organization_id FROM public.user_organizations
                WHERE user_id = COALESCE(auth.uid(), current_user_id())
            )
            OR organization_id IN (
                SELECT organization_id FROM public.users
                WHERE id = COALESCE(auth.uid(), current_user_id())
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "action_items_all" ON public.action_items
    FOR ALL USING (
        inspection_id IN (
            SELECT id FROM public.inspections
            WHERE organization_id IN (
                SELECT organization_id FROM public.user_organizations
                WHERE user_id = COALESCE(auth.uid(), current_user_id())
            )
            OR organization_id IN (
                SELECT organization_id FROM public.users
                WHERE id = COALESCE(auth.uid(), current_user_id())
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ---------------------------------------------------------------------------
-- CHECKLIST_TEMPLATES
-- ---------------------------------------------------------------------------

CREATE POLICY "templates_select" ON public.checklist_templates
    FOR SELECT USING (
        is_public = true
        OR organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
        )
        OR organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "templates_insert" ON public.checklist_templates
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
        )
    );

CREATE POLICY "templates_update" ON public.checklist_templates
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ---------------------------------------------------------------------------
-- CRM_ACTIVITIES (FIX: era muito permissivo)
-- ---------------------------------------------------------------------------

CREATE POLICY "crm_activities_select" ON public.crm_activities
    FOR SELECT USING (
        lead_id IN (
            SELECT id FROM public.leads
            WHERE owner_id = COALESCE(auth.uid(), current_user_id())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "crm_activities_insert" ON public.crm_activities
    FOR INSERT WITH CHECK (
        lead_id IN (
            SELECT id FROM public.leads
            WHERE owner_id = COALESCE(auth.uid(), current_user_id())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------

CREATE POLICY "leads_select" ON public.leads
    FOR SELECT USING (
        owner_id = COALESCE(auth.uid(), current_user_id())
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "leads_insert" ON public.leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin', 'org_admin')
        )
    );

-- ---------------------------------------------------------------------------
-- PLANS (consolidar duplicatas)
-- ---------------------------------------------------------------------------

CREATE POLICY "plans_select_public" ON public.plans
    FOR SELECT USING (
        is_active = true AND is_public = true
    );

CREATE POLICY "plans_select_auth" ON public.plans
    FOR SELECT USING (
        is_active = true
        AND (auth.uid() IS NOT NULL OR current_user_id() IS NOT NULL)
    );

CREATE POLICY "plans_all_sysadmin" ON public.plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ---------------------------------------------------------------------------
-- TABELAS FINANCEIRAS
-- ---------------------------------------------------------------------------

CREATE POLICY "subscriptions_select" ON public.subscriptions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('owner', 'org_admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "invoices_select" ON public.invoices
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('owner', 'org_admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "usage_metrics_select" ON public.usage_metrics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('owner', 'org_admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

CREATE POLICY "credits_ledger_select" ON public.ai_credits_ledger
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations
            WHERE user_id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('owner', 'org_admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = COALESCE(auth.uid(), current_user_id())
            AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- PARTE 4: Índices para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role)
    WHERE role IN ('sys_admin', 'system_admin', 'org_admin');

CREATE INDEX IF NOT EXISTS idx_user_orgs_composite ON public.user_organizations(user_id, organization_id, role);

CREATE INDEX IF NOT EXISTS idx_inspections_org_id ON public.inspections(organization_id);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);

-- ============================================================================
-- VERIFICAÇÃO: Execute esta query para confirmar que funcionou
-- ============================================================================

-- Deve retornar 'current_user_id'
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'current_user_id';

-- Deve retornar 4 políticas para users
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

-- ============================================================================
-- FIM - Depois de executar, faça logout/login na aplicação
-- ============================================================================
