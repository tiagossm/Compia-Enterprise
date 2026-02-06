import { Hono } from "hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";

const systemPlansRoutes = new Hono().basePath('/api/system-commerce');

// Helper function to get Supabase Admin Client
const getSupabaseAdmin = () => createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Middleware: Check System Admin
systemPlansRoutes.use('*', tenantAuthMiddleware, async (c, next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || (profile?.role !== 'system_admin' && profile?.role !== 'sys_admin')) {
        return c.json({ error: 'Forbidden: System Admin only' }, 403);
    }
    await next();
});

// ============================================================================
// PLANS
// ============================================================================

// GET /plans
systemPlansRoutes.get('/plans', async (c) => {
    const supabase = getSupabaseAdmin();
    const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_cents', { ascending: true });

    if (error) return c.json({ error: error.message }, 500);

    return c.json({ plans: plans || [] });
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
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('plans')
            .insert({
                slug,
                name: slug, // Using slug as internal name for consistency
                display_name,
                price_cents,
                description,
                billing_period,
                type,
                limits, // Supabase handles JSON/JSONB automatically
                features,
                addon_config,
                is_active: true,
                is_public
            })
            .select()
            .single();

        if (error) throw error;

        return c.json({ success: true, id: data.id });
    } catch (e: any) {
        return c.json({ error: e.message || e.details }, 500);
    }
});

// PUT /plans/:id (Update)
systemPlansRoutes.put('/plans/:id', async (c) => {
    const id = c.req.param('id');
    try {
        const body = await c.req.json();
        const supabase = getSupabaseAdmin();

        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        // Only update fields present in body
        if (body.display_name !== undefined) updateData.display_name = body.display_name;
        if (body.price_cents !== undefined) updateData.price_cents = body.price_cents;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;
        if (body.is_public !== undefined) updateData.is_public = body.is_public;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.features !== undefined) updateData.features = body.features;
        if (body.limits !== undefined) updateData.limits = body.limits;
        if (body.addon_config !== undefined) updateData.addon_config = body.addon_config;
        if (body.billing_period !== undefined) updateData.billing_period = body.billing_period;
        if (body.name !== undefined) updateData.slug = body.name; // Updating slug if name changes

        const { error } = await supabase
            .from('plans')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message || e.details }, 500);
    }
});

// DELETE /plans/:id
systemPlansRoutes.delete('/plans/:id', async (c) => {
    const id = c.req.param('id');
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);

    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true });
});


// ============================================================================
// COUPONS
// ============================================================================

// GET /coupons
systemPlansRoutes.get('/coupons', async (c) => {
    const supabase = getSupabaseAdmin();
    const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return c.json({ error: error.message }, 500);

    return c.json({ coupons: coupons || [] });
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
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('coupons')
            .insert({
                code: normalizedCode,
                description,
                discount_type,
                discount_value,
                max_uses: max_uses || null,
                expires_at: expires_at || null,
                minimum_amount_cents: minimum_amount_cents || null,
                valid_for_plans: valid_for_plans || null, // JSONB
                is_active
            })
            .select()
            .single();

        if (error) throw error;

        // Audit Log
        await supabase.from('activity_log').insert({
            user_id: user.id,
            action_type: 'COUPON_CREATE',
            action_description: `Criou cupom: ${normalizedCode}`,
            target_type: 'COUPON',
            target_id: data.id,
            metadata: { code: normalizedCode, discount: `${discount_value} (${discount_type})` }
        });

        return c.json({ success: true, id: data.id });
    } catch (e: any) {
        return c.json({ error: e.message || e.details }, 500);
    }
});

// PUT /coupons/:id (Update)
systemPlansRoutes.put('/coupons/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    try {
        const body = await c.req.json();
        const supabase = getSupabaseAdmin();

        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        // Bulk update fields
        const fields = [
            'code', 'discount_type', 'discount_value', 'description',
            'expires_at', 'max_uses', 'is_active', 'valid_for_plans', 'minimum_amount_cents'
        ];

        for (const field of fields) {
            if (body[field] !== undefined) updateData[field] = body[field];
        }

        const { error } = await supabase
            .from('coupons')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        // Audit Log
        await supabase.from('activity_log').insert({
            user_id: user.id,
            action_type: 'COUPON_UPDATE',
            action_description: `Atualizou cupom ID: ${id}`,
            target_type: 'COUPON',
            target_id: id,
            metadata: body
        });

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message || e.details }, 500);
    }
});

// DELETE /coupons/:id
systemPlansRoutes.delete('/coupons/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const supabase = getSupabaseAdmin();

    try {
        // Get code for audit before delete
        const { data: coupon } = await supabase
            .from('coupons')
            .select('code')
            .eq('id', id)
            .single();

        const code = coupon?.code || 'Unknown';

        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Audit Log
        await supabase.from('activity_log').insert({
            user_id: user.id,
            action_type: 'COUPON_DELETE',
            action_description: `Deletou cupom: ${code}`,
            target_type: 'COUPON',
            target_id: id,
            metadata: { deleted_code: code }
        });

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default systemPlansRoutes;
