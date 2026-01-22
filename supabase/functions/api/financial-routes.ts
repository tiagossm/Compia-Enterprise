import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
};

const financialRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// ============================================================================
// GET /plans - Lista todos os planos ativos (público para autenticados)
// ============================================================================
financialRoutes.get("/plans", async (c) => {
    const env = c.env;

    try {
        const plans = await env.DB.prepare(`
            SELECT 
                id, name, display_name, slug, description,
                price_cents, currency, billing_period,
                limits, features, is_active
            FROM plans 
            WHERE is_active = true
            ORDER BY price_cents ASC
        `).all();

        // Formatar preço para exibição
        const formattedPlans = (plans?.results || []).map((plan: any) => ({
            ...plan,
            limits: typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits,
            features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
            price_display: plan.price_cents > 0
                ? `R$ ${(plan.price_cents / 100).toFixed(2).replace('.', ',')}`
                : 'Sob consulta'
        }));

        return c.json({ plans: formattedPlans });
    } catch (error: any) {
        console.error("[FINANCIAL] Error fetching plans:", error);
        return c.json({ error: "Erro ao buscar planos", details: error.message }, 500);
    }
});

// ============================================================================
// GET /billing/current - Retorna a assinatura atual da organização
// ============================================================================
financialRoutes.get("/billing/current", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");
    const organizationId = c.req.query("organization_id");

    if (!user) {
        return c.json({ error: "Usuário não autenticado" }, 401);
    }

    try {
        // Verificar permissão (OrgAdmin ou SysAdmin)
        const userProfile = await env.DB.prepare(
            "SELECT role, managed_organization_id FROM users WHERE id = ?"
        ).bind(user.id).first() as any;

        const isAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
            userProfile?.role === 'sys_admin' ||
            userProfile?.role === USER_ROLES.ORG_ADMIN;

        if (!isAdmin) {
            return c.json({ error: "Apenas administradores podem acessar informações de billing" }, 403);
        }

        // Determinar qual org buscar
        const targetOrgId = organizationId || userProfile?.managed_organization_id;

        if (!targetOrgId) {
            return c.json({ error: "Organização não especificada" }, 400);
        }

        // Buscar assinatura ativa
        const subscription = await env.DB.prepare(`
            SELECT 
                s.id, s.status, s.gateway_name,
                s.current_period_start, s.current_period_end,
                s.trial_ends_at, s.canceled_at,
                s.mrr_value_cents,
                p.name as plan_name, p.display_name as plan_display_name,
                p.price_cents, p.limits, p.features
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.organization_id = ?
            AND s.status NOT IN ('canceled')
            ORDER BY s.created_at DESC
            LIMIT 1
        `).bind(targetOrgId).first() as any;

        // Buscar uso atual (última métrica)
        const usage = await env.DB.prepare(`
            SELECT 
                active_users_count, inspections_count, 
                ai_analyses_count, storage_used_mb, date
            FROM usage_metrics
            WHERE organization_id = ?
            ORDER BY date DESC
            LIMIT 1
        `).bind(targetOrgId).first() as any;

        // Buscar faturas recentes
        const invoices = await env.DB.prepare(`
            SELECT id, amount_cents, status, due_date, paid_at, payment_link
            FROM invoices
            WHERE organization_id = ?
            ORDER BY due_date DESC
            LIMIT 5
        `).bind(targetOrgId).all();

        // Formatar resposta
        const billingInfo = {
            subscription: subscription ? {
                ...subscription,
                limits: typeof subscription.limits === 'string'
                    ? JSON.parse(subscription.limits)
                    : subscription.limits,
                features: typeof subscription.features === 'string'
                    ? JSON.parse(subscription.features)
                    : subscription.features,
                price_display: subscription.price_cents > 0
                    ? `R$ ${(subscription.price_cents / 100).toFixed(2).replace('.', ',')}`
                    : 'Sob consulta'
            } : null,
            usage: usage || {
                active_users_count: 0,
                inspections_count: 0,
                ai_analyses_count: 0,
                storage_used_mb: 0
            },
            invoices: (invoices?.results || []).map((inv: any) => ({
                ...inv,
                amount_display: `R$ ${(inv.amount_cents / 100).toFixed(2).replace('.', ',')}`
            })),
            has_active_subscription: !!subscription
        };

        return c.json(billingInfo);
    } catch (error: any) {
        console.error("[FINANCIAL] Error fetching billing info:", error);
        return c.json({ error: "Erro ao buscar informações de billing", details: error.message }, 500);
    }
});

// ============================================================================
// GET /billing/usage - Retorna o uso atual vs limites do plano
// ============================================================================
financialRoutes.get("/billing/usage", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");
    const organizationId = c.req.query("organization_id");

    if (!user) {
        return c.json({ error: "Usuário não autenticado" }, 401);
    }

    try {
        const userProfile = await env.DB.prepare(
            "SELECT role, managed_organization_id FROM users WHERE id = ?"
        ).bind(user.id).first() as any;

        const targetOrgId = organizationId || userProfile?.managed_organization_id;

        if (!targetOrgId) {
            return c.json({ error: "Organização não especificada" }, 400);
        }

        // Buscar limites do plano
        const subscription = await env.DB.prepare(`
            SELECT p.limits
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.organization_id = ? AND s.status NOT IN ('canceled')
            LIMIT 1
        `).bind(targetOrgId).first() as any;

        const limits = subscription?.limits
            ? (typeof subscription.limits === 'string' ? JSON.parse(subscription.limits) : subscription.limits)
            : { users: 2, storage_gb: 5, inspections_monthly: 100 }; // Default free tier

        // Contar uso atual
        const userCount = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM user_organizations WHERE organization_id = ?
        `).bind(targetOrgId).first() as any;

        const inspectionsThisMonth = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM inspections 
            WHERE organization_id = ? 
            AND created_at >= date('now', 'start of month')
        `).bind(targetOrgId).first() as any;

        // Calcular porcentagens
        const usage = {
            users: {
                current: userCount?.count || 0,
                limit: limits.users || 999,
                percentage: Math.round(((userCount?.count || 0) / (limits.users || 1)) * 100)
            },
            inspections: {
                current: inspectionsThisMonth?.count || 0,
                limit: limits.inspections_monthly || 999,
                percentage: Math.round(((inspectionsThisMonth?.count || 0) / (limits.inspections_monthly || 1)) * 100)
            },
            storage: {
                current: 0, // TODO: Calcular storage real
                limit: limits.storage_gb || 5,
                percentage: 0
            }
        };

        // Alertas
        const alerts = [];
        if (usage.users.percentage >= 80) alerts.push({ type: 'users', level: usage.users.percentage >= 100 ? 'critical' : 'warning' });
        if (usage.inspections.percentage >= 80) alerts.push({ type: 'inspections', level: usage.inspections.percentage >= 100 ? 'critical' : 'warning' });

        return c.json({ usage, alerts, has_subscription: !!subscription });
    } catch (error: any) {
        console.error("[FINANCIAL] Error fetching usage:", error);
        return c.json({ error: "Erro ao buscar uso", details: error.message }, 500);
    }
});

export default financialRoutes;
