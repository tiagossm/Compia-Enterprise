-- Migration 46: Soft Delete Pessoal (Hidden Checklists)
-- Permite que usuários "excluam" checklists de sua visualização sem afetar outros

-- Criar tabela de itens ocultos por usuário
CREATE TABLE IF NOT EXISTS public.user_hidden_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Item que está oculto (checklist template ou pasta)
  item_type TEXT NOT NULL CHECK (item_type IN ('template', 'folder')),
  item_id BIGINT NOT NULL,

  -- Metadados da ocultação
  hidden_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- Opcional: motivo da ocultação

  -- Um usuário pode ocultar um item apenas uma vez
  UNIQUE(user_id, item_type, item_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_hidden_items_user_org
  ON public.user_hidden_items(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_user_hidden_items_item
  ON public.user_hidden_items(item_type, item_id);

-- Comentários
COMMENT ON TABLE public.user_hidden_items IS
  'Itens ocultados por cada usuário (soft delete pessoal)';

COMMENT ON COLUMN public.user_hidden_items.reason IS
  'Motivo opcional da ocultação para auditoria';

-- RLS Policies
ALTER TABLE public.user_hidden_items ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios itens ocultos
DROP POLICY IF EXISTS "user_hidden_items_select" ON public.user_hidden_items;
CREATE POLICY "user_hidden_items_select" ON public.user_hidden_items
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem inserir apenas seus próprios itens ocultos
DROP POLICY IF EXISTS "user_hidden_items_insert" ON public.user_hidden_items;
CREATE POLICY "user_hidden_items_insert" ON public.user_hidden_items
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem deletar (restaurar) apenas seus próprios itens ocultos
DROP POLICY IF EXISTS "user_hidden_items_delete" ON public.user_hidden_items;
CREATE POLICY "user_hidden_items_delete" ON public.user_hidden_items
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
  );

-- System admins têm acesso total
DROP POLICY IF EXISTS "user_hidden_items_sysadmin" ON public.user_hidden_items;
CREATE POLICY "user_hidden_items_sysadmin" ON public.user_hidden_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );
