-- ============================================================================
-- Migration: Sistema de Convites
-- Data: 2026-02-05
-- Propósito: Criar tabela organization_invitations com RLS e função de validação
-- ============================================================================

-- 1. Criar tabela de convites
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'inspector',
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id),
    resend_count INT DEFAULT 0,
    last_resent_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT false,
    email_error TEXT,
    
    -- Evita duplicatas: mesmo email na mesma org com status pendente
    CONSTRAINT unique_pending_invitation UNIQUE (organization_id, email, status)
);

-- Comentários
COMMENT ON TABLE public.organization_invitations IS 'Convites para usuários ingressarem em organizações';
COMMENT ON COLUMN public.organization_invitations.token IS 'Token seguro - NUNCA expor via SELECT normal';
COMMENT ON COLUMN public.organization_invitations.status IS 'pending, accepted, expired, revoked';

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.organization_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org_status ON public.organization_invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON public.organization_invitations(expires_at) WHERE status = 'pending';

-- 3. Adicionar max_users à organizations (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'max_users'
    ) THEN
        ALTER TABLE public.organizations ADD COLUMN max_users INT DEFAULT 5;
    END IF;
END $$;

-- 4. Habilitar RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Policies RLS
-- SELECT: OrgAdmin vê sua org, SysAdmin vê tudo
DROP POLICY IF EXISTS "invitations_select" ON public.organization_invitations;
CREATE POLICY "invitations_select" ON public.organization_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = COALESCE(auth.uid(), current_user_id())
            AND (
                u.role IN ('sys_admin', 'system_admin')
                OR (u.role = 'org_admin' AND u.managed_organization_id = organization_invitations.organization_id)
            )
        )
    );

-- INSERT: OrgAdmin para sua org
DROP POLICY IF EXISTS "invitations_insert" ON public.organization_invitations;
CREATE POLICY "invitations_insert" ON public.organization_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = COALESCE(auth.uid(), current_user_id())
            AND (
                u.role IN ('sys_admin', 'system_admin')
                OR (u.role = 'org_admin' AND u.managed_organization_id = organization_invitations.organization_id)
            )
        )
    );

-- UPDATE: Revogar/Reenviar
DROP POLICY IF EXISTS "invitations_update" ON public.organization_invitations;
CREATE POLICY "invitations_update" ON public.organization_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = COALESCE(auth.uid(), current_user_id())
            AND (
                u.role IN ('sys_admin', 'system_admin')
                OR (u.role = 'org_admin' AND u.managed_organization_id = organization_invitations.organization_id)
            )
        )
    );

-- 6. Função privilegiada para validar token (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token TEXT)
RETURNS TABLE(
    invitation_id UUID,
    organization_id BIGINT,
    email TEXT,
    role TEXT,
    organization_name TEXT,
    expires_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.organization_id,
        i.email,
        i.role,
        o.name,
        i.expires_at
    FROM public.organization_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE i.token = p_token
      AND i.status = 'pending'
      AND i.expires_at > NOW();
END;
$$;

COMMENT ON FUNCTION public.validate_invitation_token IS 'Valida token de convite - SECURITY DEFINER para não expor token';

-- 7. Função para aceitar convite
CREATE OR REPLACE FUNCTION public.accept_invitation(
    p_token TEXT,
    p_user_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_invitation RECORD;
    v_user RECORD;
    v_result JSON;
BEGIN
    -- Buscar convite válido
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE token = p_token
      AND status = 'pending'
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'invalid_or_expired_token');
    END IF;
    
    -- Buscar usuário
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'user_not_found');
    END IF;
    
    -- Verificar se email confere
    IF LOWER(v_user.email) != LOWER(v_invitation.email) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'email_mismatch',
            'expected_email', v_invitation.email
        );
    END IF;
    
    -- Vincular usuário à organização (multi-org via user_organizations)
    INSERT INTO public.user_organizations (user_id, organization_id, role, created_at)
    VALUES (p_user_id, v_invitation.organization_id, v_invitation.role, NOW())
    ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role;
    
    -- Se usuário não tem organization_id principal, definir
    IF v_user.organization_id IS NULL THEN
        UPDATE public.users 
        SET organization_id = v_invitation.organization_id,
            role = v_invitation.role,
            approval_status = 'approved'
        WHERE id = p_user_id;
    END IF;
    
    -- Marcar convite como aceito
    UPDATE public.organization_invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by = p_user_id
    WHERE id = v_invitation.id;
    
    RETURN json_build_object(
        'success', true,
        'organization_id', v_invitation.organization_id,
        'role', v_invitation.role
    );
END;
$$;

COMMENT ON FUNCTION public.accept_invitation IS 'Aceita convite e vincula usuário à organização';

-- 8. Função para contar vagas disponíveis
CREATE OR REPLACE FUNCTION public.get_available_seats(p_organization_id BIGINT)
RETURNS TABLE(
    max_users INT,
    active_users BIGINT,
    pending_invites BIGINT,
    available_seats BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(o.max_users, 5) as max_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as active_users,
        COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending') as pending_invites,
        GREATEST(0, COALESCE(o.max_users, 5) - COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) - COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending')) as available_seats
    FROM public.organizations o
    LEFT JOIN public.users u ON u.organization_id = o.id
    LEFT JOIN public.organization_invitations i ON i.organization_id = o.id AND i.status = 'pending'
    WHERE o.id = p_organization_id
    GROUP BY o.id, o.max_users;
END;
$$;

COMMENT ON FUNCTION public.get_available_seats IS 'Retorna vagas disponíveis considerando usuários ativos e convites pendentes';
