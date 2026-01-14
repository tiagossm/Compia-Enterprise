-- Insert Folder
INSERT INTO checklist_folders (id, name, slug, path, color, icon, display_order, organization_id, created_at, updated_at)
SELECT 
  'example-folder-uuid', 
  'Exemplos', 
  'exemplos', 
  '/Exemplos', 
  '#3B82F6', 
  'folder', 
  0, 
  organization_id, 
  datetime('now'), 
  datetime('now')
FROM users 
WHERE organization_id IS NOT NULL 
LIMIT 1;

-- Insert Template
INSERT INTO checklist_templates (name, description, category, created_by, created_by_user_id, organization_id, is_public, folder_id, created_at, updated_at)
SELECT 
  'Checklist de Exemplo', 
  'Um checklist de demonstração para mostrar as funcionalidades.', 
  'Geral', 
  'Sistema', 
  id, 
  organization_id, 
  0, 
  'example-folder-uuid', 
  datetime('now'), 
  datetime('now')
FROM users 
WHERE organization_id IS NOT NULL 
LIMIT 1;

-- Insert Fields
INSERT INTO checklist_fields (template_id, label, type, required, order_index, options, created_at, updated_at)
SELECT 
  id, 
  'Nome do Item', 
  'text', 
  1, 
  0, 
  NULL, 
  datetime('now'), 
  datetime('now')
FROM checklist_templates 
WHERE folder_id = 'example-folder-uuid' 
ORDER BY created_at DESC 
LIMIT 1;

INSERT INTO checklist_fields (template_id, label, type, required, order_index, options, created_at, updated_at)
SELECT 
  id, 
  'Verificado?', 
  'checkbox', 
  0, 
  1, 
  NULL, 
  datetime('now'), 
  datetime('now')
FROM checklist_templates 
WHERE folder_id = 'example-folder-uuid' 
ORDER BY created_at DESC 
LIMIT 1;

INSERT INTO checklist_fields (template_id, label, type, required, order_index, options, created_at, updated_at)
SELECT 
  id, 
  'Prioridade', 
  'select', 
  1, 
  2, 
  '["Baixa", "Média", "Alta"]', 
  datetime('now'), 
  datetime('now')
FROM checklist_templates 
WHERE folder_id = 'example-folder-uuid' 
ORDER BY created_at DESC 
LIMIT 1;
