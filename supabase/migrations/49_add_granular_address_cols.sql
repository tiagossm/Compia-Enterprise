-- Add granular address columns to inspections
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS uf TEXT;

-- Update comments
COMMENT ON COLUMN public.inspections.location IS 'Specific location/sector within the address (e.g. Galpão A)';
COMMENT ON COLUMN public.inspections.address IS 'Full street address string (calculated)';
