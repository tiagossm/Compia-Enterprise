-- ============================================================================
-- MIGRATION: Standardize RLS to use auth.uid() instead of current_setting
-- Author: O Gatekeeper
-- Date: 30/01/2026
-- Fixes: SEC-003
-- ============================================================================
-- PROBLEMA: Algumas policies usam current_setting('app.current_user_id') que
--           requer que o middleware defina essa variável de sessão.
--           Outras usam auth.uid() que é nativo do Supabase Auth.
-- SOLUÇÃO: Padronizar todas as policies para usar auth.uid()
-- ============================================================================

-- ============================================================================
-- INSPECTIONS - Substituir current_setting por auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS inspection_tenant_isolation ON inspections;

CREATE POLICY inspection_tenant_isolation ON inspections
    FOR ALL
    USING (
        -- Usuário pertence à organização da inspeção
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
        -- OU é subsidiária de uma organização que o usuário gerencia
        OR organization_id IN (
            SELECT id FROM organizations WHERE parent_organization_id IN (
                SELECT managed_organization_id FROM users WHERE id = auth.uid()
            )
        )
        -- OU é System Admin
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- INSPECTION_ITEMS - Substituir current_setting por auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS inspection_items_tenant_isolation ON inspection_items;

CREATE POLICY inspection_items_tenant_isolation ON inspection_items
    FOR ALL
    USING (
        inspection_id IN (
            SELECT id FROM inspections WHERE organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- INSPECTION_MEDIA - Substituir current_setting por auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS inspection_media_tenant_isolation ON inspection_media;

CREATE POLICY inspection_media_tenant_isolation ON inspection_media
    FOR ALL
    USING (
        inspection_id IN (
            SELECT id FROM inspections WHERE organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- ACTION_ITEMS - Substituir current_setting por auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS action_items_tenant_isolation ON action_items;

CREATE POLICY action_items_tenant_isolation ON action_items
    FOR ALL
    USING (
        inspection_id IN (
            SELECT id FROM inspections WHERE organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- CHECKLIST_TEMPLATES - Substituir current_setting por auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS checklist_templates_tenant_isolation ON checklist_templates;

CREATE POLICY checklist_templates_tenant_isolation ON checklist_templates
    FOR ALL
    USING (
        -- Templates públicos são visíveis para todos
        is_public = true
        -- OU template pertence à organização do usuário
        OR organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
        -- OU é System Admin
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- COMENTÁRIOS DE AUDITORIA
-- ============================================================================

COMMENT ON POLICY inspection_tenant_isolation ON inspections IS
'[SEC-003] Padronizado em 30/01/2026 - Gatekeeper. Agora usa auth.uid() em vez de current_setting.';

COMMENT ON POLICY inspection_items_tenant_isolation ON inspection_items IS
'[SEC-003] Padronizado em 30/01/2026 - Gatekeeper. Agora usa auth.uid() em vez de current_setting.';

COMMENT ON POLICY inspection_media_tenant_isolation ON inspection_media IS
'[SEC-003] Padronizado em 30/01/2026 - Gatekeeper. Agora usa auth.uid() em vez de current_setting.';

COMMENT ON POLICY action_items_tenant_isolation ON action_items IS
'[SEC-003] Padronizado em 30/01/2026 - Gatekeeper. Agora usa auth.uid() em vez de current_setting.';

COMMENT ON POLICY checklist_templates_tenant_isolation ON checklist_templates IS
'[SEC-003] Padronizado em 30/01/2026 - Gatekeeper. Agora usa auth.uid() em vez de current_setting.';
