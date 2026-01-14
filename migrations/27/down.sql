
-- Remove the sample fields and templates
DELETE FROM checklist_fields WHERE template_id IN (101, 102, 103, 104);
DELETE FROM checklist_templates WHERE id IN (101, 102, 103, 104);
