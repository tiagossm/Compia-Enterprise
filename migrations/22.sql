
-- Promover eng.tiagosm@gmail.com para administrador do sistema
UPDATE users 
SET 
  role = 'system_admin',
  can_manage_users = 1,
  can_create_organizations = 1,
  updated_at = datetime('now')
WHERE email = 'eng.tiagosm@gmail.com';

-- Adicionar log da promoção
INSERT INTO activity_log (
  user_id, 
  action_type, 
  action_description, 
  target_type, 
  target_id, 
  created_at
) 
SELECT 
  id,
  'user_promoted', 
  'Promovido para administrador do sistema via migração', 
  'user',
  id,
  datetime('now')
FROM users 
WHERE email = 'eng.tiagosm@gmail.com';
