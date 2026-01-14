
-- Ensure master organization exists
INSERT OR IGNORE INTO organizations (
  id, name, type, description, organization_level, subscription_status, 
  subscription_plan, max_users, max_subsidiaries, is_active, 
  created_at, updated_at
) VALUES (
  1, 'Master Organization', 'master', 'Organização mestre do sistema', 
  'master', 'active', 'enterprise', 1000, 100, true, 
  datetime('now'), datetime('now')
);

-- Update system creator to have correct permissions
UPDATE users 
SET role = 'system_admin', can_manage_users = true, can_create_organizations = true, updated_at = datetime('now')
WHERE email = 'eng.tiagosm@gmail.com';
