
DROP TABLE checklist_templates;
DROP TABLE checklist_fields;
ALTER TABLE inspection_items DROP COLUMN template_id;
ALTER TABLE inspection_items DROP COLUMN field_responses;
