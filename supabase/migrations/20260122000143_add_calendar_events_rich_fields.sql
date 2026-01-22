-- Add missing columns to calendar_events table
-- These columns are required for the rich event functionality

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS scope_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS notification_body TEXT;

-- Add index for google_event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON public.calendar_events(google_event_id);
