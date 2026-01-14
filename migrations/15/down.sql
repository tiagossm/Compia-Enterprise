
-- Remove the sample category folders
DELETE FROM checklist_templates WHERE is_category_folder = true AND created_by = 'system';

-- Remove the hierarchical columns
ALTER TABLE checklist_templates DROP COLUMN parent_category_id;
ALTER TABLE checklist_templates DROP COLUMN category_path;
ALTER TABLE checklist_templates DROP COLUMN is_category_folder;
ALTER TABLE checklist_templates DROP COLUMN folder_color;
ALTER TABLE checklist_templates DROP COLUMN folder_icon;
ALTER TABLE checklist_templates DROP COLUMN display_order;
