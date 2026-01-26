
import { Hono } from "hono";
import { USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
};

const systemPlansRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Middleware: Check System Admin
systemPlansRoutes.use('*', async (c, next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const env = c.env;
    // Verify SysAdmin
    const profile = await env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(user.id).first();
    if (profile?.role !== 'system_admin' && profile?.role !== 'sys_admin') {
        return c.json({ error: 'Forbiden: System Admin only' }, 403);
    }
    await next();
});

// ============================================================================
// PLANS
// ============================================================================

// GET /plans
systemPlansRoutes.get('/plans', async (c) => {
    try {
        const { results } = await c.env.DB.prepare("SELECT * FROM plans ORDER BY price_cents ASC").all();

        const plans = (results || []).map((p: any) => ({
            ...p,
            limits: typeof p.limits === 'string' ? JSON.parse(p.limits) : p.limits,
            features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
            addon_config: typeof p.addon_config === 'string' ? JSON.parse(p.addon_config) : p.addon_config,
            is_active: Boolean(p.is_active),
            is_public: Boolean(p.is_public)
        }));

        return c.json({ plans });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /plans (Create)
systemPlansRoutes.post('/plans', async (c) => {
    try {
        const body = await c.req.json();
        const {
            name, display_name, price_cents, description,
            type = 'subscription',
            billing_period = 'monthly',
            is_public = false,
            limits = {},
            features = {},
            addon_config = {}
        } = body;

        const slug = body.slug || name.toLowerCase().replace(/\s+/g, '-');

        const res = await c.env.DB.prepare(`
            INSERT INTO plans (
                name, display_name, slug, price_cents, billing_period, 
                type, limits, features, addon_config, 
                is_active, is_public
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)
            RETURNING id
        `).bind(
            slug, display_name, slug, price_cents, billing_period,
            type,
            JSON.stringify(limits),
            JSON.stringify(features),
            JSON.stringify(addon_config),
            is_public
        ).run();

        return c.json({ success: true, id: res.results?.[0]?.id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// PUT /plans/:id (Update)
systemPlansRoutes.put('/plans/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    try {
        // Build dynamic update query
        await c.env.DB.prepare(`
            UPDATE plans 
            SET display_name = ?, price_cents = ?, is_active = ?, is_public = ?,
                description = ?, features = ?, limits = ?, addon_config = ?
            WHERE id = ?
        `).bind(
            body.display_name,
            body.price_cents,
            body.is_active,
            body.is_public,
            body.description,
            JSON.stringify(body.features || {}),
            JSON.stringify(body.limits || {}),
            JSON.stringify(body.addon_config || {}),
            id
        ).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /plans/:id
systemPlansRoutes.delete('/plans/:id', async (c) => {
    const id = c.req.param('id');
    try {
        await c.env.DB.prepare("DELETE FROM plans WHERE id = ?").bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});


// ============================================================================
// COUPONS
// ============================================================================

// ============================================================================
// COUPONS
// ============================================================================

// GET /coupons
systemPlansRoutes.get('/coupons', async (c) => {
    try {
        const coupons = await c.env.DB.prepare("SELECT * FROM coupons ORDER BY created_at DESC").all();
        return c.json({ coupons: coupons.results || [] });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /coupons (Create)
systemPlansRoutes.post('/coupons', async (c) => {
    const user = c.get('user');
    try {
        const body = await c.req.json();
        const { 
            code, 
            discount_type, 
            discount_value, 
            max_uses, 
            description, 
            expires_at, 
            minimum_amount_cents,
            valid_for_plans,
            is_active = true
        } = body;

        if (!code || !discount_type || !discount_value) {
            return c.json({ error: 'Campos obrigatórios: code, discount_type, discount_value' }, 400);
        }

        const normalizedCode = code.toUpperCase().trim();

        const res = await c.env.DB.prepare(`
            INSERT INTO coupons (
                code, description, discount_type, discount_value, 
                max_uses, expires_at, minimum_amount_cents, 
                valid_for_plans, is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `).bind(
            normalizedCode, 
            description || null, 
            discount_type, 
            discount_value, 
            max_uses || null,
            expires_at || null,
            minimum_amount_cents || null,
            valid_for_plans ? JSON.stringify(valid_for_plans) : null,
            is_active
        ).run();
        
        const newCouponId = res.results?.[0]?.id;

        // Audit Log
        await c.env.DB.prepare(`
            INSERT INTO activity_log (
                user_id, organization_id, action_type, action_description, 
                target_type, target_id, metadata
            ) VALUES (?, ?, 'COUPON_CREATE', ?, 'COUPON', ?, ?)
        `).bind(
            user.id,
            user.organization_id || null, 
            `Criou cupom: ${normalizedCode}`,
            newCouponId,
            JSON.stringify({ code: normalizedCode, discount: `${discount_value} (${discount_type})` })
        ).run();

        return c.json({ success: true, id: newCouponId });
    } catch (e: any) {
        console.error("Error creating coupon:", e);
        return c.json({ error: e.message }, 500);
    }
});

// PUT /coupons/:id (Update)
systemPlansRoutes.put('/coupons/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    try {
        const body = await c.req.json();
        const { 
            description, 
            expires_at, 
            max_uses, 
            is_active,
            valid_for_plans, 
            minimum_amount_cents 
        } = body;

        await c.env.DB.prepare(`
            UPDATE coupons 
            SET description = ?, expires_at = ?, max_uses = ?, 
                is_active = ?, valid_for_plans = ?, minimum_amount_cents = ?,
                updated_at = NOW()
            WHERE id = ?
        `).bind(
            description,
            expires_at || null,
            max_uses,
            is_active,
            valid_for_plans ? JSON.stringify(valid_for_plans) : null,
            minimum_amount_cents,
            id
        ).run();

        // Audit Log
        await c.env.DB.prepare(`
            INSERT INTO activity_log (
                user_id, organization_id, action_type, action_description, 
                target_type, target_id, metadata
            ) VALUES (?, ?, 'COUPON_UPDATE', ?, 'COUPON', ?, ?)
        `).bind(
            user.id,
            user.organization_id || null,
            `Atualizou cupom ID: ${id}`,
            id,
            JSON.stringify(body)
        ).run();

        return c.json({ success: true });
    } catch (e: any) {
        console.error("Error updating coupon:", e);
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /coupons/:id
systemPlansRoutes.delete('/coupons/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    try {
        // Get code for audit before delete
        const coupon = await c.env.DB.prepare("SELECT code FROM coupons WHERE id = ?").bind(id).first();
        const code = coupon?.code || 'Unknown';

        await c.env.DB.prepare("DELETE FROM coupons WHERE id = ?").bind(id).run();

        // Audit Log
        await c.env.DB.prepare(`
            INSERT INTO activity_log (
                user_id, organization_id, action_type, action_description, 
                target_type, target_id, metadata
            ) VALUES (?, ?, 'COUPON_DELETE', ?, 'COUPON', ?, ?)
        `).bind(
            user.id,
            user.organization_id || null,
            `Deletou cupom: ${code}`,
            id,
            JSON.stringify({ deleted_code: code })
        ).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default systemPlansRoutes;
