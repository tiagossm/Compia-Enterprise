import { Context } from "hono";
import { USER_ROLES } from "./user-types.ts";

// Constantes de segurança - NUNCA ALTERAR ESTES VALORES
export const PROTECTED_SYSADMIN_EMAIL = 'eng.tiagosm@gmail.com';
export const PROTECTED_SYSADMIN_ID = '84edf8d1-77d9-4c73-935e-d76745bc3707';
export const MASTER_ORGANIZATION_ID = 1;

// Função para verificar se um usuário está protegido
export function isProtectedUser(userId: string, userEmail?: string): boolean {
  return userId === PROTECTED_SYSADMIN_ID || userEmail === PROTECTED_SYSADMIN_EMAIL;
}

// Middleware de proteção de usuários críticos
export function criticalUserProtection() {
  return async (c: Context<{ Bindings: Env; Variables: { user: any } }>, next: () => Promise<void>) => {
    const method = c.req.method;
    const path = c.req.path;
    const targetUserId = c.req.param("id");

    // Skip GET requests (apenas proteção para mudanças)
    if (method === 'GET') {
      await next();
      return;
    }

    let body: any = {};
    try {
      body = await c.req.json();
    } catch (error) {
      // Body is not JSON or empty
    }

    // PROTEÇÃO ABSOLUTA: Bloquear qualquer modificação do usuário protegido
    const isTargetingProtectedUser =
      targetUserId === PROTECTED_SYSADMIN_ID ||
      body.id === PROTECTED_SYSADMIN_ID ||
      body.email === PROTECTED_SYSADMIN_EMAIL ||
      body.user_id === PROTECTED_SYSADMIN_ID;

    if (isTargetingProtectedUser && (method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      const user = c.get("user");

      // Log da tentativa de modificação
      try {
        const env = c.env;
        await env.DB.prepare(`
          INSERT INTO security_audit_log (
            user_id, target_user_id, action_type, old_value, new_value, 
            blocked_reason, ip_address, user_agent, is_blocked, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `).bind(
          user?.id || 'anonymous',
          PROTECTED_SYSADMIN_ID,
          `blocked_${method.toLowerCase()}_attempt`,
          JSON.stringify({ path, method }),
          JSON.stringify(body),
          'Tentativa de modificar usuário protegido do sistema',
          c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
          c.req.header('user-agent') || 'unknown',
          true
        ).run();
      } catch (error) {
        console.error('Error logging security attempt:', error);
      }

      return c.json({
        error: "SISTEMA_PROTEGIDO",
        message: "ACESSO NEGADO: Este usuário está sob proteção absoluta do sistema. Tentativa registrada.",
        protected_user: true,
        system_security: true,
        contact_support: "Entre em contato com o suporte técnico se necessário.",
        blocked_at: new Date().toISOString()
      }, 403);
    }

    // Impedir criação de novos system_admin (apenas o protegido pode fazer isso)
    if (body.role === USER_ROLES.SYSTEM_ADMIN || body.role === 'sys_admin') {
      const user = c.get("user");

      if (!user || user.id !== PROTECTED_SYSADMIN_ID) {
        return c.json({
          error: "PRIVILEGIO_RESTRITO",
          message: "Apenas o administrador principal pode conceder privilégios de sistema",
          protected_operation: true
        }, 403);
      }
    }

    await next();
  };
}

// Função para verificar integridade do usuário protegido
export async function checkProtectedUserIntegrity(env: any): Promise<{
  status: 'ok' | 'corrupted' | 'missing';
  details: any;
  fixed?: boolean;
}> {
  try {
    const protectedUser = await env.DB.prepare(`
      SELECT * FROM users WHERE id = ? OR email = ?
    `).bind(PROTECTED_SYSADMIN_ID, PROTECTED_SYSADMIN_EMAIL).first() as any;

    if (!protectedUser) {
      return {
        status: 'missing',
        details: { error: 'Usuário protegido não encontrado no banco de dados' }
      };
    }

    const expectedConfig = {
      role: USER_ROLES.SYSTEM_ADMIN,
      can_manage_users: true,
      can_create_organizations: true,
      is_active: true,
      organization_id: MASTER_ORGANIZATION_ID
    };

    const currentConfig = {
      role: protectedUser.role,
      can_manage_users: Boolean(protectedUser.can_manage_users),
      can_create_organizations: Boolean(protectedUser.can_create_organizations),
      is_active: Boolean(protectedUser.is_active),
      organization_id: protectedUser.organization_id
    };

    const isCorrupted = Object.keys(expectedConfig).some(key =>
      expectedConfig[key as keyof typeof expectedConfig] !== currentConfig[key as keyof typeof currentConfig]
    );

    if (isCorrupted) {
      return {
        status: 'corrupted',
        details: {
          expected: expectedConfig,
          current: currentConfig,
          differences: Object.keys(expectedConfig).filter(key =>
            expectedConfig[key as keyof typeof expectedConfig] !== currentConfig[key as keyof typeof currentConfig]
          )
        }
      };
    }

    return {
      status: 'ok',
      details: { user: protectedUser, configuration: currentConfig }
    };

  } catch (error) {
    return {
      status: 'corrupted',
      details: { error: 'Erro ao verificar integridade do usuário protegido', details: error }
    };
  }
}

// Função para auto-correção do usuário protegido
export async function autoFixProtectedUser(env: any, triggeredBy: string = 'system'): Promise<{
  success: boolean;
  action: 'created' | 'updated' | 'no_action_needed';
  details: any;
}> {
  try {
    const integrityCheck = await checkProtectedUserIntegrity(env);

    if (integrityCheck.status === 'ok') {
      return {
        success: true,
        action: 'no_action_needed',
        details: { message: 'Usuário protegido já está configurado corretamente' }
      };
    }

    if (integrityCheck.status === 'missing') {
      // Recriar usuário completamente
      await env.DB.prepare(`
        INSERT OR REPLACE INTO users (
          id, email, name, role, organization_id,
          can_manage_users, can_create_organizations, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `).bind(
        PROTECTED_SYSADMIN_ID,
        PROTECTED_SYSADMIN_EMAIL,
        'Tiago dos Santos Martins - SysAdmin',
        USER_ROLES.SYSTEM_ADMIN,
        MASTER_ORGANIZATION_ID,
        true,
        true,
        true
      ).run();

      // Garantir associação com organização master
      await env.DB.prepare(`
        INSERT OR REPLACE INTO user_organizations (
          user_id, organization_id, role, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
      `).bind(PROTECTED_SYSADMIN_ID, MASTER_ORGANIZATION_ID, 'owner', true).run();

      // Adicionar à tabela de usuários protegidos
      await env.DB.prepare(`
        INSERT OR REPLACE INTO protected_users (
          user_id, protection_level, protected_roles, protected_permissions,
          reason, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `).bind(
        PROTECTED_SYSADMIN_ID,
        'maximum',
        JSON.stringify([USER_ROLES.SYSTEM_ADMIN]),
        JSON.stringify(['can_manage_users', 'can_create_organizations']),
        'Usuário fundador do sistema - proteção máxima permanente',
        triggeredBy
      ).run();

      return {
        success: true,
        action: 'created',
        details: { message: 'Usuário protegido foi recriado com configurações de segurança máxima' }
      };
    }

    if (integrityCheck.status === 'corrupted') {
      // Corrigir configurações
      await env.DB.prepare(`
        UPDATE users 
        SET role = ?, organization_id = ?, can_manage_users = ?, 
            can_create_organizations = ?, is_active = ?, updated_at = NOW()
        WHERE id = ? OR email = ?
      `).bind(
        USER_ROLES.SYSTEM_ADMIN,
        MASTER_ORGANIZATION_ID,
        true,
        true,
        true,
        PROTECTED_SYSADMIN_ID,
        PROTECTED_SYSADMIN_EMAIL
      ).run();

      // Garantir associação correta com organização
      await env.DB.prepare(`
        INSERT OR REPLACE INTO user_organizations (
          user_id, organization_id, role, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
      `).bind(PROTECTED_SYSADMIN_ID, MASTER_ORGANIZATION_ID, 'owner', true).run();

      return {
        success: true,
        action: 'updated',
        details: {
          message: 'Configurações do usuário protegido foram corrigidas',
          fixed_issues: integrityCheck.details.differences
        }
      };
    }

    return {
      success: false,
      action: 'no_action_needed',
      details: { error: 'Status de integridade desconhecido' }
    };

  } catch (error) {
    console.error('Error in autoFixProtectedUser:', error);
    return {
      success: false,
      action: 'no_action_needed',
      details: { error: 'Erro ao corrigir usuário protegido', details: error }
    };
  }
}

// Middleware para verificação automática de integridade
export function autoIntegrityCheck() {
  return async (c: Context<{ Bindings: Env; Variables: { user: any } }>, next: () => Promise<void>) => {
    const user = c.get("user");

    // Executar verificação apenas para requisições do usuário protegido
    if (user && user.id === PROTECTED_SYSADMIN_ID) {
      try {
        const env = c.env;
        const integrityResult = await checkProtectedUserIntegrity(env);

        if (integrityResult.status !== 'ok') {
          console.warn('ALERTA DE SEGURANÇA: Integridade do usuário protegido comprometida');

          // Auto-correção silenciosa
          const fixResult = await autoFixProtectedUser(env, user.id);

          if (fixResult.success) {
            console.log('SEGURANÇA: Usuário protegido foi auto-corrigido', fixResult);

            // Log da correção automática
            await env.DB.prepare(`
              INSERT INTO security_audit_log (
                user_id, target_user_id, action_type, old_value, new_value,
                blocked_reason, is_blocked, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `).bind(
              'system',
              PROTECTED_SYSADMIN_ID,
              'auto_integrity_fix',
              JSON.stringify(integrityResult.details),
              JSON.stringify(fixResult.details),
              'Correção automática de integridade do usuário protegido',
              false
            ).run();
          }
        }
      } catch (error) {
        console.error('Error in auto integrity check:', error);
      }
    }

    await next();
  };
}

// Middleware para logs de segurança detalhados
export function securityAuditLogger() {
  return async (c: Context<{ Bindings: Env; Variables: { user: any } }>, next: () => Promise<void>) => {
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const user = c.get("user");

    // Capturar dados da requisição para auditoria
    let requestBody: any = null;
    if (method !== 'GET') {
      try {
        requestBody = await c.req.json();
      } catch (error) {
        // Body is not JSON
      }
    }

    await next();

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Log requisições sensíveis
    const sensitiveOperations = [
      '/api/users',
      '/api/system-admin',
      '/api/multi-tenant',
      '/api/role-permissions'
    ];

    const isSensitive = sensitiveOperations.some(op => path.includes(op));

    if (isSensitive && user) {
      try {
        const env = c.env;
        await env.DB.prepare(`
          INSERT INTO security_audit_log (
            user_id, action_type, old_value, new_value,
            ip_address, user_agent, is_blocked, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `).bind(
          user.id,
          `${method.toLowerCase()}_${path.replace('/api/', '').replace(/\//g, '_')}`,
          JSON.stringify({ method, path, responseTime }),
          requestBody ? JSON.stringify(requestBody) : null,
          c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
          c.req.header('user-agent') || 'unknown',
          false
        ).run();
      } catch (error) {
        console.error('Error logging security audit:', error);
      }
    }
  };
}

