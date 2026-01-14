-- Migration 40: Session Management
-- Adiciona campos para controle de sessão única por usuário

-- Campos de sessão na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_device TEXT;

-- Índice para busca rápida por session_id
CREATE INDEX IF NOT EXISTS idx_users_session ON users(current_session_id);

-- Tabela de log de sessões (para auditoria)
CREATE TABLE IF NOT EXISTS session_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT DEFAULT 'login', -- 'login', 'logout', 'expired', 'replaced'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_log_user ON session_log(user_id);
CREATE INDEX IF NOT EXISTS idx_session_log_date ON session_log(created_at);
