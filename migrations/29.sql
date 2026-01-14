
-- Corrigir role do usuário sys_admin protegido
UPDATE users 
SET role = 'sys_admin', can_manage_users = 1, can_create_organizations = 1, managed_organization_id = 1
WHERE id = '01990d69-5246-738d-8605-1ed319a3f98d' OR email = 'eng.tiagosm@gmail.com';
