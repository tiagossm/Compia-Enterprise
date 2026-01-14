-- Migration 38: User Organizations - Multi-profile support
-- Permite um usuário ter múltiplos perfis em diferentes organizações

-- Tabela pivô para relacionamento N:N entre users e organizations
CREATE TABLE IF NOT EXISTS user_organizations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  organization_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'inspector',
  permissions TEXT DEFAULT '{}', -- JSON com permissões granulares
  is_primary INTEGER DEFAULT 0, -- 1 se for a organização primária do usuário
  is_active INTEGER DEFAULT 1,
  assigned_by TEXT, -- ID do usuário que fez a atribuição
  assigned_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE(user_id, organization_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_org ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_role ON user_organizations(role);
CREATE INDEX IF NOT EXISTS idx_user_orgs_primary ON user_organizations(user_id, is_primary) WHERE is_primary = 1;

-- Migrar dados existentes: criar atribuições para usuários que já têm organization_id
INSERT OR IGNORE INTO user_organizations (user_id, organization_id, role, is_primary, is_active, assigned_at)
SELECT 
  id as user_id,
  organization_id,
  role,
  1 as is_primary, -- Atribuição existente se torna primária
  is_active,
  datetime('now')
FROM users 
WHERE organization_id IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_user_organizations_updated_at
AFTER UPDATE ON user_organizations
BEGIN
  UPDATE user_organizations SET updated_at = datetime('now') WHERE id = NEW.id;
END;
