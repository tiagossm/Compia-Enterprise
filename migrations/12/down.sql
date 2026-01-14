
-- Revert system creator permissions
UPDATE users 
SET role = 'admin', can_manage_users = false, can_create_organizations = false, updated_at = datetime('now')
WHERE email = 'eng.tiagosm@gmail.com';

-- Remove master organization
DELETE FROM organizations WHERE id = 1;
