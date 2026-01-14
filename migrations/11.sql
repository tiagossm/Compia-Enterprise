
-- Create initial master organization for system admin
INSERT OR IGNORE INTO organizations (
  id, name, type, description, organization_level, subscription_status, 
  subscription_plan, max_users, max_subsidiaries, is_active, 
  created_at, updated_at
) VALUES (
  1, 'IA SST Master', 'master', 'Organização principal do sistema IA SST', 
  'master', 'active', 'enterprise', 1000, 100, true, 
  datetime('now'), datetime('now')
);
