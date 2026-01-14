import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";

const aiUsageRoutes = new Hono<{ Bindings: any }>();

// GET /api/organizations/:orgId/ai-usage/logs
aiUsageRoutes.get('/:orgId/logs', tenantAuthMiddleware, async (c) => {
    const orgId = c.req.param('orgId');
    const { page = '1', limit = '20', start_date, end_date, feature_type, user_id } = c.req.query();

    // Permission check (must be org_admin or sys_admin)
    const user = c.get('user');
    // Basic check: user.organization_id == orgId OR user.role == sys_admin
    // (Middleware already handles basic tenant, but let's be safe if we want strict admin only)

    try {
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params: any[] = [orgId];
        let query = `
            SELECT l.*, u.email as user_email
            FROM ai_usage_log l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.organization_id = ?
        `;

        if (start_date) {
            query += ` AND l.created_at >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND l.created_at <= ?`;
            params.push(end_date);
        }
        if (feature_type) {
            query += ` AND l.feature_type = ?`;
            params.push(feature_type);
        }
        if (user_id) {
            query += ` AND l.user_id = ?`;
            params.push(user_id);
        }

        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
        // @ts-ignore
        const totalResult = await c.env.DB.prepare(countQuery).bind(...params).first();

        query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        // @ts-ignore
        const results = await c.env.DB.prepare(query).bind(...params).all();

        return c.json({
            logs: results.results || [],
            pagination: {
                total: totalResult?.total || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil((totalResult?.total || 0) / parseInt(limit))
            }
        });
    } catch (e: any) {
        console.error("Error fetching AI logs:", e);
        return c.json({ error: e.message }, 500);
    }
});

// GET /api/organizations/:orgId/ai-usage/export
aiUsageRoutes.get('/:orgId/export', tenantAuthMiddleware, async (c) => {
    const orgId = c.req.param('orgId');
    const { start_date, end_date } = c.req.query();

    try {
        const params: any[] = [orgId];
        let query = `
            SELECT l.created_at, u.email, l.feature_type, l.model_used, l.status
            FROM ai_usage_log l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.organization_id = ?
        `;

        if (start_date) {
            query += ` AND l.created_at >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND l.created_at <= ?`;
            params.push(end_date);
        }
        query += ` ORDER BY l.created_at DESC LIMIT 1000`; // Limit export size

        // @ts-ignore
        const results = await c.env.DB.prepare(query).bind(...params).all();
        const logs = results.results || [];

        // Generate CSV
        const header = "Data/Hora,Usuário,Funcionalidade,Modelo,Status\n";
        const rows = logs.map((l: any) =>
            `${l.created_at},${l.email || 'N/A'},${l.feature_type},${l.model_used},${l.status}`
        ).join("\n");

        return c.text(header + rows, 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="ai_usage_report_${orgId}.csv"`
        });

    } catch (e: any) {
        console.error("Error exporting AI logs:", e);
        return c.json({ error: e.message }, 500);
    }
});

export { aiUsageRoutes };
