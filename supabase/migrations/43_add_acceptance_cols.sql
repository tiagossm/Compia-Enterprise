-- Add accepted_by and declined_by columns to calendar_events
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS accepted_by JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS declined_by JSONB DEFAULT '[]'::jsonb;

-- Add accepted_by and declined_by columns to inspections
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS accepted_by JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS declined_by JSONB DEFAULT '[]'::jsonb;
