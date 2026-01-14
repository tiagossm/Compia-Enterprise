
-- Add role permissions configuration table
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  permission_type TEXT NOT NULL, -- 'checklist_create', 'checklist_edit', 'checklist_delete', 'checklist_view_all', etc.
  is_allowed BOOLEAN DEFAULT true,
  organization_id INTEGER, -- NULL for global permissions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions for all roles
INSERT INTO role_permissions (role, permission_type, is_allowed) VALUES
-- System Admin (all permissions)
('system_admin', 'checklist_create', true),
('system_admin', 'checklist_edit_all', true),
('system_admin', 'checklist_delete_all', true),
('system_admin', 'checklist_view_all', true),

-- Org Admin (organization scope)
('org_admin', 'checklist_create', true),
('org_admin', 'checklist_edit_org', true),
('org_admin', 'checklist_delete_org', true),
('org_admin', 'checklist_view_org', true),

-- Manager (department scope)
('manager', 'checklist_create', true),
('manager', 'checklist_edit_own', true),
('manager', 'checklist_delete_own', true),
('manager', 'checklist_view_org', true),

-- Inspector/Técnico (can create and manage own)
('inspector', 'checklist_create', true),
('inspector', 'checklist_edit_own', true),
('inspector', 'checklist_delete_own', true),
('inspector', 'checklist_view_org', true),

-- Client (view only)
('client', 'checklist_create', false),
('client', 'checklist_edit_own', false),
('client', 'checklist_delete_own', false),
('client', 'checklist_view_org', true);
