-- ============================================================================
-- MIGRATION: Fix RLS Security Vulnerabilities
-- Author: O Gatekeeper
-- Date: 30/01/2026
-- Fixes: SEC-001, SEC-002, SEC-004
-- ============================================================================

-- ============================================================================
-- SEC-001: FIX crm_activities RLS (CRÍTICO)
-- Problema: Policy usa USING (true) permitindo qualquer usuário ver tudo
-- Solução: Restringir acesso apenas a System Admins (CRM é exclusivo deles)
-- ============================================================================

-- Remover policies antigas inseguras
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON crm_activities;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON crm_activities;

-- Nova policy: Apenas System Admins podem ver atividades de CRM
CREATE POLICY "System Admins can view crm_activities" ON crm_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('sys_admin', 'system_admin')
        )
    );

-- Nova policy: Apenas System Admins podem inserir atividades de CRM
CREATE POLICY "System Admins can insert crm_activities" ON crm_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('sys_admin', 'system_admin')
        )
    );

-- Nova policy: Apenas System Admins podem atualizar atividades de CRM
CREATE POLICY "System Admins can update crm_activities" ON crm_activities
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('sys_admin', 'system_admin')
        )
    );

-- Nova policy: Apenas System Admins podem deletar atividades de CRM
CREATE POLICY "System Admins can delete crm_activities" ON crm_activities
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- SEC-002: FIX activity_log INSERT policy (ALTO)
-- Problema: INSERT permite qualquer authenticated user sem validar org
-- Solução: Manter INSERT aberto (necessário para logging), mas garantir que
--          o user_id seja sempre o auth.uid() atual
-- ============================================================================

-- Remover policy antiga
DROP POLICY IF EXISTS "Authenticated users can insert activity_log" ON activity_log;

-- Nova policy: INSERT apenas com user_id = auth.uid() (evita spoofing de logs)
CREATE POLICY "Authenticated users can insert own activity_log" ON activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Garante que o log é do próprio usuário
        user_id = auth.uid()
        OR
        -- OU é um System Admin (pode logar em nome de outros para auditoria)
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('sys_admin', 'system_admin')
        )
    );

-- ============================================================================
-- SEC-004: Adicionar organization_id em crm_activities (MÉDIO)
-- Problema: Tabela não tem FK direta para organization
-- Solução: Adicionar coluna para futuro suporte multi-tenant no CRM
-- ============================================================================

-- Adicionar coluna organization_id (nullable para retrocompatibilidade)
ALTER TABLE crm_activities
ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_organization_id ON crm_activities(organization_id);

-- Preencher organization_id baseado no lead (se possível)
-- NOTA: leads não tem organization_id, então deixamos NULL por ora
-- Quando CRM for multi-tenant, será necessário adicionar org em leads também

-- ============================================================================
-- COMENTÁRIOS DE AUDITORIA
-- ============================================================================

COMMENT ON POLICY "System Admins can view crm_activities" ON crm_activities IS
'[SEC-001] Corrigido em 30/01/2026 - Gatekeeper. Antes usava USING (true).';

COMMENT ON POLICY "System Admins can insert crm_activities" ON crm_activities IS
'[SEC-001] Corrigido em 30/01/2026 - Gatekeeper. Antes usava WITH CHECK (true).';

COMMENT ON POLICY "Authenticated users can insert own activity_log" ON activity_log IS
'[SEC-002] Corrigido em 30/01/2026 - Gatekeeper. Agora valida user_id = auth.uid().';

COMMENT ON COLUMN crm_activities.organization_id IS
'[SEC-004] Adicionado em 30/01/2026 - Gatekeeper. Para futuro suporte multi-tenant no CRM.';
