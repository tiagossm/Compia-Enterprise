
-- Criar índices para melhorar performance das auto-sugestões
CREATE INDEX IF NOT EXISTS idx_inspections_company_name ON inspections(company_name);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_name ON inspections(inspector_name);
CREATE INDEX IF NOT EXISTS idx_inspections_responsible_name ON inspections(responsible_name);
CREATE INDEX IF NOT EXISTS idx_inspections_location ON inspections(location);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
