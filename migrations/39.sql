-- Migration 39: AI Rate Limiting and Gamification System
-- Adiciona campos para controle de uso de IA por organização e gamificação de usuários

-- ============================================
-- PARTE 1: Rate Limiting de IA (Organizations)
-- ============================================

-- Adicionar campos de rate limiting na tabela organizations
ALTER TABLE organizations ADD COLUMN ai_usage_count INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN ai_limit INTEGER DEFAULT 100;
ALTER TABLE organizations ADD COLUMN ai_reset_date TEXT DEFAULT (date('now', 'start of month', '+1 month'));
ALTER TABLE organizations ADD COLUMN subscription_tier TEXT DEFAULT 'starter' 
  CHECK (subscription_tier IN ('starter', 'pro', 'business', 'enterprise'));
ALTER TABLE organizations ADD COLUMN ai_model_preference TEXT DEFAULT 'gemini-flash';

-- Tabela de histórico de uso de IA (para auditoria e billing)
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  inspection_id TEXT,
  
  -- Tipo de chamada
  feature_type TEXT NOT NULL DEFAULT 'analysis', -- 'analysis', 'action_plan', 'transcription', 'chat'
  model_used TEXT NOT NULL DEFAULT 'gemini-flash',
  
  -- Métricas
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  
  -- Cache
  cache_hit INTEGER DEFAULT 0, -- 1 se veio do cache
  
  -- Status
  status TEXT DEFAULT 'success', -- 'success', 'error', 'timeout'
  error_message TEXT,
  
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_log(feature_type);

-- ============================================
-- PARTE 2: Gamificação (Users)
-- ============================================

-- Adicionar campos de gamificação na tabela users
ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN best_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN level TEXT DEFAULT 'iniciante' 
  CHECK (level IN ('iniciante', 'experiente', 'especialista', 'mestre'));
ALTER TABLE users ADD COLUMN last_inspection_date TEXT;

-- Tabela de histórico de pontos
CREATE TABLE IF NOT EXISTS user_points_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  
  points INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'inspection_completed', 'on_time_bonus', 'streak_bonus', 'action_resolved', 'referral'
  description TEXT,
  
  reference_type TEXT, -- 'inspection', 'action_item', 'referral'
  reference_id TEXT,
  
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_points_user ON user_points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_date ON user_points_history(created_at);
CREATE INDEX IF NOT EXISTS idx_points_action ON user_points_history(action);

-- ============================================
-- PARTE 3: Kanban como Delegação
-- ============================================

-- Adicionar campos de delegação na tabela kanban_cards (se existir)
-- Nota: esta parte pode falhar silenciosamente se kanban_cards não existir
ALTER TABLE kanban_cards ADD COLUMN inspection_id TEXT REFERENCES inspections(id);
ALTER TABLE kanban_cards ADD COLUMN assigned_by TEXT REFERENCES users(id);
ALTER TABLE kanban_cards ADD COLUMN completed_on_time INTEGER DEFAULT 0;
ALTER TABLE kanban_cards ADD COLUMN points_awarded INTEGER DEFAULT 0;

-- ============================================
-- PARTE 4: Preferências de Notificação
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL UNIQUE,
  
  -- Email
  email_daily_summary INTEGER DEFAULT 0,
  email_weekly_summary INTEGER DEFAULT 1,
  email_deadline_reminder INTEGER DEFAULT 1,
  email_task_assigned INTEGER DEFAULT 1,
  email_comments INTEGER DEFAULT 1,
  
  -- Push/In-app
  push_new_tasks INTEGER DEFAULT 1,
  push_mentions INTEGER DEFAULT 1,
  push_status_updates INTEGER DEFAULT 0,
  
  -- Horários
  daily_summary_time TEXT DEFAULT '08:00',
  weekly_summary_day INTEGER DEFAULT 1, -- 1 = Segunda
  
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- PARTE 5: Configurações Globais do Sistema
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  
  -- IA
  ai_enabled INTEGER DEFAULT 1,
  ai_primary_provider TEXT DEFAULT 'gemini',
  ai_backup_provider TEXT DEFAULT 'openai',
  ai_fallback_enabled INTEGER DEFAULT 1,
  
  -- Notificações
  notifications_enabled INTEGER DEFAULT 1,
  
  -- Gamificação
  gamification_enabled INTEGER DEFAULT 1,
  
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Inserir configuração padrão
INSERT OR IGNORE INTO system_settings (id) VALUES ('global');

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para atualizar level do usuário quando pontos mudam
CREATE TRIGGER IF NOT EXISTS update_user_level
AFTER UPDATE OF total_points ON users
BEGIN
  UPDATE users SET level = 
    CASE 
      WHEN NEW.total_points >= 5001 THEN 'mestre'
      WHEN NEW.total_points >= 2001 THEN 'especialista'
      WHEN NEW.total_points >= 501 THEN 'experiente'
      ELSE 'iniciante'
    END
  WHERE id = NEW.id;
END;

-- Trigger para atualizar best_streak
CREATE TRIGGER IF NOT EXISTS update_best_streak
AFTER UPDATE OF current_streak ON users
WHEN NEW.current_streak > NEW.best_streak
BEGIN
  UPDATE users SET best_streak = NEW.current_streak WHERE id = NEW.id;
END;
