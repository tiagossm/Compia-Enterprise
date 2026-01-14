-- Allow deferred configuration for inspections created via Agenda
ALTER TABLE inspections ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE inspections ALTER COLUMN ai_assistant_id DROP NOT NULL;
