-- Add company_name and client_id to calendar_events
-- These columns are required to persist the company selection in the calendar event form

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS client_id TEXT;
