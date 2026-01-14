-- Migration 35: Campos de Auditoria e Anti-Fraude para Inspeções
-- Conformidade LGPD: Histórico de alterações obrigatório

-- ============================================
-- PARTE 1: Campos de Metadata Anti-Fraude
-- ============================================

-- Timestamps: Detectar manipulação de relógio do dispositivo
ALTER TABLE inspections ADD COLUMN started_at_user_time TEXT;
ALTER TABLE inspections ADD COLUMN started_at_server_time TEXT DEFAULT (datetime('now'));

-- Geolocalização: Registrar início e fim da inspeção
ALTER TABLE inspections ADD COLUMN location_start_lat REAL;
ALTER TABLE inspections ADD COLUMN location_start_lng REAL;
ALTER TABLE inspections ADD COLUMN location_end_lat REAL;
ALTER TABLE inspections ADD COLUMN location_end_lng REAL;

-- Device Fingerprint: Identificar dispositivo usado
ALTER TABLE inspections ADD COLUMN device_fingerprint TEXT;
ALTER TABLE inspections ADD COLUMN device_model TEXT;
ALTER TABLE inspections ADD COLUMN device_os TEXT;

-- Sync Offline: Marcar inspeções feitas offline
ALTER TABLE inspections ADD COLUMN is_offline_sync INTEGER DEFAULT 0;
ALTER TABLE inspections ADD COLUMN sync_timestamp TEXT;

-- ============================================
-- PARTE 2: Tabela de Logs de Alteração (LGPD)
-- ============================================

CREATE TABLE IF NOT EXISTS inspection_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'FINALIZE', 'REOPEN')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Índices para queries de auditoria
CREATE INDEX IF NOT EXISTS idx_inspection_logs_inspection ON inspection_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_logs_user ON inspection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_logs_action ON inspection_logs(action);
CREATE INDEX IF NOT EXISTS idx_inspection_logs_created ON inspection_logs(created_at);

-- ============================================
-- PARTE 3: Índices de Performance para Multi-Tenant
-- ============================================

-- Índice composto para queries de listagem por organização
CREATE INDEX IF NOT EXISTS idx_inspections_org_status ON inspections(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inspections_org_created ON inspections(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_created_by_org ON inspections(created_by, organization_id);
