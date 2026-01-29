import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

type Env = {
  DB: any;
};

const dashboardRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>()
  .basePath('/api/dashboard');

// GET estatísticas gerais do dashboard
dashboardRoutes.get("/stats", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const organizationId = c.req.query("organization_id");

  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }

  try {
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    let whereClause = "";
    let params: any[] = [];

    const isAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN || userProfile?.role === 'sys_admin';

    if (organizationId) {
      // Se um organization_id for fornecido na query, filtre por ele.
      // O middleware de autenticação (AuthGuard) já garante que o usuário
      // tenha acesso ao scope desta organização.
      whereClause = "WHERE organization_id = ?";
      params.push(organizationId);
    } else if (isAdmin) {
      // SYSTEM_ADMIN vê tudo (sem filtro)
      whereClause = "";
      params = [];
    } else if (userProfile?.role === USER_ROLES.ORG_ADMIN && userProfile.managed_organization_id) {
      // Para Org Admins, se nenhum organization_id específico for fornecido,
      // filtre pela organização gerenciada e suas subsidiárias
      whereClause = `
        WHERE organization_id IN (
          SELECT id FROM organizations 
          WHERE id = ? OR parent_organization_id = ?
        )
      `;
      params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
    } else {
      // Para usuários comuns (não-admin), filtre pela sua organização OU atribuições
      const userEmail = userProfile.email || user.email;
      whereClause = "WHERE (organization_id = ? OR inspector_email = ?)";
      // Ensure no undefined values are pushed
      params.push(userProfile.organization_id || 0, userEmail || '');
    }

    const total = await env.DB.prepare(`SELECT COUNT(*) as count FROM inspections ${whereClause}`).bind(...params).first() as any;
    const pending = await env.DB.prepare(`SELECT COUNT(*) as count FROM inspections ${whereClause}${whereClause ? ' AND' : ' WHERE'} status = 'pendente'`).bind(...params).first() as any;
    const inProgress = await env.DB.prepare(`SELECT COUNT(*) as count FROM inspections ${whereClause}${whereClause ? ' AND' : ' WHERE'} status = 'em_andamento'`).bind(...params).first() as any;
    const completed = await env.DB.prepare(`SELECT COUNT(*) as count FROM inspections ${whereClause}${whereClause ? ' AND' : ' WHERE'} status = 'concluida'`).bind(...params).first() as any;

    return c.json({
      total: total?.count || 0,
      pending: pending?.count || 0,
      inProgress: inProgress?.count || 0,
      completed: completed?.count || 0,
    });

  } catch (error) {
    console.error('[DASHBOARD-STATS] Erro ao buscar estatísticas:', error);
    // Return empty stats instead of error 500
    return c.json({
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0
    });
  }
});

// GET sumário do plano de ação do dashboard
dashboardRoutes.get("/action-plan-summary", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const organizationId = c.req.query("organization_id");

  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }

  try {
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    let whereClause = "";
    let params: any[] = [];

    const isAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN || userProfile?.role === 'sys_admin';

    if (organizationId) {
      whereClause = "WHERE i.organization_id = ?";
      params.push(organizationId);
    } else if (isAdmin) {
      // SYSTEM_ADMIN vê tudo (sem filtro)
      whereClause = "";
      params = [];
    } else if (userProfile?.role === USER_ROLES.ORG_ADMIN && userProfile.managed_organization_id) {
      whereClause = `
        WHERE i.organization_id IN (
          SELECT id FROM organizations 
          WHERE id = ? OR parent_organization_id = ?
        )
      `;
      params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
    } else {
      const userEmail = userProfile.email || user.email;
      whereClause = "WHERE (i.organization_id = ? OR i.inspector_email = ?)";
      params.push(userProfile.organization_id || 0, userEmail || '');
    }

    const allActions = await env.DB.prepare(`
      SELECT 
        ai.status, 
        ai.priority, 
        ai.when_deadline, 
        ai.is_ai_generated 
      FROM action_items ai
      JOIN inspections i ON ai.inspection_id = i.id
      ${whereClause}
    `).bind(...params).all() as any;

    const actions = allActions.results || [];
    const now = new Date();

    const summary = actions.reduce((acc: any, action: any) => {
      acc.total_actions++;
      if (action.status === 'pending') acc.pending_actions++;
      if (action.status === 'in_progress') acc.in_progress_actions++;
      if (action.status === 'completed') acc.completed_actions++;
      if (action.is_ai_generated) acc.ai_generated_count++;

      if (action.when_deadline) {
        const deadlineDate = new Date(action.when_deadline);
        if (action.status !== 'completed' && deadlineDate < now) {
          acc.overdue_actions++;
        }
        if (action.status !== 'completed' && deadlineDate > now && (deadlineDate.getTime() - now.getTime()) < (7 * 24 * 60 * 60 * 1000)) {
          acc.upcoming_deadline++;
        }
      }
      if (action.status !== 'completed' && action.priority === 'alta') {
        acc.high_priority_pending++;
      }
      return acc;
    }, {
      total_actions: 0,
      pending_actions: 0,
      in_progress_actions: 0,
      completed_actions: 0,
      upcoming_deadline: 0,
      overdue_actions: 0,
      high_priority_pending: 0,
      ai_generated_count: 0
    });

    return c.json(summary);

  } catch (error) {
    console.error('[DASHBOARD-ACTIONS] Erro ao buscar sumário do plano de ação:', error);
    // Return empty summary instead of error 500
    return c.json({
      total_actions: 0,
      pending_actions: 0,
      in_progress_actions: 0,
      completed_actions: 0,
      upcoming_deadline: 0,
      overdue_actions: 0,
      high_priority_pending: 0,
      ai_generated_count: 0
    });
  }
});


// GET BI Analytics (Proactive Insights)
dashboardRoutes.get("/bi-analytics", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  // Only System Admins or Org Admins can see this
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    // --- 1. CHURN RISK (Organizations inactive > 30 days) ---
    // Definition: Active organizations that haven't created an inspection in 30 days
    const churnRiskQuery = `
            SELECT o.id, o.name, MAX(i.created_at) as last_activity
            FROM organizations o
            LEFT JOIN inspections i ON o.id = i.organization_id
            WHERE o.is_active = true 
            AND o.type = 'company'
            GROUP BY o.id, o.name
            HAVING MAX(i.created_at) < (NOW() - INTERVAL '30 days') OR MAX(i.created_at) IS NULL
            LIMIT 5
        `;
    const churnRisk = await env.DB.prepare(churnRiskQuery).all();

    // --- 2. UPSELL OPPORTUNITY (Close to limits) ---
    // Definition: Organizations where user count > 80% of max_users
    // Note: Assuming 'max_users' column exists in organizations (from create_organization logic)
    // If not, we fall back to a fixed number (e.g. 5)
    const upsellQuery = `
            SELECT 
                o.id, 
                o.name, 
                COUNT(u.id) as current_users,
                COALESCE(o.max_users, 5) as max_users
            FROM organizations o
            LEFT JOIN users u ON o.id = u.organization_id
            WHERE o.is_active = true
            GROUP BY o.id, o.name, o.max_users
            HAVING COUNT(u.id) >= (COALESCE(o.max_users, 5) * 0.8)
            LIMIT 5
        `;
    const upsellOpp = await env.DB.prepare(upsellQuery).all();

    // --- 3. AI ADOPTION (Stickiness) ---
    // Definition: % of inspections created in last 30 days that have AI Action Items
    const aiAdoptionQuery = `
            SELECT 
                COUNT(DISTINCT i.id) as total_inspections,
                COUNT(DISTINCT CASE WHEN ai.is_ai_generated = true THEN i.id END) as ai_inspections
            FROM inspections i
            LEFT JOIN action_items ai ON i.id = ai.inspection_id
            WHERE i.created_at > (NOW() - INTERVAL '30 days')
        `;
    const aiAdoption = await env.DB.prepare(aiAdoptionQuery).first();

    // --- 4. LEAD VELOCITY (Sales Efficiency) ---
    // Definition: Avg days between created_at and updated_at for WON leads
    // Only considers leads won in the last 60 days to be relevant
    const leadVelocityQuery = `
            SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days
            FROM leads
            WHERE status = 'won'
            AND updated_at > (NOW() - INTERVAL '60 days')
        `;
    const leadVelocity = await env.DB.prepare(leadVelocityQuery).first();


    return c.json({
      churn_risk: churnRisk.results || [],
      upsell_opportunity: upsellOpp.results || [],
      ai_adoption: {
        total: aiAdoption?.total_inspections || 0,
        active: aiAdoption?.ai_inspections || 0,
        rate: aiAdoption?.total_inspections ? (aiAdoption.ai_inspections / aiAdoption.total_inspections) : 0
      },
      lead_velocity: {
        avg_days: Math.round(leadVelocity?.avg_days || 0)
      }
    });

  } catch (error) {
    console.error('[BI-ANALYTICS] Error:', error);
    return c.json({ error: 'Failed to fetch BI analytics' }, 500);
  }

});

// GET Org Admin Analytics (Productivity & Quality)
dashboardRoutes.get("/org-admin-analytics", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const organizationId = c.req.query("organization_id");

  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    let targetOrgId = organizationId;
    if (!targetOrgId) {
      if (userProfile.role === USER_ROLES.ORG_ADMIN) {
        targetOrgId = userProfile.managed_organization_id || userProfile.organization_id;
      } else {
        targetOrgId = userProfile.organization_id;
      }
    }

    if (!targetOrgId) return c.json({ error: "Organization ID required" }, 400);

    // 1. Productivity (Inspections by Inspector)
    const productivityParam = targetOrgId; // bind param
    const productivityQuery = `
      SELECT 
        inspector_name, 
        COUNT(*) as total_inspections 
      FROM inspections 
      WHERE organization_id = ? 
      AND created_at > (NOW() - INTERVAL '30 days')
      GROUP BY inspector_name 
      ORDER BY total_inspections DESC 
      LIMIT 10
    `;
    const productivity = await env.DB.prepare(productivityQuery).bind(productivityParam).all();

    // 2. Action Plan Bottlenecks (Overdue by Responsible/Area)
    // Note: 'department' or 'responsible' might not be normalized, using inspector_email as proxy for now if needed, 
    // or better, just grouping by priority/status for this org.
    const bottlenecksQuery = `
      SELECT 
        priority,
        COUNT(*) as count
      FROM action_items 
      JOIN inspections ON action_items.inspection_id = inspections.id
      WHERE inspections.organization_id = ?
      AND action_items.status = 'pending'
      AND (action_items.when_deadline < NOW() OR action_items.priority = 'alta')
      GROUP BY priority
    `;
    const bottlenecks = await env.DB.prepare(bottlenecksQuery).bind(targetOrgId).all();

    // 3. Quality Risks (Fast inspections or Many Non-Conformities)
    // For now, let's just count average non-conformities per inspection
    // assuming we have a way to count items. Since we don't have 'items' table joined easily here without complexity,
    // we will return a placeholder or simple metric like "Avg Action Items per Inspection"
    const qualityQuery = `
      SELECT 
        AVG(sub.action_count) as avg_actions_per_inspection
      FROM (
        SELECT inspection_id, COUNT(*) as action_count
        FROM action_items ai
        JOIN inspections i ON ai.inspection_id = i.id
        WHERE i.organization_id = ?
        GROUP BY inspection_id
      ) sub
    `;
    const quality = await env.DB.prepare(qualityQuery).bind(targetOrgId).first();

    return c.json({
      productivity: productivity.results || [],
      bottlenecks: bottlenecks.results || [],
      quality: {
        avg_actions: Math.round(Number(quality?.avg_actions_per_inspection || 0))
      }
    });

  } catch (error) {
    console.error('[ORG-ADMIN-ANALYTICS] Error:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});



// GET Inspector Personal Analytics (My Performance)
dashboardRoutes.get("/inspector-analytics", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const organizationId = c.req.query("organization_id");

  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    // For inspector analytics, we strictly use the logged-in user's email/id
    const inspectorEmail = userProfile.email || user.email;
    const targetOrgId = organizationId || userProfile.organization_id;

    if (!targetOrgId) return c.json({ error: "Organization context required" }, 400);

    // 1. My Inspections (This Month vs Total)
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN created_at > DATE('now', 'start of month') THEN 1 ELSE 0 END) as this_month,
        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as completed
      FROM inspections
      WHERE organization_id = ? AND inspector_email = ?
    `;
    const stats = await env.DB.prepare(statsQuery).bind(targetOrgId, inspectorEmail).first();

    // 2. My Pending Actions ( Assigned to me or My Inspections)
    const pendingActionsQuery = `
      SELECT COUNT(*) as count
      FROM action_items ai
      JOIN inspections i ON ai.inspection_id = i.id
      WHERE i.organization_id = ? 
      AND i.inspector_email = ?
      AND ai.status = 'pending'
    `;
    const pendingActions = await env.DB.prepare(pendingActionsQuery).bind(targetOrgId, inspectorEmail).first();

    // 3. Motivational Feedback
    let feedback = "Continue o bom trabalho!";
    const monthlyCount = Number(stats?.this_month || 0);
    if (monthlyCount > 10) feedback = "🔥 Incrível! Você está voando baixo este mês!";
    else if (monthlyCount > 5) feedback = "Ótimo ritmo! Continue assim.";
    else if (monthlyCount === 0) feedback = "Que tal iniciar sua primeira inspeção do mês hoje?";

    return c.json({
      my_stats: {
        total: stats?.total || 0,
        this_month: stats?.this_month || 0,
        completed: stats?.completed || 0,
        pending_actions: pendingActions?.count || 0
      },
      feedback_message: feedback
    });

  } catch (error) {
    console.error('[INSPECTOR-ANALYTICS] Error:', error);
    return c.json({ error: 'Failed to fetch personal analytics' }, 500);
  }
});


export default dashboardRoutes;


