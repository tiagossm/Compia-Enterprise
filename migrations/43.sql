-- Migration 43: User Folder Preferences
-- Permite que cada usuário tenha sua própria organização de checklists em pastas
-- sem afetar a visualização de outros usuários

-- Criar tabela de preferências de pastas por usuário
CREATE TABLE IF NOT EXISTS public.user_folder_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Item que está sendo organizado (checklist template ou pasta)
  item_type TEXT NOT NULL CHECK (item_type IN ('template', 'folder')),
  item_id BIGINT NOT NULL,

  -- Pasta personalizada onde o item está (NULL = raiz)
  personal_folder_id UUID REFERENCES public.checklist_folders(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint única: um usuário pode ter apenas uma preferência por item
  UNIQUE(user_id, organization_id, item_type, item_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_folder_prefs_user_org
  ON public.user_folder_preferences(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_user_folder_prefs_item
  ON public.user_folder_preferences(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_user_folder_prefs_folder
  ON public.user_folder_preferences(personal_folder_id);

-- Comentários
COMMENT ON TABLE public.user_folder_preferences IS
  'Armazena preferências pessoais de organização de checklists em pastas por usuário';

COMMENT ON COLUMN public.user_folder_preferences.item_type IS
  'Tipo do item: template (checklist) ou folder (pasta)';

COMMENT ON COLUMN public.user_folder_preferences.personal_folder_id IS
  'Pasta personalizada onde o usuário organizou este item (NULL = raiz)';

-- RLS Policies
ALTER TABLE public.user_folder_preferences ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias preferências
DROP POLICY IF EXISTS "user_folder_preferences_select" ON public.user_folder_preferences;
CREATE POLICY "user_folder_preferences_select" ON public.user_folder_preferences
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem inserir apenas suas próprias preferências
DROP POLICY IF EXISTS "user_folder_preferences_insert" ON public.user_folder_preferences;
CREATE POLICY "user_folder_preferences_insert" ON public.user_folder_preferences
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem atualizar apenas suas próprias preferências
DROP POLICY IF EXISTS "user_folder_preferences_update" ON public.user_folder_preferences;
CREATE POLICY "user_folder_preferences_update" ON public.user_folder_preferences
  FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  ) WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Usuários podem deletar apenas suas próprias preferências
DROP POLICY IF EXISTS "user_folder_preferences_delete" ON public.user_folder_preferences;
CREATE POLICY "user_folder_preferences_delete" ON public.user_folder_preferences
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
  );

-- System admins têm acesso total
DROP POLICY IF EXISTS "user_folder_preferences_sysadmin" ON public.user_folder_preferences;
CREATE POLICY "user_folder_preferences_sysadmin" ON public.user_folder_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'sysadmin'
    )
  );
