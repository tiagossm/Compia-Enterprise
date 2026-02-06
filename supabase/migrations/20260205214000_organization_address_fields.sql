-- Add structured address columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_number text,
ADD COLUMN IF NOT EXISTS address_complement text,
ADD COLUMN IF NOT EXISTS address_neighborhood text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_state text,
ADD COLUMN IF NOT EXISTS address_zip_code text;

COMMENT ON COLUMN organizations.address_street IS 'Rua/Logradouro';
COMMENT ON COLUMN organizations.address_number IS 'Número';
COMMENT ON COLUMN organizations.address_complement IS 'Complemento (Apto, Bloco)';
COMMENT ON COLUMN organizations.address_neighborhood IS 'Bairro';
COMMENT ON COLUMN organizations.address_city IS 'Cidade';
COMMENT ON COLUMN organizations.address_state IS 'Estado (UF)';
COMMENT ON COLUMN organizations.address_zip_code IS 'CEP';
