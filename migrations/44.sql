-- Migration 44: Fork System for Compliance and Audit Trail
-- Permite que inspetores e org_admins criem cópias (forks) de checklists
-- mantendo rastreabilidade completa para auditoria e compliance

-- Adicionar campo para rastrear origem do fork
ALTER TABLE public.checklist_templates
ADD COLUMN IF NOT EXISTS forked_from_template_id BIGINT REFERENCES public.checklist_templates(id) ON DELETE SET NULL;

-- Índice para performance em queries de auditoria
CREATE INDEX IF NOT EXISTS idx_checklist_templates_forked_from
  ON public.checklist_templates(forked_from_template_id);

-- Índice composto para queries de auditoria por organização
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org_forked
  ON public.checklist_templates(organization_id, forked_from_template_id);

-- Comentários para documentação
COMMENT ON COLUMN public.checklist_templates.forked_from_template_id IS
  'ID do template original se este for um fork. Mantém rastreabilidade para auditoria e compliance.';

-- Adicionar índice para melhorar performance em listagens com forks
CREATE INDEX IF NOT EXISTS idx_checklist_templates_created_by_org
  ON public.checklist_templates(created_by_user_id, organization_id);
