
-- Criar categoria folder "Segurança do Trabalho" se não existir
INSERT OR REPLACE INTO checklist_templates (
  name, 
  description, 
  category, 
  is_public, 
  is_category_folder,
  folder_color,
  folder_icon,
  display_order,
  created_at,
  updated_at
) VALUES (
  'Segurança do Trabalho',
  'Pasta para organizar todos os checklists de segurança do trabalho',
  'Segurança',
  1,
  1,
  '#DC2626',
  'shield',
  0,
  datetime('now'),
  datetime('now')
);

-- Atualizar todos os templates existentes para serem filhos da pasta "Segurança do Trabalho"
UPDATE checklist_templates 
SET 
  parent_category_id = (
    SELECT id FROM checklist_templates 
    WHERE name = 'Segurança do Trabalho' AND is_category_folder = 1 
    LIMIT 1
  ),
  category = 'Segurança',
  is_public = 1,
  updated_at = datetime('now')
WHERE is_category_folder = 0 OR is_category_folder IS NULL;
