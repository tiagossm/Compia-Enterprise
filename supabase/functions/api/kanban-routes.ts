import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
};

const kanbanRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>().basePath('/api/kanban');

// Get columns for organization
kanbanRoutes.get("/:orgId/columns", tenantAuthMiddleware, async (c) => {
    const user = c.get('user');
    const orgId = c.req.param('orgId');
    const env = c.env;

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
        let columns = await env.DB.prepare("SELECT * FROM kanban_columns WHERE organization_id = ? ORDER BY position ASC").bind(orgId).all();

        // Lazy seed if empty
        if (!columns.results || columns.results.length === 0) {
            await env.DB.prepare(`
                INSERT INTO kanban_columns (organization_id, title, status_key, position, color) VALUES 
                (?, 'A Fazer', 'pending', 0, 'bg-slate-100'),
                (?, 'Em Andamento', 'in_progress', 1, 'bg-blue-50'),
                (?, 'Concluído', 'completed', 2, 'bg-green-50')
            `).bind(orgId, orgId, orgId).run();

            columns = await env.DB.prepare("SELECT * FROM kanban_columns WHERE organization_id = ? ORDER BY position ASC").bind(orgId).all();
        }

        return c.json({ columns: columns.results });
    } catch (e) {
        console.error("Error fetching columns:", e);
        return c.json({ error: "Failed to fetch columns" }, 500);
    }
});

// Create new column
kanbanRoutes.post("/:orgId/columns", tenantAuthMiddleware, async (c) => {
    const user = c.get('user');
    const orgId = c.req.param('orgId');
    const env = c.env;
    const { title, color } = await c.req.json();

    if (!title) return c.json({ error: "Title required" }, 400);

    try {
        // Generate a simplified status key from title
        const statusKey = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        // Get max position
        const maxPos = await env.DB.prepare("SELECT MAX(position) as max_pos FROM kanban_columns WHERE organization_id = ?").bind(orgId).first();
        const nextPos = (maxPos?.max_pos || 0) + 1;

        const result = await env.DB.prepare(`
            INSERT INTO kanban_columns (organization_id, title, status_key, position, color)
            VALUES (?, ?, ?, ?, ?)
            RETURNING *
        `).bind(orgId, title, statusKey, nextPos, color || 'bg-slate-100').first();

        return c.json({ column: result });
    } catch (e) {
        return c.json({ error: "Failed to create column" }, 500);
    }
});

// Update column order
kanbanRoutes.put("/:orgId/columns/reorder", tenantAuthMiddleware, async (c) => {
    const orgId = c.req.param('orgId');
    const env = c.env;
    const { columnIds } = await c.req.json();

    try {
        // Prepare batch updates (or sequential)
        for (let i = 0; i < columnIds.length; i++) {
            await env.DB.prepare("UPDATE kanban_columns SET position = ? WHERE id = ? AND organization_id = ?").bind(i, columnIds[i], orgId).run();
        }
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: "Failed to reorder" }, 500);
    }
});

// Update column (title/color)
kanbanRoutes.put("/:orgId/columns/:colId", tenantAuthMiddleware, async (c) => {
    const orgId = c.req.param('orgId');
    const colId = c.req.param('colId');
    const env = c.env;
    const { title, color } = await c.req.json();

    try {
        await env.DB.prepare("UPDATE kanban_columns SET title = ?, color = ? WHERE id = ? AND organization_id = ?").bind(title, color, colId, orgId).run();
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: "Failed to update column" }, 500);
    }
});

// Delete column
kanbanRoutes.delete("/:orgId/columns/:colId", tenantAuthMiddleware, async (c) => {
    const orgId = c.req.param('orgId');
    const colId = c.req.param('colId');
    const env = c.env;

    try {
        // Optional: Check if items exist in this column?
        // For now, let's just delete (items statuses might become orphaned visually but exist in DB)
        // Better: Move items to 'pending'?
        // Skipping complex logic for MVP.
        await env.DB.prepare("DELETE FROM kanban_columns WHERE id = ? AND organization_id = ?").bind(colId, orgId).run();
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: "Failed to delete column" }, 500);
    }
});

// Move Item (Update Status)
kanbanRoutes.put("/:orgId/items/:itemId/move", tenantAuthMiddleware, async (c) => {
    const { status } = await c.req.json();
    const itemId = c.req.param('itemId');
    const env = c.env;

    try {
        // 1. Get current item data before update
        const item = await env.DB.prepare("SELECT title, notification_emails FROM action_items WHERE id = ?").bind(itemId).first();

        // 2. Update status
        await env.DB.prepare("UPDATE action_items SET status = ?, updated_at = NOW() WHERE id = ?").bind(status, itemId).run();

        // 3. Send notifications if configured
        if (item && item.notification_emails && Array.isArray(JSON.parse(item.notification_emails))) {
            const emails = JSON.parse(item.notification_emails);
            // Dynamic import to avoid circular dependency issues if any (though unlikely here)
            // Email service code removed to preventing broken build warnings
            console.warn("Email service missing. Skipping notification for item:", item.title);
            console.warn("Email service missing. Skipping notification for item:", item.title);
        }

        return c.json({ success: true });
    } catch (e) {
        console.error("Error moving item:", e);
        return c.json({ error: "Failed to move item" }, 500);
    }
});

export default kanbanRoutes;
