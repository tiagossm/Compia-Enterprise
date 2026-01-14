
-- Update all existing templates to be in "Segurança do Trabalho" category
UPDATE checklist_templates 
SET category = 'Segurança do Trabalho'
WHERE category != 'Segurança do Trabalho' OR category IS NULL;

-- Ensure all templates are public so they show in the checklist screen
UPDATE checklist_templates 
SET is_public = true
WHERE is_public != true OR is_public IS NULL;
