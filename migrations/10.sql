
-- Add hierarchical support to organizations
ALTER TABLE organizations ADD COLUMN parent_organization_id INTEGER;
ALTER TABLE organizations ADD COLUMN organization_level TEXT DEFAULT 'company'; -- 'master', 'company', 'subsidiary'
ALTER TABLE organizations ADD COLUMN subscription_status TEXT DEFAULT 'active'; -- 'active', 'suspended', 'trial'
ALTER TABLE organizations ADD COLUMN subscription_plan TEXT DEFAULT 'basic'; -- 'basic', 'pro', 'enterprise'
ALTER TABLE organizations ADD COLUMN max_users INTEGER DEFAULT 50;
ALTER TABLE organizations ADD COLUMN max_subsidiaries INTEGER DEFAULT 0;

-- Add new user roles and organization management capabilities
ALTER TABLE users ADD COLUMN can_manage_users BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN can_create_organizations BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN managed_organization_id INTEGER; -- For org_admin: which org they manage
ALTER TABLE users ADD COLUMN invitation_token TEXT;
ALTER TABLE users ADD COLUMN invited_by TEXT;
ALTER TABLE users ADD COLUMN invitation_expires_at TIMESTAMP;

-- Create user invitations table
CREATE TABLE user_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  organization_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create organization permissions table for fine-grained access control
CREATE TABLE organization_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  organization_id INTEGER NOT NULL,
  permission_type TEXT NOT NULL, -- 'view', 'edit', 'admin', 'owner'
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create activity log for audit trail
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  organization_id INTEGER,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  target_type TEXT, -- 'user', 'organization', 'inspection', etc.
  target_id TEXT,
  metadata TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
