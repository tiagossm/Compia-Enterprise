-- Expand Leads schema to support full Organization Data
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website text;

-- Address Fields (Matching organizations/inspections schema)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS logradouro text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS uf text;

-- Conversion Tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_organization_id bigint REFERENCES organizations(id);

-- Add index for search
CREATE INDEX IF NOT EXISTS idx_leads_cnpj ON leads(cnpj);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
