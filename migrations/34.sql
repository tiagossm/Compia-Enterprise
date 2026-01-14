
-- Corrigir e padronizar a hierarquia de organizações
-- Atualizar organization_level baseado na estrutura hierárquica

-- Primeiro, definir organizações sem parent como 'company' (empresas clientes)
UPDATE organizations 
SET organization_level = 'company'
WHERE parent_organization_id IS NULL AND organization_level != 'master';

-- Definir organizações com parent como 'subsidiary' (subsidiárias)
UPDATE organizations 
SET organization_level = 'subsidiary'
WHERE parent_organization_id IS NOT NULL;

-- Garantir que a organização master (id=1) seja definida corretamente
UPDATE organizations 
SET organization_level = 'master',
    name = 'COMPIA - Sistema Master',
    type = 'master',
    subscription_status = 'active',
    subscription_plan = 'enterprise',
    max_users = 1000,
    max_subsidiaries = 100
WHERE id = 1;

-- Criar uma empresa exemplo se não houver nenhuma empresa
INSERT OR IGNORE INTO organizations (
  name, type, description, organization_level, subscription_status, 
  subscription_plan, max_users, max_subsidiaries, is_active,
  parent_organization_id, created_at, updated_at
) 
SELECT 
  'BPLanEngenharia - Empresa Cliente', 'company', 
  'Empresa cliente principal do sistema', 'company', 'active', 
  'pro', 50, 5, true, 1, datetime('now'), datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE organization_level = 'company' AND id != 1
);

-- Atualizar usuários sem organização para ter a organização master ou primeira empresa
UPDATE users 
SET organization_id = COALESCE(
  (SELECT id FROM organizations WHERE organization_level = 'company' AND id != 1 LIMIT 1),
  1
)
WHERE organization_id IS NULL;

-- Garantir que usuários org_admin tenham managed_organization_id definido
UPDATE users 
SET managed_organization_id = organization_id
WHERE role = 'org_admin' AND managed_organization_id IS NULL AND organization_id IS NOT NULL;
