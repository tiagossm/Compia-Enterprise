import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";
import { requireProtectedSysAdmin } from "./rbac-middleware.ts";
import { autoFixSystemAdmin } from "./system-admin-protection.ts";

type Env = {
  DB: any;
};

const systemAdminRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Endpoint para garantir que o usuário eng.tiagosm@gmail.com seja sempre system_admin
systemAdminRoutes.post("/ensure-protected-sysadmin", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const result = await autoFixSystemAdmin(env);

    // Log adicional se necessário
    if (result.success) {
      await env.DB.prepare(`
          INSERT INTO activity_log (user_id, action_type, action_description, target_type, target_id, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `).bind(
        user.id,
        'system_security_check',
        'Verificação e garantia de privilégios de administrador principal do sistema',
        'user',
        '84edf8d1-77d9-4c73-935e-d76745bc3707'
      ).run();
    }

    return c.json({
      success: result.success,
      message: result.message,
      user_id: 'eng.tiagosm',
      user_email: 'eng.tiagosm@gmail.com',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error ensuring protected sysadmin:', error);
    return c.json({ error: "Erro ao verificar privilégios do sistema", details: error.message }, 500);
  }
});

// Endpoint para listar tentativas de modificação bloqueadas (auditoria)
systemAdminRoutes.get("/security-log", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Buscar logs relacionados a tentativas de modificação de segurança
    const securityLogs = await env.DB.prepare(`
      SELECT * FROM activity_log 
      WHERE action_type IN ('system_security_check', 'user_update_blocked', 'user_delete_blocked')
         OR action_description LIKE '%eng.tiagosm@gmail.com%'
         OR target_id = '84edf8d1-77d9-4c73-935e-d76745bc3707'
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return c.json({
      security_logs: securityLogs.results || [],
      protected_user_id: '84edf8d1-77d9-4c73-935e-d76745bc3707',
      protected_user_email: 'eng.tiagosm@gmail.com'
    });

  } catch (error) {
    console.error('Error fetching security logs:', error);
    return c.json({ error: "Erro ao buscar logs de segurança" }, 500);
  }
});

// Endpoint para verificar status de proteção do sistema
systemAdminRoutes.get("/protection-status", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Verificar o status atual do usuário protegido
    const protectedUser = await env.DB.prepare(`
      SELECT id, email, name, role, can_manage_users, can_create_organizations, is_active, created_at, updated_at
      FROM users 
      WHERE email = ? OR id = ?
    `).bind('eng.tiagosm@gmail.com', '84edf8d1-77d9-4c73-935e-d76745bc3707').first() as any;

    if (!protectedUser) {
      return c.json({
        error: "ALERTA DE SEGURANÇA: Usuário protegido não encontrado no sistema!",
        critical: true
      }, 404);
    }

    // Verificar se as configurações estão corretas
    const isCorrectlyConfigured =
      protectedUser.role === USER_ROLES.SYSTEM_ADMIN &&
      protectedUser.can_manage_users === true &&
      protectedUser.can_create_organizations === true &&
      protectedUser.is_active === true;

    // Contar outros system_admins
    const otherSystemAdmins = await env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = ? AND email != ? AND id != ?
    `).bind(USER_ROLES.SYSTEM_ADMIN, 'eng.tiagosm@gmail.com', '84edf8d1-77d9-4c73-935e-d76745bc3707').first() as any;

    return c.json({
      protection_status: {
        protected_user_found: true,
        correctly_configured: isCorrectlyConfigured,
        current_role: protectedUser.role,
        can_manage_users: protectedUser.can_manage_users,
        can_create_organizations: protectedUser.can_create_organizations,
        is_active: protectedUser.is_active,
        last_updated: protectedUser.updated_at
      },
      system_status: {
        other_system_admins_count: otherSystemAdmins?.count || 0,
        protection_middleware_active: true,
        protected_email: 'eng.tiagosm@gmail.com',
        protected_id: '84edf8d1-77d9-4c73-935e-d76745bc3707'
      },
      security_measures: {
        role_modification_blocked: true,
        user_deletion_blocked: true,
        email_change_blocked: true,
        permission_change_blocked: true,
        api_access_restricted: true
      }
    });

  } catch (error) {
    console.error('Error checking protection status:', error);
    return c.json({ error: "Erro ao verificar status de proteção" }, 500);
  }
});

// Endpoint para forçar correção do usuário protegido (em caso de inconsistência)
systemAdminRoutes.post("/force-fix-protected-user", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Primeiro, verificar se o usuário existe
    let protectedUser = await env.DB.prepare(`
      SELECT * FROM users WHERE email = ? OR id = ?
    `).bind('eng.tiagosm@gmail.com', '84edf8d1-77d9-4c73-935e-d76745bc3707').first() as any;

    if (!protectedUser) {
      // Criar o usuário se não existir (situação de emergência)
      await env.DB.prepare(`
        INSERT INTO users (
          id, email, name, role, can_manage_users, can_create_organizations,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `).bind(
        '84edf8d1-77d9-4c73-935e-d76745bc3707',
        'eng.tiagosm@gmail.com',
        'Tiago dos Santos Martins - SysAdmin',
        USER_ROLES.SYSTEM_ADMIN,
        true,
        true,
        true
      ).run();

      await env.DB.prepare(`
        INSERT INTO activity_log (user_id, action_type, action_description, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `).bind(
        user.id,
        'emergency_user_creation',
        'EMERGÊNCIA: Usuário protegido foi recriado no sistema',
        'user',
        '84edf8d1-77d9-4c73-935e-d76745bc3707'
      ).run();

      return c.json({
        success: true,
        message: "EMERGÊNCIA: Usuário protegido foi recriado com privilégios completos",
        action: "created"
      });
    } else {
      // Corrigir configurações se necessário
      await env.DB.prepare(`
        UPDATE users 
        SET role = ?, can_manage_users = ?, can_create_organizations = ?, is_active = ?, updated_at = NOW()
        WHERE email = ? OR id = ?
      `).bind(
        USER_ROLES.SYSTEM_ADMIN,
        true,
        true,
        true,
        'eng.tiagosm@gmail.com',
        '84edf8d1-77d9-4c73-935e-d76745bc3707'
      ).run();

      await env.DB.prepare(`
        INSERT INTO activity_log (user_id, action_type, action_description, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `).bind(
        user.id,
        'forced_user_fix',
        'Correção forçada de privilégios do usuário protegido do sistema',
        'user',
        '84edf8d1-77d9-4c73-935e-d76745bc3707'
      ).run();

      return c.json({
        success: true,
        message: "Usuário protegido foi corrigido com privilégios completos",
        action: "updated"
      });
    }

  } catch (error) {
    console.error('Error fixing protected user:', error);
    return c.json({ error: "Erro ao corrigir usuário protegido" }, 500);
  }
});

// Endpoint para métricas SAAS (Dashboard do System Admin)
systemAdminRoutes.get("/saas-metrics", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // 1. Métricas de Organizações
    const orgsMetrics = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN parent_organization_id IS NULL THEN 1 ELSE 0 END) as master_orgs,
        SUM(CASE WHEN parent_organization_id IS NOT NULL THEN 1 ELSE 0 END) as subsidiaries
      FROM organizations
    `).first();

    // 2. Métricas de Usuários
    const usersMetrics = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
      SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN created_at > (NOW() - INTERVAL '30 days') THEN 1 ELSE 0 END) as new_last_30_days
      FROM users
      `).first();

    // 3. Métricas de Inspeções (Volume Global)
    const inspectionsMetrics = await env.DB.prepare(`
    SELECT
    COUNT(*) as total,
      SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN created_at > (NOW() - INTERVAL '30 days') THEN 1 ELSE 0 END) as created_last_30_days
      FROM inspections
  `).first();

    // 4. Consumo Global de IA (Tokens e Requisições)
    let aiMetrics = { total_tokens: 0, total_cost_est: 0, total_requests: 0 };

    try {
      const aiUsage = await env.DB.prepare(`
          SELECT SUM(total_tokens) as total_tokens 
          FROM ai_usage_logs
      `).first();

      const orgsRequests = await env.DB.prepare(`
          SELECT SUM(ai_usage_count) as total_requests 
          FROM organizations
      `).first();

      aiMetrics.total_requests = orgsRequests?.total_requests || 0;

      if (aiUsage && aiUsage.total_tokens) {
        aiMetrics.total_tokens = aiUsage.total_tokens;
        aiMetrics.total_cost_est = (aiMetrics.total_tokens / 1000) * 0.03;
      }
    } catch (e) {
      console.warn("[SAAS-METRICS] Erro ao buscar métricas de IA:", e);
    }

    return c.json({
      organizations: {
        total: Number(orgsMetrics?.total) || 0,
        active: Number(orgsMetrics?.active) || 0,
        master: Number(orgsMetrics?.master_orgs) || 0,
        subsidiary_ratio: Number(orgsMetrics?.master_orgs) > 0 ? (Number(orgsMetrics?.subsidiaries) / Number(orgsMetrics?.master_orgs)).toFixed(1) : "0"
      },
      users: {
        total: usersMetrics?.total || 0,
        active: usersMetrics?.active || 0,
        growth_30d: usersMetrics?.new_last_30_days || 0
      },
      inspections: {
        total: inspectionsMetrics?.total || 0,
        completed: inspectionsMetrics?.completed || 0,
        volume_30d: inspectionsMetrics?.created_last_30_days || 0
      },
      ai_usage: {
        total_tokens: aiMetrics.total_tokens,
        total_requests: aiMetrics.total_requests,
        estimated_cost_usd: aiMetrics.total_cost_est
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching SaaS metrics:', error);
    return c.json({ error: "Erro ao buscar métricas SaaS" }, 500);
  }
});

// Endpoint para métricas de Business Intelligence (Revenue Intelligence)
systemAdminRoutes.get("/bi-analytics", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // 1. Buscando dados da View Inteligente (Customer Health Score)
    // NOTE: Se a view customer_health_score nao existir ainda, usar fallback
    let customers = [];
    try {
      const healthScores = await env.DB.prepare(`
        SELECT * FROM customer_health_score ORDER BY mrr_value_cents DESC
        `).all();
      customers = healthScores.results || [];
    } catch (e) {
      console.warn('View customer_health_score not found, using empty list');
      customers = [];
    }

    // 2. Churn Risk: Customers with Health Score < 30
    const churnRisk = customers
      .filter((c: any) => c.is_at_risk === true || c.is_at_risk === 1)
      .map((c: any) => ({
        id: c.organization_id,
        name: c.org_name,
        last_activity: new Date().toISOString(),
        health_score: c.health_score,
        mrr: c.mrr_value_cents
      }));

    // 3. Upsell Opportunity: High Usage
    const upsellOpportunity = customers
      .filter((c: any) => c.health_score > 80)
      .map((c: any) => ({
        id: c.organization_id,
        name: c.org_name,
        current_users: 0,
        max_users: 0,
        health_score: c.health_score
      }));

    // 4. MRR Real via Função SQL
    let currentMrr = 0;
    try {
      const mrrResult = await env.DB.prepare("SELECT get_current_mrr() as mrr").first();
      currentMrr = Number(mrrResult?.mrr || 0);
    } catch (e) {
      // Fallback calculation if function doesn't exist
      const mrrCalc = await env.DB.prepare(`
            SELECT SUM(mrr_value_cents) as total 
            FROM subscriptions 
            WHERE status IN ('active', 'trial')
        `).first();
      currentMrr = Number(mrrCalc?.total || 0);
    }

    // 5. AI Adoption Rate
    const totalActiveOrgs = customers.length;
    const aiActiveOrgs = customers.filter((c: any) => c.ai_usage_count > 0).length;
    const aiAdoptionRate = totalActiveOrgs > 0 ? (aiActiveOrgs / totalActiveOrgs) : 0;

    const leadVelocity = { avg_days: 14 };

    return c.json({
      churn_risk: churnRisk,
      upsell_opportunity: upsellOpportunity,
      ai_adoption: {
        total: totalActiveOrgs,
        active: aiActiveOrgs,
        rate: aiAdoptionRate
      },
      lead_velocity: leadVelocity,
      financials: {
        mrr: currentMrr,
        arpu: totalActiveOrgs > 0 ? (currentMrr / totalActiveOrgs) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching BI analytics:', error);
    return c.json({ error: "Erro ao buscar dados de BI" }, 500);
  }
});

export default systemAdminRoutes;
