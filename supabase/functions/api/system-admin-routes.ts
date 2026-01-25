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
  console.log('[SystemAdmin] Accessing BI Analytics Endpoint');
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const debugErrors: any = {};

    // 0. Fetch System Goals
    const goalsMap: Record<string, number> = {};
    try {
      const goalsResult = await env.DB.prepare("SELECT metric_key, target_value FROM system_goals").all();
      if (goalsResult.results) {
        goalsResult.results.forEach((g: any) => {
          goalsMap[g.metric_key] = Number(g.target_value);
        });
      }
    } catch (e: any) {
      console.error('Error fetching goals:', e);
      debugErrors.goals = e.message;
    }

    // 1. Buscando dados da View Inteligente (Customer Health Score)
    let customers: any[] = [];
    try {
      const healthScores = await env.DB.prepare(`
        SELECT * FROM customer_health_score ORDER BY mrr_value_cents DESC
        `).all();
      customers = healthScores.results || [];
    } catch (e: any) {
      console.warn('View customer_health_score not found, using empty list');
      debugErrors.customers = e.message;
      customers = [];
    }

    // 2. Churn Risk
    const churnRisk = customers
      .filter((c: any) => c.is_at_risk === true || c.is_at_risk === 1)
      .map((c: any) => ({
        id: c.organization_id,
        name: c.org_name,
        last_activity: new Date().toISOString(), // In real app, verify audit log
        health_score: c.health_score,
        mrr: c.mrr_value_cents
      }));

    // 3. Upsell Opportunity
    const upsellOpportunity = customers
      .filter((c: any) => c.health_score > 80)
      .map((c: any) => ({
        id: c.organization_id,
        name: c.org_name,
        current_users: c.usage_score ? Math.round(c.usage_score * 0.5) : 10, // Placeholder if field missing
        max_users: 20, // Placeholder
        health_score: c.health_score
      }));

    // 4. MRR Real via View/Function
    let currentMrr = 0;
    try {
      const mrrResult = await env.DB.prepare("SELECT get_current_mrr() as mrr").first();
      currentMrr = Number(mrrResult?.mrr || 0);
    } catch (e: any) {
      try {
        const mrrCalc = await env.DB.prepare(`
                SELECT SUM(mrr_value_cents) as total 
                FROM subscriptions 
                WHERE status IN ('active', 'trial')
            `).first();
        currentMrr = Number(mrrCalc?.total || 0);
      } catch (e2: any) {
        debugErrors.mrr = e2.message;
      }
    }

    // 5. Chart Data (Historical Revenue)
    let chartData: any[] = [];
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      const dateStr = sixMonthsAgo.toISOString().split('T')[0];

      // Safe query avoiding TO_CHAR if uncertain, but keeping TO_CHAR for now as it is Postgres
      const revenueHistory = await env.DB.prepare(`
            SELECT 
                TO_CHAR(paid_at, 'Mon') as name,
                DATE_TRUNC('month', paid_at) as month_date,
                SUM(amount) as revenue
            FROM invoices
            WHERE status = 'paid' AND paid_at >= ?
            GROUP BY DATE_TRUNC('month', paid_at), TO_CHAR(paid_at, 'Mon')
            ORDER BY month_date ASC
        `).bind(dateStr).all();

      chartData = revenueHistory.results || [];
    } catch (e: any) {
      console.error('Error fetching chart data:', e);
      debugErrors.chart_data = e.message;
      chartData = [];
    }

    // If no history, mock ONLY if it's a fresh install to show potential
    if (chartData.length === 0 && currentMrr === 0) {
      chartData = []; // Return empty, let frontend handle "No Data" state
    }

    // 6. AI Adoption Rate
    const totalActiveOrgs = customers.length;
    const aiActiveOrgs = customers.filter((c: any) => c.ai_usage_count > 0).length;
    const aiAdoptionRate = totalActiveOrgs > 0 ? (aiActiveOrgs / totalActiveOrgs) : 0;

    // 7. Plan Distribution (New)
    let planDistribution: any[] = [];
    try {
      const planDistResult = await env.DB.prepare(`
            SELECT subscription_plan as name, COUNT(*) as value
            FROM organizations
            WHERE is_active = true
            GROUP BY subscription_plan
        `).all();
      planDistribution = planDistResult.results || [];
    } catch (e: any) {
      debugErrors.plan_dist = e.message;
    }

    // 8. Customer Status (New)
    let customerStatus = { active: 0, inactive: 0 };
    try {
      const custStatusResult = await env.DB.prepare(`
            SELECT 
                SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive
            FROM organizations
        `).first();
      if (custStatusResult) {
        customerStatus.active = Number(custStatusResult.active || 0);
        customerStatus.inactive = Number(custStatusResult.inactive || 0);
      }
    } catch (e: any) {
      debugErrors.cust_status = e.message;
    }

    // 9. Revenue Concentration (Top 5)
    // Using health score view which already sorts by MRR
    const topClients = customers.slice(0, 5).map((c: any) => ({
      name: c.org_name,
      mrr: c.mrr_value_cents,
      percentage: currentMrr > 0 ? (c.mrr_value_cents / currentMrr) * 100 : 0
    }));

    return c.json({
      goals: goalsMap,
      churn_risk: churnRisk,
      upsell_opportunity: upsellOpportunity,
      ai_adoption: {
        total: totalActiveOrgs,
        active: aiActiveOrgs,
        rate: aiAdoptionRate
      },
      financials: {
        mrr: currentMrr,
        arpu: totalActiveOrgs > 0 ? (currentMrr / totalActiveOrgs) : 0
      },
      chart_data: chartData,
      plan_distribution: planDistribution,
      customer_status: customerStatus,
      revenue_concentration: topClients,
      _debug_errors: debugErrors
    });

  } catch (error) {
    console.error('Error fetching BI analytics:', error);
    return c.json({ error: "Erro ao buscar dados de BI" }, 500);
  }
});

// Endpoint para Atualizar Metas
systemAdminRoutes.post("/goals", authMiddleware, requireProtectedSysAdmin(), async (c) => {
  try {
    const env = c.env;
    const body = await c.req.json();
    const { metric_key, target_value } = body;

    await env.DB.prepare(`
            INSERT INTO system_goals (metric_key, target_value, updated_at)
            VALUES (?, ?, NOW())
            ON CONFLICT (metric_key) DO UPDATE SET
                target_value = excluded.target_value,
                updated_at = NOW()
        `).bind(metric_key, target_value).run();

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default systemAdminRoutes;
