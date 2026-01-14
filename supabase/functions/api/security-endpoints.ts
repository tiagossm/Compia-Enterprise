import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";
import { requireProtectedSysAdmin } from "./rbac-middleware.ts";
import {
  checkProtectedUserIntegrity,
  autoFixProtectedUser,
  PROTECTED_SYSADMIN_EMAIL,
  PROTECTED_SYSADMIN_ID,
  MASTER_ORGANIZATION_ID
} from "./security-protection.ts";
import { autoFixSystemAdmin } from "./system-admin-protection.ts";

const securityRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Endpoint para verificação manual da integridade do sistema
securityRoutes.get("/integrity-check", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const integrityResult = await checkProtectedUserIntegrity(env);

    // Verificar também a proteção na tabela
    const protectionRecord = await env.DB.prepare(`
      SELECT * FROM protected_users WHERE user_id = ?
    `).bind(PROTECTED_SYSADMIN_ID).first() as any;

    // Verificar organização master
    const masterOrg = await env.DB.prepare(`
      SELECT * FROM organizations WHERE id = ?
    `).bind(MASTER_ORGANIZATION_ID).first() as any;

    // Verificar associação com organização
    const userOrgAssociation = await env.DB.prepare(`
      SELECT * FROM user_organizations 
      WHERE user_id = ? AND organization_id = ?
    `).bind(PROTECTED_SYSADMIN_ID, MASTER_ORGANIZATION_ID).first() as any;

    return c.json({
      system_integrity: {
        protected_user: integrityResult,
        protection_record: protectionRecord ? "configured" : "missing",
        master_organization: masterOrg ? "exists" : "missing",
        user_org_association: userOrgAssociation ? "linked" : "missing"
      },
      security_status: {
        overall_status: integrityResult.status === 'ok' && protectionRecord && masterOrg && userOrgAssociation ? 'secure' : 'needs_attention',
        protected_user_id: PROTECTED_SYSADMIN_ID,
        protected_user_email: PROTECTED_SYSADMIN_EMAIL,
        master_organization_id: MASTER_ORGANIZATION_ID
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking system integrity:', error);
    return c.json({ error: "Failed to check system integrity" }, 500);
  }
});

// Endpoint para auto-correção do sistema
securityRoutes.post("/auto-fix", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const fixResult = await autoFixProtectedUser(env, user.id);

    // Garantir que existe entrada na tabela de proteção
    await env.DB.prepare(`
      INSERT OR REPLACE INTO protected_users (
        user_id, protection_level, protected_roles, protected_permissions,
        reason, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      PROTECTED_SYSADMIN_ID,
      'maximum',
      JSON.stringify(['system_admin']),
      JSON.stringify(['can_manage_users', 'can_create_organizations']),
      'Usuário fundador - proteção máxima contra modificações não autorizadas',
      user.id
    ).run();

    // Log da operação de segurança
    await env.DB.prepare(`
      INSERT INTO security_audit_log (
        user_id, target_user_id, action_type, new_value,
        blocked_reason, is_blocked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      PROTECTED_SYSADMIN_ID,
      'manual_security_fix',
      JSON.stringify(fixResult),
      'Correção manual de segurança executada pelo administrador',
      false
    ).run();

    return c.json({
      success: true,
      fix_result: fixResult,
      protection_updated: true,
      message: "Sistema de segurança verificado e corrigido",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fixing system security:', error);
    return c.json({ error: "Failed to fix system security" }, 500);
  }
});

// Endpoint para visualizar logs de segurança
securityRoutes.get("/audit-logs", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    // Buscar logs de segurança relacionados ao usuário protegido
    const securityLogs = await env.DB.prepare(`
      SELECT * FROM security_audit_log 
      WHERE target_user_id = ? OR user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(PROTECTED_SYSADMIN_ID, PROTECTED_SYSADMIN_ID, limit, offset).all();

    // Contar total de logs
    const totalCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM security_audit_log 
      WHERE target_user_id = ? OR user_id = ?
    `).bind(PROTECTED_SYSADMIN_ID, PROTECTED_SYSADMIN_ID).first() as any;

    // Buscar tentativas bloqueadas nas últimas 24h
    const recentBlocked = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM security_audit_log 
      WHERE is_blocked = 1 AND created_at >= datetime('now', '-24 hours')
    `).first() as any;

    return c.json({
      audit_logs: securityLogs.results || [],
      pagination: {
        total: totalCount?.count || 0,
        limit,
        offset,
        has_more: (totalCount?.count || 0) > (offset + limit)
      },
      security_stats: {
        recent_blocked_attempts: recentBlocked?.count || 0,
        protected_user_id: PROTECTED_SYSADMIN_ID
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return c.json({ error: "Failed to fetch audit logs" }, 500);
  }
});

// Endpoint para verificar se há usuários órfãos ou com configurações incorretas
securityRoutes.get("/system-health", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Verificar usuários com role system_admin
    const systemAdmins = await env.DB.prepare(`
      SELECT id, email, name, role, is_active, organization_id 
      FROM users 
      WHERE role = 'system_admin'
    `).all();

    // Verificar usuários órfãos (sem organização)
    const orphanUsers = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE organization_id IS NULL AND role != 'system_admin'
    `).first() as any;

    // Verificar organizações sem dono
    const organizationsWithoutOwner = await env.DB.prepare(`
      SELECT o.id, o.name FROM organizations o
      LEFT JOIN user_organizations uo ON o.id = uo.organization_id AND uo.role = 'owner'
      WHERE uo.organization_id IS NULL
    `).all();

    // Verificar usuários com permissões inconsistentes
    const inconsistentUsers = await env.DB.prepare(`
      SELECT id, email, role, can_manage_users, can_create_organizations 
      FROM users 
      WHERE (role = 'org_admin' AND (can_manage_users = 0 OR can_create_organizations = 0))
         OR (role = 'system_admin' AND (can_manage_users = 0 OR can_create_organizations = 0))
         OR (role NOT IN ('system_admin', 'org_admin') AND (can_manage_users = 1 OR can_create_organizations = 1))
    `).all();

    return c.json({
      system_health: {
        system_admins: {
          count: systemAdmins.results?.length || 0,
          users: systemAdmins.results || []
        },
        orphan_users: orphanUsers?.count || 0,
        organizations_without_owner: {
          count: organizationsWithoutOwner.results?.length || 0,
          organizations: organizationsWithoutOwner.results || []
        },
        inconsistent_permissions: {
          count: inconsistentUsers.results?.length || 0,
          users: inconsistentUsers.results || []
        }
      },
      health_status: {
        overall: "analyzing",
        issues_found: (orphanUsers?.count || 0) + (organizationsWithoutOwner.results?.length || 0) + (inconsistentUsers.results?.length || 0),
        protected_user_secure: true
      },
      recommendations: [
        "Manter apenas um usuário system_admin principal",
        "Associar usuários órfãos a organizações apropriadas",
        "Garantir que todas as organizações tenham um proprietário",
        "Corrigir permissões inconsistentes de usuários"
      ]
    });

  } catch (error) {
    console.error('Error checking system health:', error);
    return c.json({ error: "Failed to check system health" }, 500);
  }
});

// Auto-fix endpoint adicional - Corrige problemas automaticamente (versão simplificada)
securityRoutes.post('/auto-fix-simple', authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  // Verificar se é system_admin ou admin principal
  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  const isSystemAdmin = userProfile?.role === 'sys_admin' ||
    userProfile?.role === 'system_admin' ||
    user.email === 'eng.tiagosm@gmail.com';

  if (!isSystemAdmin) {
    return c.json({ error: 'Acesso negado. Apenas system_admin pode executar auto-correção.' }, 403);
  }

  try {
    console.log('[AUTO-FIX-SIMPLE] Iniciando auto-correção do sistema...');

    const result = await autoFixSystemAdmin(env);

    if (result.success) {
      return c.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      return c.json({
        success: false,
        error: result.message
      }, 500);
    }
  } catch (error) {
    console.error('[AUTO-FIX-SIMPLE] Erro na auto-correção:', error);
    return c.json({
      error: 'Erro interno na auto-correção',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

export default securityRoutes;

