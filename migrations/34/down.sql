
-- Reverter mudanças na hierarquia
UPDATE organizations SET organization_level = 'company' WHERE organization_level = 'subsidiary';
UPDATE organizations SET organization_level = 'company' WHERE organization_level = 'master' AND id != 1;
