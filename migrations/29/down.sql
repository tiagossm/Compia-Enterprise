
-- Reverter role do usuário sys_admin protegido (não recomendado)
UPDATE users 
SET role = 'admin', managed_organization_id = NULL
WHERE id = '01990d69-5246-738d-8605-1ed319a3f98d' OR email = 'eng.tiagosm@gmail.com';
