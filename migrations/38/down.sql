-- Rollback Migration 38: User Organizations

DROP TRIGGER IF EXISTS update_user_organizations_updated_at;
DROP INDEX IF EXISTS idx_user_orgs_primary;
DROP INDEX IF EXISTS idx_user_orgs_role;
DROP INDEX IF EXISTS idx_user_orgs_org;
DROP INDEX IF EXISTS idx_user_orgs_user;
DROP TABLE IF EXISTS user_organizations;
