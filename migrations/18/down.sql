
-- Remover a associação com a pasta pai
UPDATE checklist_templates 
SET parent_category_id = NULL, updated_at = datetime('now')
WHERE parent_category_id = (
  SELECT id FROM checklist_templates 
  WHERE name = 'Segurança do Trabalho' AND is_category_folder = 1 
  LIMIT 1
);

-- Remover a pasta "Segurança do Trabalho"
DELETE FROM checklist_templates 
WHERE name = 'Segurança do Trabalho' AND is_category_folder = 1;
