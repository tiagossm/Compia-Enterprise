import { Hono } from "hono";

const debugChecklistRoutes = new Hono().basePath('/api/debug');

// Endpoint de debug para verificar se tabelas existem (SEM AUTH - apenas para debug)
debugChecklistRoutes.get("/checklist-tables", async (c) => {
    const env = c.env;

    try {
        const results: any = {
            user_info: {
                id: user.id,
                email: user.email,
                has_profile: !!(user as any).profile
            },
            tables_check: {},
            sample_data: {}
        };

        // Verificar se tabela checklist_folders existe
        try {
            const foldersTest = await env.DB.prepare("SELECT COUNT(*) as count FROM checklist_folders").first();
            results.tables_check.checklist_folders = {
                exists: true,
                count: foldersTest?.count || 0
            };

            // Buscar exemplo de folder
            const sampleFolder = await env.DB.prepare("SELECT * FROM checklist_folders LIMIT 1").first();
            results.sample_data.folder_sample = sampleFolder;
        } catch (error: any) {
            results.tables_check.checklist_folders = {
                exists: false,
                error: error.message
            };
        }

        // Verificar se tabela checklist_templates existe
        try {
            const templatesTest = await env.DB.prepare("SELECT COUNT(*) as count FROM checklist_templates").first();
            results.tables_check.checklist_templates = {
                exists: true,
                count: templatesTest?.count || 0
            };
        } catch (error: any) {
            results.tables_check.checklist_templates = {
                exists: false,
                error: error.message
            };
        }

        // Buscar perfil do usuário
        try {
            const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
            results.user_info.profile_from_db = userProfile;
        } catch (error: any) {
            results.user_info.profile_error = error.message;
        }

        return c.json(results);

    } catch (error: any) {
        return c.json({
            error: "Debug endpoint failed",
            message: error.message,
            stack: error.stack
        }, 500);
    }
});

// Teste direto da query que está falhando
debugChecklistRoutes.get("/test-folders-query", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");

    if (!user) {
        return c.json({ error: "User not found" }, 401);
    }

    try {
        // Buscar perfil do usuário
        let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

        if (!userProfile) {
            return c.json({ error: "User profile not found in database" }, 404);
        }

        const parentId = c.req.query('parent_id') || null;

        let whereClause = "WHERE (f.organization_id = ? OR f.organization_id IS NULL)";
        let params: any[] = [userProfile?.organization_id];

        if (parentId === null || parentId === 'null') {
            whereClause += " AND f.parent_id IS NULL";
        } else {
            whereClause += " AND f.parent_id = ?";
            params.push(parentId);
        }

        // Query exata que está falhando
        const query = `
          SELECT
            f.*,
            COUNT(DISTINCT cf.id) as subfolder_count,
            COUNT(DISTINCT ct.id) as template_count
          FROM checklist_folders f
          LEFT JOIN checklist_folders cf ON cf.parent_id = f.id
          LEFT JOIN checklist_templates ct ON ct.folder_id = f.id AND ct.is_category_folder = false
          ${whereClause}
          GROUP BY f.id
          ORDER BY f.display_order ASC, f.name ASC
        `;

        const folders = await env.DB.prepare(query).bind(...params).all();

        return c.json({
            success: true,
            user_org_id: userProfile?.organization_id,
            parent_id: parentId,
            query_used: query,
            params_used: params,
            folders_count: folders.results?.length || 0,
            folders: folders.results || []
        });

    } catch (error: any) {
        return c.json({
            error: "Query test failed",
            message: error.message,
            stack: error.stack,
            cause: error.cause
        }, 500);
    }
});

export default debugChecklistRoutes;
