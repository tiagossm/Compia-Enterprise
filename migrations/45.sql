-- Migration 45: Sistema de Favoritos
-- Permite que usuários marquem checklists como favoritos para acesso rápido

-- Criar tabela de favoritos
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Checklist favoritado
  template_id BIGINT NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,

  -- Ordem de exibição (para permitir reordenação futura)
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Um usuário pode favoritar um checklist apenas uma vez
  UNIQUE(user_id, template_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_org
  ON public.user_favorites(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_template
  ON public.user_favorites(template_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_order
  ON public.user_favorites(user_id, display_order);

-- Comentários
COMMENT ON TABLE public.user_favorites IS
  'Checklists favoritados por cada usuário para acesso rápido';

COMMENT ON COLUMN public.user_favorites.display_order IS
  'Ordem de exibição dos favoritos (0 = mais recente)';

-- RLS Policies
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios favoritos
DROP POLICY IF EXISTS "user_favorites_select" ON public.user_favorites;
CREATE POLICY "user_favorites_select" ON public.user_favorites
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem adicionar apenas seus próprios favoritos
DROP POLICY IF EXISTS "user_favorites_insert" ON public.user_favorites;
CREATE POLICY "user_favorites_insert" ON public.user_favorites
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem atualizar apenas seus próprios favoritos
DROP POLICY IF EXISTS "user_favorites_update" ON public.user_favorites;
CREATE POLICY "user_favorites_update" ON public.user_favorites
  FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  ) WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem deletar apenas seus próprios favoritos
DROP POLICY IF EXISTS "user_favorites_delete" ON public.user_favorites;
CREATE POLICY "user_favorites_delete" ON public.user_favorites
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
  );

-- System admins têm acesso total (para debug/suporte)
DROP POLICY IF EXISTS "user_favorites_sysadmin" ON public.user_favorites;
CREATE POLICY "user_favorites_sysadmin" ON public.user_favorites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );
