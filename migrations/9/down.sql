
ALTER TABLE inspections DROP COLUMN organization_id;
ALTER TABLE checklist_templates DROP COLUMN organization_id;
ALTER TABLE action_items DROP COLUMN assigned_to;
ALTER TABLE checklist_templates DROP COLUMN created_by_user_id;
ALTER TABLE inspections DROP COLUMN created_by;
