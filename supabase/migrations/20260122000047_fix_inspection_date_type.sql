-- Change scheduled_date to TIMESTAMPTZ to support time in calendar
ALTER TABLE public.inspections ALTER COLUMN scheduled_date TYPE TIMESTAMPTZ USING scheduled_date::timestamptz;
