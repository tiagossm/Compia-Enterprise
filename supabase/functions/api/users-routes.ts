import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";
import { requireScopes, protectSysAdmin, SCOPES, createAuthErrorResponse, isSystemAdmin, canManageUsers } from "./rbac-middleware.ts";

type Env = {
  DB: any;
};

const usersRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Get current user profile (alias for /profile)
usersRoutes.get("/me", authMiddleware, async (c) => {
  return c.redirect("/api/users/profile");
});

// Get user profile
usersRoutes.get("/profile", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user") as any;

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get user profile from database
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      // Verifica se é o usuário sys_admin protegido
      if (user.id === '01990d69-5246-733d-8605-1ed319a3f98d' || user.email === 'eng.tiagosm@gmail.com') {
        // Recria como sys_admin com configurações completas
        await env.DB.prepare(`
          INSERT INTO users (
            id, email, name, role, can_manage_users, can_create_organizations,
            is_active, organization_id, managed_organization_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `).bind(
          user.id,
          user.email,
          user.google_user_data?.name || 'Tiago Mocha System Admin',
          'sys_admin',
          true,
          true,
          true,
          1, // Organização principal
          1
        ).run();
        console.log(`[USERS_PROFILE] Usuário sys_admin protegido ${user.email} recriado com papel sys_admin.`);

        // Criar entradas de organização e permissões
        await env.DB.prepare(`
          INSERT OR IGNORE INTO user_organizations (user_id, organization_id, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, NOW(), NOW())
        `).bind(user.id, 1, 'owner', true).run();

        await env.DB.prepare(`
          INSERT OR IGNORE INTO organization_permissions (user_id, organization_id, permission_type, granted_by, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `).bind(user.id, 1, 'owner', 'system', true).run();

      } else {
        // Para outros usuários, cria como inspector (padrão)
        await env.DB.prepare(`
          INSERT INTO users (
            id, email, name, role, can_manage_users, can_create_organizations, 
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `).bind(
          user.id,
          user.email,
          user.google_user_data?.name || user.email,
          USER_ROLES.INSPECTOR, // Default role
          false,
          false,
          true
        ).run();
        console.log(`[USERS_PROFILE] Usuário ${user.email} criado com papel inspector.`);
      }

      userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    }

    // Get organization if exists
    let organization = null;
    if (userProfile.organization_id) {
      organization = await env.DB.prepare("SELECT * FROM organizations WHERE id = ?").bind(userProfile.organization_id).first();
    }

    // Get managed organization for org admins
    let managedOrganization = null;
    if (userProfile.managed_organization_id) {
      managedOrganization = await env.DB.prepare("SELECT * FROM organizations WHERE id = ?").bind(userProfile.managed_organization_id).first();
    }

    return c.json({
      profile: userProfile,
      organization: organization,
      managed_organization: managedOrganization
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
});

// Update user profile
usersRoutes.put("/:id", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const userId = c.req.param("id");

  if (!user || user.id !== userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const { name, phone, organization_id } = body;

  try {
    await env.DB.prepare(`
      UPDATE users 
      SET name = ?, phone = ?, organization_id = ?, updated_at = NOW()
      WHERE id = ?
    `).bind(name, phone || null, organization_id || null, userId).run();

    return c.json({ message: "Profile updated successfully" });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Promote user to admin (for first-time setup)
usersRoutes.post("/promote-to-admin", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Check if there are any system admins already
    const existingAdmins = await env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = ?").bind(USER_ROLES.SYSTEM_ADMIN).first() as any;

    if (existingAdmins.count > 0) {
      return c.json({ error: "System admin already exists. Cannot promote another user." }, 400);
    }

    // Promote user to system admin
    await env.DB.prepare(`
      UPDATE users 
      SET role = ?, can_manage_users = ?, can_create_organizations = ?, updated_at = NOW()
      WHERE id = ?
    `).bind(USER_ROLES.SYSTEM_ADMIN, true, true, user.id).run();

    // Log activity
    await env.DB.prepare(`
      INSERT INTO activity_log (user_id, action_type, action_description, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      'user_promoted',
      'Promoted to system administrator',
      'user',
      user.id
    ).run();

    return c.json({ message: "Successfully promoted to system administrator." });

  } catch (error) {
    console.error('Error promoting user:', error);
    return c.json({ error: "Failed to promote user." }, 500);
  }
});

// Get simple user list for dropdowns (id, name, photo)
// Accessible by authenticated users to see colleagues in their organization
usersRoutes.get("/simple-list", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    // Determine filter based on role
    let query = "SELECT id, name, email, role, avatar_url FROM users";
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (isSystemAdmin(userProfile?.role)) {
      const orgId = c.req.query('organization_id');
      if (orgId) {
        whereConditions.push("organization_id = ?");
        params.push(orgId);
      }
    } else if (userProfile?.role === USER_ROLES.ORG_ADMIN) {
      if (userProfile.managed_organization_id) {
        whereConditions.push(`(
               organization_id IN (
                 SELECT id FROM organizations 
                 WHERE id = ? OR parent_organization_id = ?
               ) OR organization_id IS NULL
             )`);
        params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
      }
    } else {
      // Regular user: can only see users in their own organization
      if (userProfile?.organization_id) {
        whereConditions.push("organization_id = ?");
        params.push(userProfile.organization_id);
      } else {
        // If no org, return just themselves
        whereConditions.push("id = ?");
        params.push(user.id);
      }
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY name ASC";

    const users = await env.DB.prepare(query).bind(...params).all();

    // Map to simple structure
    const simpleUsers = (users.results || []).map((u: any) => {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_url: u.avatar_url,
        role: u.role
      };
    });



    return c.json({ users: simpleUsers });

  } catch (error: any) {
    console.error('Error fetching user list:', error);
    return c.json({
      error: "Failed to fetch users",
      details: error.message,
      stack: error.stack
    }, 500);
  }
});

// Get all users (requires users:read scope)
usersRoutes.get("/", authMiddleware, requireScopes(SCOPES.USERS_READ), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  console.log('[LIST_USERS] Usuario requisitando lista:', user.email, 'ID:', user.id);

  // Buscar perfil do usuário
  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  console.log('[LIST_USERS] Perfil do usuario:', userProfile?.role || 'NAO_ENCONTRADO');

  if (!userProfile || !canManageUsers(userProfile.role)) {
    console.log('[LIST_USERS] Permissoes insuficientes. Role:', userProfile?.role);
    return c.json(createAuthErrorResponse('forbidden', 'Permissões insuficientes para listar usuários', [SCOPES.USERS_READ]), 403);
  }

  try {
    let query = `
      SELECT u.*, o.name as organization_name,
             mo.name as managed_organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN organizations mo ON u.managed_organization_id = mo.id
    `;

    const params: any[] = [];
    const whereConditions: string[] = [];

    if (isSystemAdmin(userProfile.role)) {
      console.log('[LIST_USERS] SYSTEM_ADMIN - vendo todos os usuarios');
      // System admin vê todos os usuários sem filtros
      // No filters applied
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      console.log('[LIST_USERS] ORG_ADMIN - organizacao gerenciada:', userProfile.managed_organization_id);
      // Org admin vê usuários da sua organização, subsidiárias e usuários não atribuídos
      if (userProfile.managed_organization_id) {
        whereConditions.push(`(
          u.organization_id IN (
            SELECT id FROM organizations 
            WHERE id = ? OR parent_organization_id = ?
          ) OR u.organization_id IS NULL
        )`);
        params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
      }
    } else {
      // Other roles see only users from their organization
      if (userProfile.organization_id) {
        whereConditions.push("u.organization_id = ?");
        params.push(userProfile.organization_id);
      }
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY u.created_at DESC";

    console.log('[LIST_USERS] Query final:', query);
    console.log('[LIST_USERS] Parametros:', params);

    const users = await env.DB.prepare(query).bind(...params).all();

    console.log('[LIST_USERS] Usuarios encontrados:', users.results?.length || 0);

    // Debug: log first few users
    if (users.results && users.results.length > 0) {
      console.log('[LIST_USERS] Primeiros usuarios:', users.results.slice(0, 3).map((u: any) => ({
        email: u.email,
        name: u.name,
        role: u.role,
        organization_id: u.organization_id,
        organization_name: u.organization_name
      })));
    }

    return c.json({ users: users.results });

  } catch (error) {
    console.error('[LIST_USERS] Error fetching users:', error);
    return c.json({ error: "Failed to fetch users." }, 500);
  }
});

// Get user statistics (for admins)
usersRoutes.get("/stats", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  // Buscar perfil do usuário
  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile || !canManageUsers(userProfile.role)) {
    return c.json(createAuthErrorResponse('forbidden', 'Permissões insuficientes para ver convites', [SCOPES.USERS_INVITATIONS_READ]), 403);
  }

  try {
    let whereClause = "";
    let params: any[] = [];

    if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin can only see stats for their organization and subsidiaries
      whereClause = `
        WHERE organization_id IN (
          SELECT id FROM organizations 
          WHERE id = ? OR parent_organization_id = ?
        )
      `;
      params = [userProfile.managed_organization_id, userProfile.managed_organization_id];
    }

    // Get total users count
    const totalUsers = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM users ${whereClause}
    `).bind(...params).first() as any;

    // Get active users count
    const activeUsers = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      ${whereClause}${whereClause ? ' AND' : 'WHERE'} is_active = true
    `).bind(...params).first() as any;

    // Get users by role
    const usersByRole = await env.DB.prepare(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      ${whereClause}
      GROUP BY role
      ORDER BY count DESC
    `).bind(...params).all();

    // Get recent user registrations (last 30 days)
    const recentRegistrations = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      ${whereClause}${whereClause ? ' AND' : 'WHERE'} created_at >= datetime('now', '-30 days')
    `).bind(...params).first() as any;

    // Get users with organizations
    const usersWithOrganizations = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      ${whereClause}${whereClause ? ' AND' : 'WHERE'} organization_id IS NOT NULL
    `).bind(...params).first() as any;

    return c.json({
      total_users: totalUsers?.count || 0,
      active_users: activeUsers?.count || 0,
      users_by_role: usersByRole.results || [],
      recent_registrations: recentRegistrations?.count || 0,
      users_with_organizations: usersWithOrganizations?.count || 0
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return c.json({ error: "Failed to fetch user statistics." }, 500);
  }
});

// Update user by admin (requires users:write scope and protection for sysadmin)
usersRoutes.put("/admin/:id", authMiddleware, requireScopes(SCOPES.USERS_WRITE), protectSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");
  const targetUserId = c.req.param("id");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  // Buscar perfil do usuário
  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile || !canManageUsers(userProfile.role)) {
    return c.json(createAuthErrorResponse('forbidden', 'Permissões insuficientes para editar usuários', [SCOPES.USERS_WRITE]), 403);
  }

  const body = await c.req.json();
  const { name, role, is_active, organization_id } = body;

  try {
    // Get target user
    const targetUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(targetUserId).first() as any;

    if (!targetUser) {
      return c.json({ error: "Target user not found." }, 404);
    }

    // PROTEÇÃO ABSOLUTA: usuário sysadmin eng.tiagosm@gmail.com é INTOCÁVEL
    if (targetUser.email === 'eng.tiagosm@gmail.com' || targetUser.id === '84edf8d1-77d9-4c73-935e-d76745bc3707') {
      return c.json(createAuthErrorResponse('forbidden', 'SISTEMA PROTEGIDO: Este usuário principal não pode ser modificado por questões de segurança', []), 403);
    }

    // Check if org admin has permission to manage this user
    if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      const canManage = targetUser.organization_id === userProfile.managed_organization_id ||
        (await env.DB.prepare(`
                         SELECT id FROM organizations 
                         WHERE id = ? AND parent_organization_id = ?
                       `).bind(targetUser.organization_id, userProfile.managed_organization_id).first());

      if (!canManage) {
        return c.json({ error: "Cannot manage users outside your organization scope." }, 403);
      }

      // Org admin cannot assign admin roles
      if (role === USER_ROLES.ORG_ADMIN || role === USER_ROLES.SYSTEM_ADMIN) {
        return c.json({ error: `Cannot assign role: ${role}.` }, 403);
      }
    }

    // Update user
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }

    if (role !== undefined) {
      updateFields.push("role = ?");
      updateValues.push(role);

      // Update permissions based on role
      if (role === USER_ROLES.ORG_ADMIN) {
        updateFields.push("can_manage_users = ?", "can_create_organizations = ?", "managed_organization_id = ?");
        updateValues.push(true, true, organization_id || targetUser.organization_id);
      } else {
        updateFields.push("can_manage_users = ?", "can_create_organizations = ?", "managed_organization_id = ?");
        updateValues.push(false, false, null);
      }
    }

    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateValues.push(is_active);
    }

    if (organization_id !== undefined) {
      updateFields.push("organization_id = ?");
      updateValues.push(organization_id);
    }

    if (updateFields.length > 0) {
      updateFields.push("updated_at = NOW()");

      await env.DB.prepare(`
        UPDATE users SET ${updateFields.join(", ")} WHERE id = ?
      `).bind(...updateValues, targetUserId).run();

      // Log activity
      await env.DB.prepare(`
        INSERT INTO activity_log (user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `).bind(
        user.id,
        organization_id || targetUser.organization_id,
        'user_updated',
        `Updated user: ${targetUser.email}`,
        'user',
        targetUserId
      ).run();
    }

    return c.json({ message: "User updated successfully." });

  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: "Failed to update user." }, 500);
  }
});

// Get pending invitations (requires users:invitations:read scope)
usersRoutes.get("/pending-invitations", authMiddleware, requireScopes(SCOPES.USERS_INVITATIONS_READ), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile || (!isSystemAdmin(userProfile.role) && userProfile.role !== USER_ROLES.ORG_ADMIN)) {
    return c.json({ error: "Insufficient permissions." }, 403);
  }

  try {
    let query = `
      SELECT ui.*, o.name as organization_name, u.name as inviter_name
      FROM user_invitations ui
      LEFT JOIN organizations o ON ui.organization_id = o.id
      LEFT JOIN users u ON ui.invited_by = u.id
      WHERE ui.accepted_at IS NULL
    `;

    let params: any[] = [];

    if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin can only see invitations for their organization and subsidiaries
      query += `
        AND ui.organization_id IN (
          SELECT id FROM organizations 
          WHERE id = ? OR parent_organization_id = ?
        )
      `;
      params = [userProfile.managed_organization_id, userProfile.managed_organization_id];
    }

    query += " ORDER BY ui.created_at DESC";

    const invitations = await env.DB.prepare(query).bind(...params).all();

    return c.json({ invitations: invitations.results });

  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return c.json({ error: "Failed to fetch pending invitations." }, 500);
  }
});

// Get invitation token (admin only)
usersRoutes.get("/invitations/:id/token", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const invitationId = c.req.param("id");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile || (!isSystemAdmin(userProfile.role) && userProfile.role !== USER_ROLES.ORG_ADMIN)) {
    return c.json({ error: "Insufficient permissions." }, 403);
  }

  try {
    const invitation = await env.DB.prepare("SELECT invitation_token FROM user_invitations WHERE id = ?").bind(invitationId).first() as any;

    if (!invitation) {
      return c.json({ error: "Invitation not found." }, 404);
    }

    return c.json({ token: invitation.invitation_token });

  } catch (error) {
    console.error('Error fetching invitation token:', error);
    return c.json({ error: "Failed to fetch invitation token." }, 500);
  }
});

// Revoke invitation (admin only)
usersRoutes.put("/invitations/:id/revoke", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const invitationId = c.req.param("id");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile || (!isSystemAdmin(userProfile.role) && userProfile.role !== USER_ROLES.ORG_ADMIN)) {
    return c.json({ error: "Insufficient permissions." }, 403);
  }

  try {
    // Get the invitation details
    const invitation = await env.DB.prepare("SELECT * FROM user_invitations WHERE id = ?").bind(invitationId).first() as any;

    if (!invitation) {
      return c.json({ error: "Invitation not found." }, 404);
    }

    // Check if org admin has permission to revoke this invitation
    if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      const canRevoke = invitation.organization_id === userProfile.managed_organization_id ||
        (await env.DB.prepare(`
                         SELECT id FROM organizations 
                         WHERE id = ? AND parent_organization_id = ?
                       `).bind(invitation.organization_id, userProfile.managed_organization_id).first());

      if (!canRevoke) {
        return c.json({ error: "Cannot revoke invitations outside your organization scope." }, 403);
      }
    }

    // Mark invitation as accepted with a special revoked timestamp to prevent reuse
    await env.DB.prepare(`
      UPDATE user_invitations 
      SET accepted_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `).bind(invitationId).run();

    // Log activity
    await env.DB.prepare(`
      INSERT INTO activity_log (user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      invitation.organization_id,
      'invitation_revoked',
      `Revoked invitation for: ${invitation.email}`,
      'invitation',
      invitationId
    ).run();

    return c.json({ message: "Invitation revoked successfully." });

  } catch (error) {
    console.error('Error revoking invitation:', error);
    return c.json({ error: "Failed to revoke invitation." }, 500);
  }
});

// Delete user (system admin only)
usersRoutes.delete("/:id", authMiddleware, requireScopes(SCOPES.USERS_DELETE), protectSysAdmin(), async (c) => {
  const env = c.env;
  const user = c.get("user");
  const targetUserId = c.req.param("id");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  // Buscar perfil do usuário
  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile || !isSystemAdmin(userProfile.role)) {
    return c.json(createAuthErrorResponse('forbidden', 'Apenas administradores de sistema podem excluir usuários', [SCOPES.USERS_DELETE]), 403);
  }

  // Don't allow self-deletion
  if (user.id === targetUserId) {
    return c.json({ error: "Cannot delete your own account." }, 400);
  }

  try {
    const targetUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(targetUserId).first() as any;

    if (!targetUser) {
      return c.json({ error: "User not found." }, 404);
    }

    // PROTEÇÃO ABSOLUTA: usuário sysadmin eng.tiagosm@gmail.com é INTOCÁVEL
    if (targetUser.email === 'eng.tiagosm@gmail.com' || targetUser.id === '84edf8d1-77d9-4c73-935e-d76745bc3707') {
      return c.json(createAuthErrorResponse('forbidden', 'SISTEMA PROTEGIDO: Este usuário principal não pode ser excluído por questões de segurança', []), 403);
    }

    // Delete user permanently
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetUserId).run();

    // Clean up related credentials (if cascade is not set)
    await env.DB.prepare("DELETE FROM user_credentials WHERE user_id = ?").bind(targetUserId).run();

    // Log activity
    await env.DB.prepare(`
      INSERT INTO activity_log (user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      targetUser.organization_id,
      'user_deleted',
      `Deleted user: ${targetUser.email}`,
      'user',
      targetUserId
    ).run();

    return c.json({ message: "User deleted successfully." });

  } catch (error) {
    console.error('Error deactivating user:', error);
    return c.json({ error: "Failed to deactivate user." }, 500);
  }
});

export default usersRoutes;

