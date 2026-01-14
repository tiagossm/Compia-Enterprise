-- Migration: Add structured address fields to inspections table
-- Date: 2024-12-19

-- Add new address fields
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS sectors TEXT; -- JSON array of sectors/areas

-- Add comment for sectors field
COMMENT ON COLUMN inspections.sectors IS 'JSON array of sectors/areas inspected, e.g. ["Galpão A", "Produção", "Almoxarifado"]';
