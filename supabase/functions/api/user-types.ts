// Interface base definida localmente para remover dependência externa @getmocha/users-service
export interface MochaUser {
    id: string;
    email: string;
    [key: string]: any;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: string; // 'system_admin', 'org_admin', 'manager', 'inspector', 'client'
    organization_id?: number;
    phone?: string;
    avatar_url?: string;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
    updated_at: string;
    // New fields for multi-tenant support
    can_manage_users: boolean;
    can_create_organizations: boolean;
    managed_organization_id?: number;
    invitation_token?: string;
    invited_by?: string;
    invitation_expires_at?: string;
    // Email/password authentication fields
    password_hash?: string;
    email_verified_at?: string;
    profile_completed: boolean;
}

export interface Organization {
    id: number;
    name: string;
    type: string; // 'master', 'company', 'consultancy', 'client'
    description?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    website?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // New fields for hierarchy
    parent_organization_id?: number;
    organization_level: string; // 'master', 'company', 'subsidiary'
    subscription_status: string; // 'active', 'suspended', 'trial'
    subscription_plan: string; // 'basic', 'pro', 'enterprise'
    max_users: number;
    max_subsidiaries: number;
    // Runtime fields
    user_count?: number;
    subsidiary_count?: number;
    parent_organization?: Organization;
    subsidiaries?: Organization[];
    parent_organization_name?: string;
}

export interface UserInvitation {
    id: number;
    email: string;
    organization_id: number;
    role: string;
    invited_by: string;
    invitation_token: string;
    expires_at: string;
    accepted_at?: string;
    created_at: string;
    updated_at: string;
    // Runtime fields
    organization_name?: string;
    inviter_name?: string;
}

export interface OrganizationPermission {
    id: number;
    user_id: string;
    organization_id: number;
    permission_type: string; // 'view', 'edit', 'admin', 'owner'
    granted_by: string;
    granted_at: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ActivityLogEntry {
    id: number;
    user_id: string;
    organization_id?: number;
    action_type: string;
    action_description: string;
    target_type?: string;
    target_id?: string;
    metadata?: string;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface ExtendedMochaUser extends MochaUser {
    profile?: UserProfile;
    organizations?: Organization[];
    managed_organization?: Organization;
    permissions?: OrganizationPermission[];
}

// Role definitions for the multi-tenant system
export const USER_ROLES = {
    SYSTEM_ADMIN: 'system_admin', // You - the creator/master admin
    SYS_ADMIN: 'sys_admin',       // Alternative system admin role
    ORG_ADMIN: 'org_admin',       // Company admin who bought the system
    MANAGER: 'manager',           // Organization manager
    INSPECTOR: 'inspector',       // Technical inspector/safety professional  
    CLIENT: 'client'              // Client/viewer role
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ORGANIZATION_LEVELS = {
    MASTER: 'master',       // Your master organization
    COMPANY: 'company',     // Companies that buy the system
    SUBSIDIARY: 'subsidiary' // Sub-organizations within companies
} as const;

export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    TRIAL: 'trial',
    EXPIRED: 'expired'
} as const;

export const SUBSCRIPTION_PLANS = {
    BASIC: 'basic',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
} as const;
