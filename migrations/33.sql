
-- Coluna compliance_status já foi adicionada na migration 32
-- Apenas atualizamos os valores existentes

-- Atualizar valores existentes baseados no is_compliant
UPDATE inspection_items 
SET compliance_status = CASE 
  WHEN is_compliant = 1 THEN 'compliant'
  WHEN is_compliant = 0 THEN 'non_compliant'
  ELSE 'unanswered'
END
WHERE compliance_status IS NULL OR compliance_status = 'unanswered';

-- Criar organizações padrão se não existirem
INSERT OR IGNORE INTO organizations (
  id, name, type, description, organization_level, subscription_status, 
  subscription_plan, max_users, max_subsidiaries, is_active,
  created_at, updated_at
) VALUES 
(1, 'COMPIA - Master Organization', 'master', 'Organização principal do sistema COMPIA', 'master', 'active', 'enterprise', 1000, 100, true, datetime('now'), datetime('now'));

-- Garantir que existe pelo menos uma organização empresa de exemplo
INSERT OR IGNORE INTO organizations (
  name, type, description, organization_level, subscription_status, 
  subscription_plan, max_users, max_subsidiaries, is_active,
  parent_organization_id, created_at, updated_at
) VALUES 
('Empresa Exemplo Ltda', 'company', 'Empresa cliente de exemplo', 'company', 'active', 'pro', 50, 10, true, 1, datetime('now'), datetime('now'));
