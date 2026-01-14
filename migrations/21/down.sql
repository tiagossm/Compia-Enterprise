
-- Remover índices
DROP INDEX IF EXISTS idx_checklist_templates_org_folder;
DROP INDEX IF EXISTS idx_checklist_folders_org_path;
DROP INDEX IF EXISTS idx_checklist_folders_org_parent;
DROP INDEX IF EXISTS idx_checklist_folders_org_parent_slug;

-- Remover coluna folder_id
ALTER TABLE checklist_templates DROP COLUMN folder_id;

-- Remover tabelas
DROP TABLE IF EXISTS migrations_log;
DROP TABLE IF EXISTS checklist_folders;
