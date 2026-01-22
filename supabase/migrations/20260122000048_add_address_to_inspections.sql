-- Add address column to inspections table
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment to distinguish location vs address
COMMENT ON COLUMN public.inspections.location IS 'Specific location/sector within the address (e.g. Galpão A)';
COMMENT ON COLUMN public.inspections.address IS 'Full street address (Logradouro, Number, City, etc)';
