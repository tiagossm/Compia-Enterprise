import { Hono } from 'hono';
import { tenantAuthMiddleware as authMiddleware } from './tenant-auth-middleware.ts';


type Env = {
    DB: any;
    [key: string]: any;
};

const auditRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Middleware to ensure user has access to audit logs (System Admin or Org Admin)
const requireAuditAccess = async (c: any, next: any) => {
    const user = c.get('user');
    const role = user?.role || user?.profile?.role;
    console.log(`[AUDIT] Auth check - User: ${user?.email}, Role: ${role}`);

    if (!role || !['system_admin', 'sys_admin', 'org_admin', 'organization_admin'].includes(role)) {
        return c.json({ error: `Acesso negado. Role '${role}' não autorizada.` }, 403);
    }
    await next();
};



// GET /api/audit/logs - List audit logs with filters
auditRoutes.get('/logs', authMiddleware, requireAuditAccess, async (c) => {
    const env = c.env;
    const user = c.get('user');
    const userRole = user?.role || user?.profile?.role;
    const userOrgId = user?.organization_id || user?.profile?.organization_id;

    // Parse query parameters for filters
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Filters
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const actionType = url.searchParams.get('action_type');
    const targetType = url.searchParams.get('target_type');
    const userId = url.searchParams.get('user_id');
    const organizationIdQuery = url.searchParams.get('organization_id');
    const search = url.searchParams.get('search');

    try {
        // Build dynamic query with filters
        let whereConditions: string[] = [];
        let params: any[] = [];
        // paramIndex removed - wrapper handles sequential ? automatically

        // Security: If org_admin, force filter by their organization_id
        if (['org_admin', 'organization_admin'].includes(userRole)) {
            if (!userOrgId) {
                return c.json({ error: 'Usuário sem organização vinculada' }, 400);
            }
            whereConditions.push('al.organization_id = ?');
            params.push(userOrgId);
        } else if (organizationIdQuery) {
            // If system admin and supplied organization_id filter
            whereConditions.push('al.organization_id = ?');
            params.push(parseInt(organizationIdQuery));
        }

        if (startDate) {
            whereConditions.push('al.created_at >= ?');
            params.push(startDate);
        }
        if (endDate) {
            whereConditions.push('al.created_at <= ?');
            params.push(endDate + 'T23:59:59Z');
        }
        if (actionType) {
            whereConditions.push('al.action_type = ?');
            params.push(actionType);
        }
        if (targetType) {
            whereConditions.push('al.target_type = ?');
            params.push(targetType);
        }
        if (userId) {
            whereConditions.push('al.user_id = ?');
            params.push(userId);
        }
        if (search) {
            whereConditions.push('(al.action_description LIKE ? OR al.target_id LIKE ?)');
            params.push(`%${search}%`);
            params.push(`%${search}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM activity_log al ${whereClause}`;
        const countResult = await env.DB.prepare(countQuery).bind(...params).first() as any;
        const total = countResult?.total || 0;

        // Get logs with user info
        const logsQuery = `
      SELECT 
        al.id,
        al.user_id,
        al.organization_id,
        al.action_type,
        al.action_description,
        al.target_type,
        al.target_id,
        al.metadata,
        al.created_at,
        u.email as user_email,
        u.name as user_name,
        o.name as organization_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN organizations o ON al.organization_id = o.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

        const logs = await env.DB.prepare(logsQuery).bind(...params).all();

        return c.json({
            logs: logs.results || [],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return c.json({ error: 'Erro ao buscar logs de auditoria' }, 500);
    }
});

// GET /api/audit/logs/:id - Get single log detail
auditRoutes.get('/logs/:id', authMiddleware, requireAuditAccess, async (c) => {
    const env = c.env;
    const user = c.get('user');
    const userRole = user?.role || user?.profile?.role;
    const userOrgId = user?.organization_id || user?.profile?.organization_id;
    const logId = parseInt(c.req.param('id'));

    try {
        let query = `
      SELECT 
        al.*,
        u.email as user_email,
        u.name as user_name,
        o.name as organization_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN organizations o ON al.organization_id = o.id
      WHERE al.id = ?
    `;

        const params = [logId];

        if (['org_admin', 'organization_admin'].includes(userRole)) {
            query += ' AND al.organization_id = ?';
            params.push(userOrgId);
        }

        const log = await env.DB.prepare(query).bind(...params).first();

        if (!log) {
            return c.json({ error: 'Log não encontrado ou acesso não autorizado' }, 404);
        }

        return c.json({ log });
    } catch (error) {
        console.error('Error fetching audit log:', error);
        return c.json({ error: 'Erro ao buscar log de auditoria' }, 500);
    }
});

// GET /api/audit/stats - Get audit statistics
auditRoutes.get('/stats', authMiddleware, requireAuditAccess, async (c) => {
    const env = c.env;
    const user = c.get('user');
    const userRole = user?.role || user?.profile?.role;
    const userOrgId = user?.organization_id || user?.profile?.organization_id;

    const url = new URL(c.req.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString();

        let orgFilter = '';
        let orgFilterTop = ''; // For queries where aliases might differ or direct modification is needed
        let params: any[] = [startDateStr];

        if (['org_admin', 'organization_admin'].includes(userRole)) {
            orgFilter = 'AND organization_id = ?';
            orgFilterTop = 'AND al.organization_id = ?';
            params.push(userOrgId);
        }

        // Total events in period
        const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM activity_log WHERE created_at >= ? ${orgFilter}
    `).bind(...params).first() as any;

        // Events by action type
        const byActionType = await env.DB.prepare(`
      SELECT action_type, COUNT(*) as count 
      FROM activity_log 
      WHERE created_at >= ? ${orgFilter}
      GROUP BY action_type 
      ORDER BY count DESC
    `).bind(...params).all();

        // Events by target type
        const byTargetType = await env.DB.prepare(`
      SELECT target_type, COUNT(*) as count 
      FROM activity_log 
      WHERE created_at >= ? AND target_type IS NOT NULL ${orgFilter}
      GROUP BY target_type 
      ORDER BY count DESC
    `).bind(...params).all();

        // Top users by activity
        const topUsersParams = [startDateStr];
        if (['org_admin', 'organization_admin'].includes(userRole)) {
            topUsersParams.push(userOrgId);
        }

        const topUsers = await env.DB.prepare(`
      SELECT 
        al.user_id,
        u.name as user_name,
        u.email as user_email,
        COUNT(*) as activity_count
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= ? AND al.user_id IS NOT NULL ${orgFilterTop}
      GROUP BY al.user_id, u.name, u.email
      ORDER BY activity_count DESC
      LIMIT 10
    `).bind(...topUsersParams).all();

        // Daily activity for chart
        const dailyActivity = await env.DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activity_log
      WHERE created_at >= ? ${orgFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).bind(...params).all();

        // Security events
        const securityEvents = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM activity_log
      WHERE created_at >= ? 
      AND (action_type LIKE '%FAILED%' OR action_type LIKE '%DENIED%' OR action_type LIKE '%UNAUTHORIZED%')
      ${orgFilter}
    `).bind(...params).first() as any;

        return c.json({
            period: { days, start_date: startDateStr },
            total_events: totalResult?.total || 0,
            by_action_type: byActionType.results || [],
            by_target_type: byTargetType.results || [],
            top_users: topUsers.results || [],
            daily_activity: dailyActivity.results || [],
            security_alerts: securityEvents?.count || 0
        });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        return c.json({ error: 'Erro ao buscar estatísticas de auditoria' }, 500);
    }
});

// GET /api/audit/export - Export logs as CSV
auditRoutes.get('/export', authMiddleware, requireAuditAccess, async (c) => {
    const env = c.env;
    const user = c.get('user');
    const userRole = user?.role || user?.profile?.role;
    const userOrgId = user?.organization_id || user?.profile?.organization_id;

    const url = new URL(c.req.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    try {
        let whereConditions: string[] = [];
        const params: any[] = [];
        // paramIndex removed

        if (['org_admin', 'organization_admin'].includes(userRole)) {
            whereConditions.push('al.organization_id = ?');
            params.push(userOrgId);
        }

        if (startDate) {
            whereConditions.push('al.created_at >= ?');
            params.push(startDate);
        }
        if (endDate) {
            whereConditions.push('al.created_at <= ?');
            params.push(endDate + 'T23:59:59Z');
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const logs = await env.DB.prepare(`
      SELECT 
        al.id,
        al.created_at,
        u.email as user_email,
        u.name as user_name,
        al.action_type,
        al.action_description,
        al.target_type,
        al.target_id,
        o.name as organization_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN organizations o ON al.organization_id = o.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT 10000
    `).bind(...params).all();

        // Build CSV
        const headers = ['ID', 'Data/Hora', 'Usuário', 'Email', 'Ação', 'Descrição', 'Tipo Recurso', 'ID Recurso', 'Organização'];
        const rows = (logs.results || []).map((log: any) => [
            log.id,
            log.created_at,
            log.user_name || '',
            log.user_email || '',
            log.action_type || '',
            (log.action_description || '').replace(/"/g, '""'),
            log.target_type || '',
            log.target_id || '',
            log.organization_name || ''
        ].map(val => `"${val}"`).join(','));

        const csv = [headers.join(','), ...rows].join('\n');

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`
            }
        });
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        return c.json({ error: 'Erro ao exportar logs de auditoria' }, 500);
    }
});

// GET /api/audit/action-types - Get distinct action types for filter dropdown
auditRoutes.get('/action-types', authMiddleware, requireAuditAccess, async (c) => {
    const env = c.env;
    const user = c.get('user');
    const userRole = user?.role || user?.profile?.role;
    const userOrgId = user?.organization_id || user?.profile?.organization_id;

    try {
        let query = 'SELECT DISTINCT action_type FROM activity_log WHERE action_type IS NOT NULL';
        const params: any[] = [];

        if (['org_admin', 'organization_admin'].includes(userRole)) {
            query += ' AND organization_id = ?';
            params.push(userOrgId);
        }

        query += ' ORDER BY action_type';

        const result = await env.DB.prepare(query).bind(...params).all();

        return c.json({ action_types: (result.results || []).map((r: any) => r.action_type) });
    } catch (error) {
        console.error('Error fetching action types:', error);
        return c.json({ error: 'Erro ao buscar tipos de ação' }, 500);
    }
});

// GET /api/audit/target-types - Get distinct target types for filter dropdown
auditRoutes.get('/target-types', authMiddleware, requireAuditAccess, async (c) => {
    const env = c.env;
    const user = c.get('user');
    const userRole = user?.role || user?.profile?.role;
    const userOrgId = user?.organization_id || user?.profile?.organization_id;

    try {
        let query = 'SELECT DISTINCT target_type FROM activity_log WHERE target_type IS NOT NULL';
        const params: any[] = [];

        if (['org_admin', 'organization_admin'].includes(userRole)) {
            query += ' AND organization_id = ?';
            params.push(userOrgId);
        }

        query += ' ORDER BY target_type';

        const result = await env.DB.prepare(query).bind(...params).all();

        return c.json({ target_types: (result.results || []).map((r: any) => r.target_type) });
    } catch (error) {
        console.error('Error fetching target types:', error);
        return c.json({ error: 'Erro ao buscar tipos de recurso' }, 500);
    }
});

export { auditRoutes };
