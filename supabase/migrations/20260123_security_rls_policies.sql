-- Migration: Criar policies RLS para tabelas críticas
-- Data: 2026-01-23
-- Agente: database-architect (orquestrado)

-- ==========================================
-- 1. POLICY PARA INSPECTIONS (Isolamento por Organização)
-- ==========================================
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspections') THEN
        -- Remover policies existentes (se houver)
        DROP POLICY IF EXISTS "rls_inspections_select" ON public.inspections;
        DROP POLICY IF EXISTS "rls_inspections_insert" ON public.inspections;
        DROP POLICY IF EXISTS "rls_inspections_update" ON public.inspections;
        DROP POLICY IF EXISTS "rls_inspections_delete" ON public.inspections;
        
        -- Criar policies (usuário só vê inspeções da sua organização)
        CREATE POLICY "rls_inspections_select" ON public.inspections
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM public.users WHERE id = auth.uid()
                )
            );
        
        CREATE POLICY "rls_inspections_insert" ON public.inspections
            FOR INSERT WITH CHECK (
                organization_id IN (
                    SELECT organization_id FROM public.users WHERE id = auth.uid()
                )
            );
        
        CREATE POLICY "rls_inspections_update" ON public.inspections
            FOR UPDATE USING (
                organization_id IN (
                    SELECT organization_id FROM public.users WHERE id = auth.uid()
                )
            );
        
        CREATE POLICY "rls_inspections_delete" ON public.inspections
            FOR DELETE USING (
                organization_id IN (
                    SELECT organization_id FROM public.users WHERE id = auth.uid()
                )
                AND EXISTS (
                    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('sys_admin', 'org_admin')
                )
            );
        
        RAISE NOTICE 'Policies para inspections criadas com sucesso';
    END IF;
END $$;

-- ==========================================
-- 2. POLICY PARA USERS (Perfil próprio ou admin)
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        DROP POLICY IF EXISTS "rls_users_select" ON public.users;
        DROP POLICY IF EXISTS "rls_users_update" ON public.users;
        
        -- Usuário pode ver a si mesmo OU todos da sua org (se admin)
        CREATE POLICY "rls_users_select" ON public.users
            FOR SELECT USING (
                id = auth.uid()
                OR (
                    organization_id IN (
                        SELECT organization_id FROM public.users WHERE id = auth.uid()
                    )
                    AND EXISTS (
                        SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('sys_admin', 'org_admin')
                    )
                )
            );
        
        -- Usuário pode editar apenas a si mesmo (ou admin pode editar todos da org)
        CREATE POLICY "rls_users_update" ON public.users
            FOR UPDATE USING (
                id = auth.uid()
                OR (
                    organization_id IN (
                        SELECT organization_id FROM public.users WHERE id = auth.uid()
                    )
                    AND EXISTS (
                        SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('sys_admin', 'org_admin')
                    )
                )
            );
        
        RAISE NOTICE 'Policies para users criadas com sucesso';
    END IF;
END $$;

-- ==========================================
-- 3. POLICY PARA SESSION_LOG (Apenas admins)
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_log') THEN
        DROP POLICY IF EXISTS "rls_session_log_select" ON public.session_log;
        
        -- Apenas sys_admin pode ver logs de sessão
        CREATE POLICY "rls_session_log_select" ON public.session_log
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'sys_admin'
                )
            );
        
        RAISE NOTICE 'Policies para session_log criadas com sucesso';
    END IF;
END $$;

-- ==========================================
-- 4. CRIAR TABELA USER_SESSIONS (para tokens UUID)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

-- Index para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- RLS para user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_user_sessions_select" ON public.user_sessions;
CREATE POLICY "rls_user_sessions_select" ON public.user_sessions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "rls_user_sessions_insert" ON public.user_sessions;
CREATE POLICY "rls_user_sessions_insert" ON public.user_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "rls_user_sessions_delete" ON public.user_sessions;
CREATE POLICY "rls_user_sessions_delete" ON public.user_sessions
    FOR DELETE USING (user_id = auth.uid());

-- RAISE NOTICE removido pois estava fora de bloco DO/FUNCTION

