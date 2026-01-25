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
// GET /current - Retorna a assinatura atual da organização
// ============================================================================
financialRoutes.get("/current", tenantAuthMiddleware, async (c) => {
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
// GET /usage - Retorna o uso atual vs limites do plano
// ============================================================================
financialRoutes.get("/usage", tenantAuthMiddleware, async (c) => {
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
        // 1. Fetch Subscription first (most recent active)
        const subscription = await env.DB.prepare(`
            SELECT plan_id, current_period_start, created_at, status
            FROM subscriptions 
            WHERE organization_id = ? AND status NOT IN ('canceled')
            ORDER BY created_at DESC
            LIMIT 1
        `).bind(targetOrgId).first() as any;

        let limits: any = null;

        if (subscription && subscription.plan_id) {
            // 2. Fetch Plan details
            const plan = await env.DB.prepare(`
                SELECT limits FROM plans WHERE id = ?
             `).bind(subscription.plan_id).first() as any;

            if (plan?.limits) {
                try {
                    limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
                } catch (e) {
                    console.error("[FINANCIAL] Failed to parse limits:", e);
                }
            }
        }

        // 3. Fallback if no subscription or plan found
        const finalLimits = limits || { users: 2, storage_gb: 5, inspections_monthly: 100 }; // Default free tier

        // Contar uso atual
        const userCount = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM user_organizations WHERE organization_id = ?
        `).bind(targetOrgId).first() as any;

        const currentPeriodStart = subscription?.current_period_start || new Date().toISOString().slice(0, 7) + '-01'; // Fallback to start of month

        const inspectionsThisMonth = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM inspections 
            WHERE organization_id = ? 
            AND created_at >= ?
        `).bind(targetOrgId, currentPeriodStart).first() as any;

        // Calcular porcentagens
        // Calcular porcentagens
        const usage = {
            users: {
                current: userCount?.count || 0,
                limit: finalLimits.users || 999,
                percentage: Math.round(((userCount?.count || 0) / (finalLimits.users || 1)) * 100)
            },
            inspections: {
                current: inspectionsThisMonth?.count || 0,
                limit: finalLimits.inspections_monthly || 999,
                percentage: Math.round(((inspectionsThisMonth?.count || 0) / (finalLimits.inspections_monthly || 1)) * 100)
            },
            storage: {
                current: 0, // TODO: Calcular storage real
                limit: finalLimits.storage_gb || 5,
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

// ============================================================================
// POST /checkout - Inicia o processo de checkout (cria link de pagamento)
// ============================================================================
// Import AsaasService
import { AsaasService } from "./asaas-service.ts";

// ... existing code ...

financialRoutes.post("/checkout", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");

    if (!user) {
        return c.json({ error: "Usuário não autenticado" }, 401);
    }

    try {
        const body = await c.req.json();
        const { plan_id, organization_id, billing_type } = body;

        if (!plan_id) {
            return c.json({ error: "Plano é obrigatório" }, 400);
        }

        // Validate billing type if provided
        const validBillingTypes = ['CREDIT_CARD', 'PIX', 'UNDEFINED'];
        const selectedBillingType = billing_type && validBillingTypes.includes(billing_type)
            ? billing_type
            : 'UNDEFINED';

        // 1. Get user profile and org details
        const userProfile = await env.DB.prepare(
            "SELECT id, email, raw_user_meta_data, role, managed_organization_id FROM users WHERE id = ?"
        ).bind(user.id).first() as any;

        const targetOrgId = organization_id || userProfile?.managed_organization_id;

        if (!targetOrgId) {
            return c.json({ error: "Organização não especificada" }, 400);
        }

        // Get Plan details
        const plan = await env.DB.prepare("SELECT * FROM plans WHERE id = ?").bind(plan_id).first() as any;
        if (!plan) {
            return c.json({ error: "Plano não encontrado" }, 404);
        }

        if (plan.price_cents <= 0) {
            return c.json({ error: "Este plano não permite checkout automático." }, 400);
        }

        // 2. Prepare Customer Data
        // Try to get name/cpf from metadata
        let userData: any = {};
        try {
            userData = typeof userProfile.raw_user_meta_data === 'string'
                ? JSON.parse(userProfile.raw_user_meta_data)
                : userProfile.raw_user_meta_data || {};
        } catch (e) {
            userData = {};
        }

        const asaasService = new AsaasService();

        // 3. Create/Get Asaas Customer
        const customer = await asaasService.createOrUpdateCustomer({
            name: userData.full_name || userData.name || user.email || 'Cliente Compia',
            email: userProfile.email || user.email,
            cpfCnpj: userData.cpf || userData.cnpj, // Optional
            mobilePhone: userData.phone
        });

        console.log(`[CHECKOUT] Asaas Customer: ${customer.id}`);

        // 4. Create Subscription in Asaas
        // Determine cycle and value
        const cycle = plan.billing_period === 'yearly' ? 'YEARLY' : 'MONTHLY';

        // Define due date for 3 days from now (or immediate if using credit card flow later)
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 1); // Tomorrow

        const subscription = await asaasService.createSubscription({
            customer: customer.id,
            billingType: selectedBillingType, // Use user selected type
            value: plan.price_cents / 100,
            nextDueDate: nextDueDate.toISOString().split('T')[0],
            cycle: cycle,
            description: `Assinatura Plano ${plan.display_name} - Compia`,
            externalReference: targetOrgId.toString()
        });

        console.log(`[CHECKOUT] Asaas Subscription: ${subscription.id}`);

        // 5. Store Subscription in DB
        const result = await env.DB.prepare(`
            INSERT INTO subscriptions (
                organization_id, plan_id, status, 
                current_period_start, current_period_end, 
                gateway_name, gateway_customer_id, gateway_subscription_id,
                mrr_value_cents,
                created_at, updated_at
            ) VALUES (
                ?, ?, 'trial',
                NOW(), NOW() + INTERVAL '30 days',
                'asaas', ?, ?,
                ?,
                NOW(), NOW()
            )
            RETURNING id
        `).bind(
            targetOrgId, plan_id,
            customer.id, subscription.id,
            plan.price_cents
        ).first() as any;

        const internalSubId = result?.id;

        // 6. Get Initial Payment/Invoice from Asaas (to get the URL)
        // Usually Asaas creates the first payment immediately
        let paymentUrl = '';
        try {
            const payments = await asaasService.getSubscriptionPayments(subscription.id);
            if (payments.data && payments.data.length > 0) {
                const firstPayment = payments.data[0];
                paymentUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl; // Prefer invoiceUrl (checkout page)

                // Store Invoice
                await env.DB.prepare(`
                    INSERT INTO invoices (
                        subscription_id, organization_id,
                        gateway_invoice_id, payment_link, pdf_url,
                        amount_cents, status, due_date
                    ) VALUES (
                        ?, ?,
                        ?, ?, ?,
                        ?, 'pending', ?
                    )
                `).bind(
                    internalSubId, targetOrgId,
                    firstPayment.id, firstPayment.invoiceUrl, firstPayment.bankSlipUrl,
                    Math.round(firstPayment.value * 100), firstPayment.dueDate
                ).run();
            }
        } catch (err) {
            console.error("[CHECKOUT] Failed to fetch initial payment:", err);
            // Non-critical: User can still see subscription in dashboard later, 
            // but we might fail to redirect. Fallback?
        }

        // Return URL
        return c.json({
            url: paymentUrl || `https://www.compia.tech/billing?status=pending_link`,
            subscriptionId: internalSubId,
            mock: false
        });

    } catch (error: any) {
        console.error("[FINANCIAL] Error in checkout:", error);
        return c.json({ error: "Erro ao processar checkout", details: error.message }, 500);
    }
});

// ============================================================================
// GET /debug-limits - DEBUG APENAS
// ============================================================================
financialRoutes.get("/debug-limits", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");
    const organizationId = c.req.query("organization_id");

    // Determine Org ID similar to /usage
    const userProfile = await env.DB.prepare(
        "SELECT role, managed_organization_id FROM users WHERE id = ?"
    ).bind(user.id).first() as any;
    const targetOrgId = organizationId || userProfile?.managed_organization_id;

    if (!targetOrgId) {
        return c.json({ error: "No org id" });
    }

    // Run the Logic Query
    const subscription = await env.DB.prepare(`
        SELECT s.id, s.status, s.gateway_name, s.current_period_start, p.name as plan_name, p.limits, p.limits as debug_limits_raw
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.organization_id = ? AND s.status NOT IN ('canceled')
        ORDER BY s.created_at DESC
        LIMIT 1
    `).bind(targetOrgId).first() as any;

    // Check parsing
    let parsedLimits = null;
    let parseError = null;
    if (subscription?.limits) {
        try {
            parsedLimits = typeof subscription.limits === 'string' ? JSON.parse(subscription.limits) : subscription.limits;
        } catch (e: any) {
            parseError = e.message;
        }
    }

    // Raw Usage Query
    const currentPeriodStart = subscription?.current_period_start || new Date().toISOString().slice(0, 7) + '-01';
    const inspectionsThisMonth = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM inspections 
        WHERE organization_id = ? 
        AND created_at >= ?
    `).bind(targetOrgId, currentPeriodStart).first() as any;

    return c.json({
        targetOrgId,
        subscription,
        parsedLimits,
        parseError,
        inspectionsCount: inspectionsThisMonth,
        currentPeriodStart
    });
});

export default financialRoutes;
