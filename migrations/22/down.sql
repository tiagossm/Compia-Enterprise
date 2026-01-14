
-- Reverter promoção do usuário
UPDATE users 
SET 
  role = 'inspector',
  can_manage_users = 0,
  can_create_organizations = 0,
  updated_at = datetime('now')
WHERE email = 'eng.tiagosm@gmail.com';

-- Remover log da promoção
DELETE FROM activity_log 
WHERE action_description = 'Promovido para administrador do sistema via migração'
  AND user_id IN (SELECT id FROM users WHERE email = 'eng.tiagosm@gmail.com');
