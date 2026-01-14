
-- Remove added columns from organizations
ALTER TABLE organizations DROP COLUMN parent_organization_id;
ALTER TABLE organizations DROP COLUMN organization_level;
ALTER TABLE organizations DROP COLUMN subscription_status;
ALTER TABLE organizations DROP COLUMN subscription_plan;
ALTER TABLE organizations DROP COLUMN max_users;
ALTER TABLE organizations DROP COLUMN max_subsidiaries;

-- Remove added columns from users
ALTER TABLE users DROP COLUMN can_manage_users;
ALTER TABLE users DROP COLUMN can_create_organizations;
ALTER TABLE users DROP COLUMN managed_organization_id;
ALTER TABLE users DROP COLUMN invitation_token;
ALTER TABLE users DROP COLUMN invited_by;
ALTER TABLE users DROP COLUMN invitation_expires_at;

-- Drop created tables
DROP TABLE user_invitations;
DROP TABLE organization_permissions;
DROP TABLE activity_log;
