
-- Criar tabela de usuários protegidos contra remoção de privilégios
CREATE TABLE protected_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  protection_level TEXT NOT NULL DEFAULT 'high', -- high, medium, low
  protected_roles TEXT NOT NULL, -- JSON array of roles that cannot be removed
  protected_permissions TEXT NOT NULL, -- JSON array of permissions that cannot be removed
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de auditoria para mudanças críticas
CREATE TABLE security_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL, -- quem fez a ação
  target_user_id TEXT, -- usuário afetado (se aplicável)
  target_organization_id INTEGER, -- organização afetada (se aplicável)
  action_type TEXT NOT NULL, -- 'role_change', 'permission_change', 'user_delete', etc.
  old_value TEXT, -- valor anterior
  new_value TEXT, -- novo valor
  blocked_reason TEXT, -- se a ação foi bloqueada, o motivo
  ip_address TEXT,
  user_agent TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proteger o usuário eng.tiagosm@gmail.com
-- Garantir que o usuário existe antes de proteger
INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at, is_active, profile_completed, can_manage_users, can_create_organizations)
VALUES ('01990d69-5246-733d-8605-1ed319a3f98d', 'eng.tiagosm@gmail.com', 'Tiago Mocha System Admin', 'system_admin', datetime('now'), datetime('now'), 1, 1, 1, 1);

-- Inserir proteção usando o ID fixo ou o ID existente
INSERT INTO protected_users (
  user_id, 
  protection_level, 
  protected_roles, 
  protected_permissions, 
  reason, 
  created_by
) VALUES (
  (SELECT id FROM users WHERE email = 'eng.tiagosm@gmail.com'),
  'high',
  '["system_admin"]',
  '["can_manage_users", "can_create_organizations"]',
  'Usuário fundador do sistema - proteção máxima contra remoção de privilégios',
  'system'
);
