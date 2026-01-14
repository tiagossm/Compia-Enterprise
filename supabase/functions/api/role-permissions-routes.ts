import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

const rolePermissionsRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Middleware to check if user can manage role permissions
const requirePermissionAdmin = async (c: any, next: any) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile) {
    return c.json({ error: "User profile not found" }, 404);
  }

  // Only system admin can manage role permissions
  if (userProfile.role !== USER_ROLES.SYSTEM_ADMIN &&
    userProfile.role !== USER_ROLES.SYS_ADMIN &&
    userProfile.role !== 'admin') {
    return c.json({ error: "Apenas administradores do sistema podem gerenciar permissões" }, 403);
  }

  return next();
};

// Get all role permissions
rolePermissionsRoutes.get("/", authMiddleware, requirePermissionAdmin, async (c) => {
  const env = c.env;

  try {
    const permissions = await env.DB.prepare(`
      SELECT * FROM role_permissions 
      ORDER BY role, permission_type
    `).all();

    return c.json({
      permissions: permissions.results || []
    });

  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return c.json({ error: "Erro ao buscar permissões" }, 500);
  }
});

// Update role permissions
rolePermissionsRoutes.post("/", authMiddleware, requirePermissionAdmin, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return c.json({ error: "Updates deve ser um array" }, 400);
    }

    // Process each update
    for (const update of updates) {
      const { role, permission_type, is_allowed } = update;

      if (!role || !permission_type || typeof is_allowed !== 'boolean') {
        continue; // Skip invalid updates
      }

      // Check if permission already exists
      const existing = await env.DB.prepare(`
        SELECT id FROM role_permissions 
        WHERE role = ? AND permission_type = ?
      `).bind(role, permission_type).first() as any;

      if (existing) {
        // Update existing permission
        await env.DB.prepare(`
          UPDATE role_permissions 
          SET is_allowed = ?, updated_at = NOW()
          WHERE id = ?
        `).bind(is_allowed, existing.id).run();
      } else {
        // Create new permission
        await env.DB.prepare(`
          INSERT INTO role_permissions (
            role, permission_type, is_allowed, organization_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, NOW(), NOW())
        `).bind(role, permission_type, is_allowed, null).run();
      }
    }

    // Log activity
    await env.DB.prepare(`
      INSERT INTO activity_log (
        user_id, organization_id, action_type, action_description,
        target_type, target_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      null,
      'permissions_updated',
      `Atualizou ${updates.length} permissões de papel`,
      'role_permissions',
      'bulk_update'
    ).run();

    return c.json({
      message: "Permissões atualizadas com sucesso",
      updated_count: updates.length
    });

  } catch (error) {
    console.error('Error updating role permissions:', error);
    return c.json({ error: "Erro ao atualizar permissões" }, 500);
  }
});

// Get permissions for specific role
rolePermissionsRoutes.get("/role/:role", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const role = c.req.param("role");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const permissions = await env.DB.prepare(`
      SELECT permission_type, is_allowed FROM role_permissions 
      WHERE role = ?
    `).bind(role).all();

    return c.json({
      role,
      permissions: permissions.results || []
    });

  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return c.json({ error: "Erro ao buscar permissões do papel" }, 500);
  }
});

// Check if user has specific permission
rolePermissionsRoutes.get("/check/:permission", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const permissionType = c.req.param("permission");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const userProfile = await env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      return c.json({ hasPermission: false });
    }

    // System admin has all permissions
    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN) {
      return c.json({ hasPermission: true });
    }

    // Check specific permission
    const permission = await env.DB.prepare(`
      SELECT is_allowed FROM role_permissions 
      WHERE role = ? AND permission_type = ?
    `).bind(userProfile.role, permissionType).first() as any;

    return c.json({
      hasPermission: permission?.is_allowed || false
    });

  } catch (error) {
    console.error('Error checking permission:', error);
    return c.json({ hasPermission: false });
  }
});

export default rolePermissionsRoutes;

