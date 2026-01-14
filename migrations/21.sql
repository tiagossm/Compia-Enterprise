
-- 1. Criar tabela de pastas de checklist com suporte hierárquico
CREATE TABLE IF NOT EXISTS checklist_folders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id INTEGER NOT NULL,
  parent_id TEXT NULL REFERENCES checklist_folders(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_folders_org_parent_slug 
  ON checklist_folders (organization_id, parent_id, slug);
CREATE INDEX IF NOT EXISTS idx_checklist_folders_org_parent 
  ON checklist_folders (organization_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_checklist_folders_org_path 
  ON checklist_folders (organization_id, path);

-- 3. Adicionar coluna folder_id à tabela checklist_templates (se não existir)
ALTER TABLE checklist_templates ADD COLUMN folder_id TEXT REFERENCES checklist_folders(id);

-- 4. Criar índice para folder_id
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org_folder 
  ON checklist_templates (organization_id, folder_id);

-- 5. Criar tabela de log de migração
CREATE TABLE IF NOT EXISTS migrations_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_type TEXT NOT NULL,
  organization_id INTEGER,
  details TEXT,
  items_migrated INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
