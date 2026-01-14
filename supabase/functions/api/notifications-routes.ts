import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";

const notificationsRoutes = new Hono<{ Bindings: any; Variables: { user: any } }>();

// List notifications
notificationsRoutes.get("/", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");
    const limit = parseInt(c.req.query("limit") || "50");

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
        const results = await env.DB.prepare(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `).bind(user.id, limit).all();

        // Count unread
        const countResult = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND read = false
        `).bind(user.id).first();

        return c.json({
            notifications: results.results || [],
            unread_count: countResult?.count || 0
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return c.json({ error: "Failed to fetch notifications" }, 500);
    }
});

// Mark as read
notificationsRoutes.post("/:id/read", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");
    const id = c.req.param("id");

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
        await env.DB.prepare(`
            UPDATE notifications SET read = true WHERE id = ? AND user_id = ?
        `).bind(id, user.id).run();

        return c.json({ success: true });
    } catch (error) {
        return c.json({ error: "Failed to update" }, 500);
    }
});

// Mark all as read
notificationsRoutes.post("/read-all", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
        await env.DB.prepare(`
            UPDATE notifications SET read = true WHERE user_id = ? AND read = false
        `).bind(user.id).run();

        return c.json({ success: true });
    } catch (error) {
        return c.json({ error: "Failed to update" }, 500);
    }
});

export default notificationsRoutes;
