/**
 * Centralized role labels for PT-BR UI consistency
 * Use these labels across all frontend components
 */

import { USER_ROLES } from '@/shared/user-types';

export const ROLE_LABELS: Record<string, string> = {
    [USER_ROLES.SYSTEM_ADMIN]: 'Administrador do Sistema',
    [USER_ROLES.SYS_ADMIN]: 'Administrador do Sistema', // Legacy alias
    [USER_ROLES.ORG_ADMIN]: 'Administrador da Organização',
    [USER_ROLES.MANAGER]: 'Gerente',
    [USER_ROLES.INSPECTOR]: 'Técnico',
    [USER_ROLES.CLIENT]: 'Cliente',
    // Legacy fallbacks
    'admin': 'Administrador',
} as const;

export const ROLE_COLORS: Record<string, string> = {
    [USER_ROLES.SYSTEM_ADMIN]: 'bg-purple-100 text-purple-800',
    [USER_ROLES.SYS_ADMIN]: 'bg-purple-100 text-purple-800',
    [USER_ROLES.ORG_ADMIN]: 'bg-red-100 text-red-800',
    [USER_ROLES.MANAGER]: 'bg-blue-100 text-blue-800',
    [USER_ROLES.INSPECTOR]: 'bg-green-100 text-green-800',
    [USER_ROLES.CLIENT]: 'bg-gray-100 text-gray-800',
    'admin': 'bg-red-100 text-red-800',
} as const;

/**
 * Get display label for a role
 */
export function getRoleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
}

/**
 * Get Tailwind color classes for a role badge
 */
export function getRoleColor(role: string): string {
    return ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Check if role is a system administrator (any variant)
 */
export function isSystemAdminRole(role: string): boolean {
    return role === USER_ROLES.SYSTEM_ADMIN || role === USER_ROLES.SYS_ADMIN || role === 'admin';
}

/**
 * Get roles available for assignment based on current user's role
 */
export function getAssignableRoles(currentUserRole: string): Array<{ value: string; label: string }> {
    const baseRoles: Array<{ value: string; label: string }> = [
        { value: USER_ROLES.INSPECTOR, label: ROLE_LABELS[USER_ROLES.INSPECTOR] },
        { value: USER_ROLES.CLIENT, label: ROLE_LABELS[USER_ROLES.CLIENT] },
        { value: USER_ROLES.MANAGER, label: ROLE_LABELS[USER_ROLES.MANAGER] },
    ];

    // Org admins can assign org_admin to others
    if (currentUserRole === USER_ROLES.ORG_ADMIN || isSystemAdminRole(currentUserRole)) {
        baseRoles.unshift({ value: USER_ROLES.ORG_ADMIN, label: ROLE_LABELS[USER_ROLES.ORG_ADMIN] });
    }

    return baseRoles;
}
