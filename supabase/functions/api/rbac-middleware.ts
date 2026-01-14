import { Context } from "hono";
import { USER_ROLES } from "./user-types.ts";
import {
  PROTECTED_SYSADMIN_EMAIL,
  PROTECTED_SYSADMIN_ID,
  isProtectedUser
} from "./security-protection.ts";

// Definição de escopos do sistema
export const SCOPES = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_INVITATIONS_READ: 'users:invitations:read',
  USERS_INVITATIONS_WRITE: 'users:invitations:write',
  CHECKLIST_FOLDERS_READ: 'checklist:folders:read',
  CHECKLIST_FOLDERS_WRITE: 'checklist:folders:write',
  CHECKLIST_FOLDERS_DELETE: 'checklist:folders:delete',
  CHECKLIST_TEMPLATES_READ: 'checklist:templates:read',
  CHECKLIST_TEMPLATES_WRITE: 'checklist:templates:write',
  ORGANIZATIONS_READ: 'organizations:read',
  ORGANIZATIONS_WRITE: 'organizations:write',
  INSPECTIONS_READ: 'inspections:read',
  INSPECTIONS_WRITE: 'inspections:write',
  SYSTEM_ADMIN: 'system:admin'
} as const;

// Mapeamento de roles para escopos
const ROLE_SCOPES_MAP: Record<string, string[]> = {
  [USER_ROLES.SYSTEM_ADMIN]: Object.values(SCOPES), // Acesso total a todos os escopos
  'sys_admin': Object.values(SCOPES), // Acesso total a todos os escopos
  'admin': Object.values(SCOPES), // Compatibilidade com role admin antigo
  [USER_ROLES.ORG_ADMIN]: [
    SCOPES.USERS_READ,
    SCOPES.USERS_WRITE,
    SCOPES.USERS_INVITATIONS_READ,
    SCOPES.USERS_INVITATIONS_WRITE,
    SCOPES.CHECKLIST_FOLDERS_READ,
    SCOPES.CHECKLIST_FOLDERS_WRITE,
    SCOPES.CHECKLIST_TEMPLATES_READ,
    SCOPES.CHECKLIST_TEMPLATES_WRITE,
    SCOPES.ORGANIZATIONS_READ,
    SCOPES.ORGANIZATIONS_WRITE,
    SCOPES.INSPECTIONS_READ,
    SCOPES.INSPECTIONS_WRITE
  ],
  [USER_ROLES.MANAGER]: [
    SCOPES.USERS_READ,
    SCOPES.CHECKLIST_FOLDERS_READ,
    SCOPES.CHECKLIST_FOLDERS_WRITE,
    SCOPES.CHECKLIST_TEMPLATES_READ,
    SCOPES.CHECKLIST_TEMPLATES_WRITE,
    SCOPES.INSPECTIONS_READ,
    SCOPES.INSPECTIONS_WRITE
  ],
  [USER_ROLES.INSPECTOR]: [
    SCOPES.CHECKLIST_FOLDERS_READ,
    SCOPES.CHECKLIST_TEMPLATES_READ,
    SCOPES.INSPECTIONS_READ,
    SCOPES.INSPECTIONS_WRITE
  ],
  [USER_ROLES.CLIENT]: [
    SCOPES.INSPECTIONS_READ
  ]
};

// CONSTANTES MOVIDAS PARA security-protection.ts - PROTEÇÃO CENTRALIZADA

// Função para obter escopos de um usuário baseado no role
export function getUserScopes(userRole: string): string[] {
  return ROLE_SCOPES_MAP[userRole] || [];
}

// Função para verificar se usuário tem escopos necessários
export function hasRequiredScopes(userScopes: string[], requiredScopes: string[]): boolean {
  if (requiredScopes.length === 0) return true;

  // Se o usuário tem escopo de system admin, tem acesso a tudo
  if (userScopes.includes(SCOPES.SYSTEM_ADMIN)) {
    return true;
  }

  // Verifica se tem todos os escopos necessários (AND) ou pelo menos um (OR)
  // Por padrão, usa OR para ser mais flexível
  return requiredScopes.some(scope => userScopes.includes(scope));
}

// Middleware de verificação de escopos
export function requireScopes(...scopes: string[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user");

    if (!user) {
      return c.json({
        error: "unauthorized",
        message: "Usuário não autenticado",
        required_scopes: scopes
      }, 401);
    }

    try {
      // OTIMIZAÇÃO: Primeiro tentar usar o perfil já carregado pelo tenantAuthMiddleware
      // Evita query redundante ao banco de dados
      let userProfile = user.role ? user : null;

      // Fallback: buscar do banco apenas se não tiver role no contexto
      if (!userProfile || !userProfile.role) {
        const env = c.env;
        userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
        console.log('[RBAC] Buscou perfil do banco (fallback)');
      }

      // Fallback para usuário demo se não encontrar no banco
      if (!userProfile && (user as any).profile) {
        console.log('[RBAC] Usando perfil do contexto (Demo/Mock)');
        const demoUser = user as any;
        userProfile = {
          ...demoUser.profile,
          id: user.id,
          email: user.email,
          name: demoUser.name || user.email
        };
      }

      if (!userProfile) {
        return c.json({
          error: "forbidden",
          message: "Perfil de usuário não encontrado",
          required_scopes: scopes
        }, 403);
      }

      // Obter escopos do usuário baseado no role
      const userScopes = getUserScopes(userProfile.role);

      // Verificar se tem os escopos necessários
      if (!hasRequiredScopes(userScopes, scopes)) {
        return c.json({
          error: "forbidden",
          message: "Permissões insuficientes para acessar este recurso",
          required_scopes: scopes,
          user_scopes: userScopes
        }, 403);
      }

      // Adicionar informações de autorização no contexto
      c.set("userProfile", userProfile);
      c.set("userScopes", userScopes);

      await next();
    } catch (error) {
      console.error('Error in RBAC middleware:', error);
      return c.json({
        error: "internal_error",
        message: "Erro interno na verificação de permissões",
        required_scopes: scopes
      }, 500);
    }
  };
}

// Middleware para proteger o usuário sysadmin específico
export function protectSysAdmin() {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user");
    const method = c.req.method;
    let body: any = {};

    // Parse body safely
    try {
      body = await c.req.json();
    } catch (error) {
      // Body is not JSON or empty
    }

    const targetUserId = c.req.param("id");

    // Proteção absoluta: Bloquear QUALQUER tentativa de modificação do usuário protegido
    if (targetUserId === PROTECTED_SYSADMIN_ID ||
      (body.id && body.id === PROTECTED_SYSADMIN_ID) ||
      (body.email === PROTECTED_SYSADMIN_EMAIL)) {

      if (method === 'PUT' || method === 'PATCH' || method === 'DELETE' || method === 'POST') {
        return c.json({
          error: "forbidden",
          message: "ACESSO NEGADO: Este usuário de sistema está permanentemente protegido contra modificações",
          protected_user: true,
          system_protection: true
        }, 403);
      }
    }

    // Impedir que qualquer usuário (mesmo outros admins) modifique o sysadmin protegido
    if (user && user.id !== PROTECTED_SYSADMIN_ID) {
      // Se está tentando modificar o usuário protegido por ID
      if (targetUserId === PROTECTED_SYSADMIN_ID) {
        return c.json({
          error: "forbidden",
          message: "ACESSO NEGADO: Apenas o próprio usuário de sistema pode acessar esta conta",
          protected_user: true,
          system_protection: true
        }, 403);
      }

      // Se está tentando usar o email protegido
      if (body.email === PROTECTED_SYSADMIN_EMAIL) {
        return c.json({
          error: "forbidden",
          message: "ACESSO NEGADO: Este email está reservado para o sistema",
          protected_user: true,
          system_protection: true
        }, 403);
      }

      // Se está tentando alterar role para system_admin (apenas o sysadmin protegido pode criar outros)
      if (body.role === 'system_admin' || body.role === 'sys_admin') {
        return c.json({
          error: "forbidden",
          message: "ACESSO NEGADO: Apenas o administrador principal pode gerenciar roles de sistema",
          protected_user: true,
          system_protection: true
        }, 403);
      }
    }

    await next();
  };
}

// Middleware específico para verificar se o usuário é o sysadmin protegido
export function requireProtectedSysAdmin() {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user");

    if (!user || (user.id !== PROTECTED_SYSADMIN_ID && user.email !== PROTECTED_SYSADMIN_EMAIL)) {
      return c.json({
        error: "forbidden",
        message: "ACESSO RESTRITO: Esta operação requer autenticação como administrador principal do sistema",
        protected_operation: true
      }, 403);
    }

    await next();
  };
}

// Função para verificar se o usuário é o sysadmin protegido
export function isProtectedSysAdmin(userId: string, userEmail?: string): boolean {
  return isProtectedUser(userId, userEmail);
}

// Função auxiliar para padronizar respostas de erro
export function createAuthErrorResponse(type: 'unauthorized' | 'forbidden', message: string, requiredScopes: string[] = []) {
  return {
    error: type,
    message,
    required_scopes: requiredScopes,
    timestamp: new Date().toISOString()
  };
}

// Função para verificar se usuário é admin de sistema
export function isSystemAdmin(userRole: string): boolean {
  return userRole === USER_ROLES.SYSTEM_ADMIN || userRole === 'sys_admin' || userRole === 'admin';
}

// Função para verificar se usuário pode gerenciar outros usuários
export function canManageUsers(userRole: string): boolean {
  return isSystemAdmin(userRole) || userRole === USER_ROLES.ORG_ADMIN || userRole === 'admin';
}

// Função para verificar se usuário pode gerenciar organizações
export function canManageOrganizations(userRole: string): boolean {
  return isSystemAdmin(userRole) || userRole === USER_ROLES.ORG_ADMIN || userRole === 'admin';
}

