
-- Users table to store additional user profile data
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Mocha user ID
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'inspector', -- admin, manager, inspector, client
  organization_id INTEGER,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table for multi-tenant support
CREATE TABLE organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'company', -- company, consultancy, client
  description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Organization relationships (many-to-many)
CREATE TABLE user_organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  organization_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member', -- owner, admin, manager, member
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inspection collaborators for real-time collaboration
CREATE TABLE inspection_collaborators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT DEFAULT 'edit', -- view, edit, admin
  invited_by TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- pending, active, removed
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared inspection links (for QR codes)
CREATE TABLE inspection_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  permission TEXT DEFAULT 'view', -- view, edit
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
