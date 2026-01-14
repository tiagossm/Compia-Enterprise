import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";
import { addXP } from "./gamification-routes.ts";

const actionPlansRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Get all action items across all inspections with optional organization filter
actionPlansRoutes.get("/all", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const organizationId = c.req.query("organization_id");
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    let query = `
      SELECT ai.*, 

             i.title as inspection_title,
             i.location as inspection_location,
             i.company_name as inspection_company,
             i.created_by as inspection_created_by,
             coalesce(i.organization_id, ai.organization_id) as final_organization_id,
             u.name as created_by_name,
             u_assigned.name as assigned_to_name,
             o.name as organization_name
      FROM action_items ai
      LEFT JOIN inspections i ON ai.inspection_id = i.id
      LEFT JOIN users u ON ai.created_by = u.id
      LEFT JOIN users u_assigned ON ai.assigned_to = u_assigned.id
      LEFT JOIN organizations o ON coalesce(i.organization_id, ai.organization_id) = o.id
    `;

    const params: any[] = [];
    const whereConditions: string[] = [];

    // Type filter
    const type = c.req.query("type");
    if (type && type !== 'all') {
      whereConditions.push("ai.type = ?");
      params.push(type);
    }

    // Organization filter logic (using COALESCE to fallback to direct org_id)
    if (organizationId && organizationId !== 'all') {
      whereConditions.push("coalesce(i.organization_id, ai.organization_id) = ?");
      params.push(parseInt(organizationId));
    }

    // Role-based access control
    if (userProfile?.role === USER_ROLES.SYSTEM_ADMIN || userProfile?.role === 'sys_admin') {
      // System admin sees all
    } else if (userProfile?.role === USER_ROLES.ORG_ADMIN) {
      if (userProfile.managed_organization_id) {
        whereConditions.push(`(
          coalesce(i.organization_id, ai.organization_id) = ? OR 
          coalesce(i.organization_id, ai.organization_id) IN (
            SELECT id FROM organizations WHERE parent_organization_id = ?
          )
        )`);
        params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
      }
    } else {
      // Regular users: Created by me OR Assigned to me OR Org visible
      whereConditions.push(`(ai.created_by = ? OR ai.assigned_to = ? OR coalesce(i.organization_id, ai.organization_id) = ?)`);
      params.push(user.id, user.id, userProfile?.organization_id);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY ai.created_at DESC";

    console.log('[ACTION_PLANS] Executing query:', query);
    console.log('[ACTION_PLANS] Params:', params);

    const actionItems = await env.DB.prepare(query).bind(...params).all();

    return c.json({
      action_items: actionItems.results || [],
      total: (actionItems.results || []).length
    });

  } catch (error: any) {
    console.error('Error fetching all action items:', error);
    return c.json({
      error: "Failed to fetch action items",
      details: error.message,
      stack: error.stack
    }, 500);
  }
});

// Get action items by inspection ID
actionPlansRoutes.get("/inspection/:inspectionId", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const inspectionId = parseInt(c.req.param("inspectionId"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Verify access to inspection
    const inspection = await env.DB.prepare(`
      SELECT i.*, u.name as created_by_name
      FROM inspections i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?
    `).bind(inspectionId).first() as any;

    if (!inspection) {
      return c.json({ error: "Inspection not found" }, 404);
    }

    // Check access permissions
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    const hasAccess = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile?.role === 'sys_admin' ||
      inspection.created_by === user.id ||
      inspection.organization_id === userProfile?.organization_id ||
      (userProfile?.role === USER_ROLES.ORG_ADMIN &&
        (inspection.organization_id === userProfile.managed_organization_id ||
          await env.DB.prepare(`
                         SELECT 1 FROM organizations 
                         WHERE id = ? AND parent_organization_id = ?
                       `).bind(inspection.organization_id, userProfile.managed_organization_id).first()));

    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    // Get action items for this inspection
    const actionItems = await env.DB.prepare(`
      SELECT ai.*, ii.category as item_category, ii.item_description
      FROM action_items ai
      LEFT JOIN inspection_items ii ON ai.inspection_item_id = ii.id
      WHERE ai.inspection_id = ?
      ORDER BY ai.created_at DESC
    `).bind(inspectionId).all();

    return c.json({
      inspection,
      action_items: actionItems.results || []
    });

  } catch (error) {
    console.error('Error fetching inspection action items:', error);
    return c.json({ error: "Failed to fetch action items" }, 500);
  }
});

// Helper to create Google Calendar Event
async function createGoogleCalendarEvent(token: string, title: string, description: string, date: string): Promise<string | null> {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        description: description || 'Tarefa criada via Compia',
        start: { date: date }, // All-day event
        end: { date: date }
      })
    });

    if (!response.ok) {
      console.error('Failed to create Google Calendar event:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (e) {
    console.error('Error creating Google Calendar event:', e);
    return null;
  }
}

// Create new action item
actionPlansRoutes.post("/", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const {
      title,
      type = 'manual_task',
      description,
      priority = 'media',
      status = 'pending',
      when_deadline,
      assignee_id,
      google_token // Token passed from frontend
    } = body;

    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }

    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    let organizationId = userProfile?.organization_id;
    if (userProfile?.role === USER_ROLES.ORG_ADMIN && userProfile.managed_organization_id) {
      organizationId = userProfile.managed_organization_id;
    }

    // Google Calendar Sync
    let google_event_id: string | null = null;
    if (google_token && when_deadline) {
      // Format date/time if needed. Assuming when_deadline is YYYY-MM-DD.
      // If type is inspection_order, maybe prefix title?
      const eventTitle = type === 'inspection_order' ? `[Inspeção] ${title}` : title;
      google_event_id = await createGoogleCalendarEvent(google_token, eventTitle, description || '', when_deadline);
    }

    const result = await env.DB.prepare(`
        INSERT INTO action_items (
            title, 
            type, 
            description, 
            priority, 
            status, 
            when_deadline, 
            created_by, 
            organization_id, 
            assigned_to,
            source,
            google_event_id,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, NOW(), NOW()) 
        RETURNING *
    `).bind(
      title,
      type,
      description || null,
      priority,
      status,
      when_deadline || null,
      user.id,
      organizationId,
      assignee_id || null,
      google_event_id
    ).first();

    return c.json({ success: true, action_item: result }, 201);

  } catch (error) {
    console.error('Error creating action item:', error);
    return c.json({ error: "Failed to create action item" }, 500);
  }
});

// Update action item status
actionPlansRoutes.put("/:id/status", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const actionId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { status } = body;

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    // Get action item for permission check
    const actionItem = await env.DB.prepare(`
      SELECT ai.*, i.created_by as inspection_created_by, coalesce(i.organization_id, ai.organization_id) as final_organization_id
      FROM action_items ai
      LEFT JOIN inspections i ON ai.inspection_id = i.id
      WHERE ai.id = ?
    `).bind(actionId).first() as any;

    if (!actionItem) {
      return c.json({ error: "Action item not found" }, 404);
    }

    // Check permissions
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    const hasAccess = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile?.role === 'sys_admin' ||
      actionItem.created_by === user.id ||
      actionItem.inspection_created_by === user.id ||
      actionItem.assigned_to === user.id ||
      actionItem.final_organization_id === userProfile?.organization_id ||
      (userProfile?.role === USER_ROLES.ORG_ADMIN &&
        (actionItem.final_organization_id === userProfile.managed_organization_id ||
          await env.DB.prepare(`
                         SELECT 1 FROM organizations 
                         WHERE id = ? AND parent_organization_id = ?
                       `).bind(actionItem.final_organization_id, userProfile.managed_organization_id).first()));

    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    // Update status
    await env.DB.prepare(`
      UPDATE action_items 
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `).bind(status, actionId).run();

    // Gamification: Award XP if completed
    if (status === 'completed') {
      try {
        // Basic logic: 20 XP for completion.
        // Future: Check deadlin for bonus.
        await addXP(user.id, 20, env.DB);
      } catch (xpError) {
        console.error("Error awarding XP:", xpError);
      }
    }

    return c.json({ message: "Status updated successfully" });

  } catch (error) {
    console.error('Error updating action item status:', error);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// Get action items statistics
actionPlansRoutes.get("/stats", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const organizationId = c.req.query("organization_id");
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ai.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ai.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN ai.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN ai.priority = 'alta' AND ai.status != 'completed' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN ai.when_deadline < date('now') AND ai.status != 'completed' THEN 1 ELSE 0 END) as overdue
      FROM action_items ai
      LEFT JOIN inspections i ON ai.inspection_id = i.id
    `;

    const params: any[] = [];
    const whereConditions: string[] = [];

    // Organization filter
    if (organizationId && organizationId !== 'all') {
      whereConditions.push("coalesce(i.organization_id, ai.organization_id) = ?");
      params.push(parseInt(organizationId));
    }

    // Role-based access control
    if (userProfile?.role === USER_ROLES.SYSTEM_ADMIN || userProfile?.role === 'sys_admin') {
      // System admin sees all stats
    } else if (userProfile?.role === USER_ROLES.ORG_ADMIN) {
      if (userProfile.managed_organization_id) {
        whereConditions.push(`(
          coalesce(i.organization_id, ai.organization_id) = ? OR 
          coalesce(i.organization_id, ai.organization_id) IN (
            SELECT id FROM organizations WHERE parent_organization_id = ?
          )
        )`);
        params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
      }
    } else {
      whereConditions.push(`(ai.created_by = ? OR ai.assigned_to = ? OR coalesce(i.organization_id, ai.organization_id) = ?)`);
      params.push(user.id, user.id, userProfile?.organization_id);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    const stats = await env.DB.prepare(query).bind(...params).first() as any;

    return c.json({
      stats: {
        total: stats?.total || 0,
        pending: stats?.pending || 0,
        in_progress: stats?.in_progress || 0,
        completed: stats?.completed || 0,
        high_priority: stats?.high_priority || 0,
        overdue: stats?.overdue || 0
      }
    });

  } catch (error) {
    console.error('Error fetching action items stats:', error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Delete action item
actionPlansRoutes.delete("/:id", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const actionId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get action item with inspection details for permission check
    const actionItem = await env.DB.prepare(`
      SELECT ai.*, i.created_by as inspection_created_by, coalesce(i.organization_id, ai.organization_id) as final_organization_id
      FROM action_items ai
      LEFT JOIN inspections i ON ai.inspection_id = i.id
      WHERE ai.id = ?
    `).bind(actionId).first() as any;

    if (!actionItem) {
      return c.json({ error: "Action item not found" }, 404);
    }

    // Check permissions
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    const hasAccess = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile?.role === 'sys_admin' ||
      actionItem.created_by === user.id ||
      actionItem.inspection_created_by === user.id ||
      actionItem.final_organization_id === userProfile?.organization_id ||
      (userProfile?.role === USER_ROLES.ORG_ADMIN &&
        (actionItem.final_organization_id === userProfile.managed_organization_id ||
          await env.DB.prepare(`
                         SELECT 1 FROM organizations 
                         WHERE id = ? AND parent_organization_id = ?
                       `).bind(actionItem.final_organization_id, userProfile.managed_organization_id).first()));

    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    // Delete action item
    await env.DB.prepare("DELETE FROM action_items WHERE id = ?").bind(actionId).run();

    return c.json({
      success: true,
      message: "Action item deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting action item:', error);
    return c.json({ error: "Failed to delete action item" }, 500);
  }
});

export default actionPlansRoutes;

