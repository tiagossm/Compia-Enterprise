
-- Remover coluna compliance_status
ALTER TABLE inspection_items DROP COLUMN compliance_status;

-- Não remover organizações criadas pois podem ter dados dependentes
