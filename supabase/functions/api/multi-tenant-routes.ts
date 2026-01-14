import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

type Env = {
  DB: any;
};

const multiTenantRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Middleware to check if user can manage organizations
const requireOrgAdmin = async (c: any, next: any) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile) {
    return c.json({ error: "User profile not found" }, 404);
  }

  // System admin can do anything
  if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
    return next();
  }

  // Org admin can manage their organization and subsidiaries
  if (userProfile.role === USER_ROLES.ORG_ADMIN && userProfile.can_manage_users) {
    return next();
  }

  return c.json({ error: "Insufficient permissions" }, 403);
};

// Create a new organization hierarchy (for system admin or org admin creating subsidiaries)
multiTenantRoutes.post("/organizations/hierarchy", authMiddleware, requireOrgAdmin, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  const body = await c.req.json();
  const {
    name, type, description, contact_email, contact_phone, address, parent_organization_id,
    subscription_plan, max_users, max_subsidiaries,
    // New professional fields
    cnpj, razao_social, nome_fantasia, cnae_principal, cnae_descricao, natureza_juridica,
    data_abertura, capital_social, porte_empresa, situacao_cadastral, numero_funcionarios,
    setor_industria, subsetor_industria, certificacoes_seguranca, data_ultima_auditoria,
    nivel_risco, contato_seguranca_nome, contato_seguranca_email, contato_seguranca_telefone,
    historico_incidentes, observacoes_compliance, website, faturamento_anual
  } = body;

  try {
    let finalParentOrgId = parent_organization_id;
    let orgLevel = 'company' as const;

    // SYSTEM_ADMIN has complete privileges and bypasses all restrictions
    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      // System admin can create organizations at any level without any restrictions
      if (parent_organization_id) {
        orgLevel = 'subsidiary' as any;
        finalParentOrgId = parent_organization_id; // Use the provided parent
      } else {
        orgLevel = 'company' as const;
        finalParentOrgId = null; // Top-level organization
      }
      // No subsidiary limit checks for SYSTEM_ADMIN
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin can create companies/clients or subsidiaries under their managed organization
      if (!userProfile.managed_organization_id) {
        return c.json({ error: "User is an Org Admin but not assigned to a managed organization." }, 400);
      }
      finalParentOrgId = userProfile.managed_organization_id;

      // Determine organization level based on type
      // If type is explicitly 'subsidiary', treat as subsidiary with limits
      // Otherwise (company, consultancy, client), treat as company level without subsidiary limits
      if (type === 'subsidiary') {
        orgLevel = 'subsidiary' as any;

        // Check subsidiary limit only for actual subsidiaries
        const subsidiaryCount = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM organizations 
          WHERE parent_organization_id = ? AND organization_level = 'subsidiary' AND is_active = true
        `).bind(finalParentOrgId).first() as any;

        const parentOrg = await env.DB.prepare("SELECT max_subsidiaries FROM organizations WHERE id = ?").bind(finalParentOrgId).first() as any;

        if (parentOrg && subsidiaryCount.count >= parentOrg.max_subsidiaries) {
          return c.json({ error: "Maximum number of subsidiaries reached for the parent organization." }, 400);
        }
      } else {
        // For companies, consultancies, and clients - treat as company level (no subsidiary limits)
        orgLevel = 'company' as const;
        // No limit check for company-level organizations managed by org admin
      }
    }

    const result = await env.DB.prepare(`
      INSERT INTO organizations (
        name, type, description, contact_email, contact_phone, address,
        parent_organization_id, organization_level, subscription_status, 
        subscription_plan, max_users, max_subsidiaries, is_active,
        cnpj, razao_social, nome_fantasia, cnae_principal, cnae_descricao, natureza_juridica,
        data_abertura, capital_social, porte_empresa, situacao_cadastral, numero_funcionarios,
        setor_industria, subsetor_industria, certificacoes_seguranca, data_ultima_auditoria,
        nivel_risco, contato_seguranca_nome, contato_seguranca_email, contato_seguranca_telefone,
        historico_incidentes, observacoes_compliance, website, faturamento_anual,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      name,
      type || 'company',
      description || null,
      contact_email || null,
      contact_phone || null,
      address || null,
      finalParentOrgId || null,
      orgLevel,
      'active', // Default status
      subscription_plan || 'basic', // Default plan
      max_users || 50,
      max_subsidiaries || 0,
      true, // Active by default
      // New professional fields
      cnpj || null,
      razao_social || null,
      nome_fantasia || null,
      cnae_principal || null,
      cnae_descricao || null,
      natureza_juridica || null,
      data_abertura || null,
      capital_social || null,
      porte_empresa || null,
      situacao_cadastral || null,
      numero_funcionarios || null,
      setor_industria || null,
      subsetor_industria || null,
      certificacoes_seguranca || null,
      data_ultima_auditoria || null,
      nivel_risco || 'medio',
      contato_seguranca_nome || null,
      contato_seguranca_email || null,
      contato_seguranca_telefone || null,
      historico_incidentes || null,
      observacoes_compliance || null,
      website || null,
      faturamento_anual || null
    ).run();

    const organizationId = result.meta.last_row_id as number;

    // Log activity
    if (user) {
      await env.DB.prepare(`
        INSERT INTO activity_log (user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `).bind(
        user.id,
        organizationId,
        'organization_created',
        `Created organization: ${name}`,
        'organization',
        organizationId.toString()
      ).run();
    }

    return c.json({
      id: organizationId,
      message: "Organization created successfully in hierarchy"
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    return c.json({ error: "Failed to create organization" }, 500);
  }
});

// Invite user to organization
multiTenantRoutes.post("/organizations/:id/invite-user", authMiddleware, requireOrgAdmin, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    const organizationId = parseInt(c.req.param("id"));

    if (isNaN(organizationId)) {
      return c.json({ error: "Invalid organization ID" }, 400);
    }

    const body = await c.req.json();
    const { email, role } = body;

    if (!email || !role) {
      return c.json({ error: "Email and role are required" }, 400);
    }

    // Verify the user can invite to this organization
    if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin can only invite to their managed organization or its subsidiaries
      const org = await env.DB.prepare(`
        SELECT id FROM organizations 
        WHERE id = ? AND (id = ? OR parent_organization_id = ?)
      `).bind(organizationId, userProfile.managed_organization_id, userProfile.managed_organization_id).first();

      if (!org) {
        return c.json({ error: "Cannot invite users to this organization due to scope limitations." }, 403);
      }
      // Org admin can only invite roles within their allowed scope (e.g., no other org_admins)
      if (role === USER_ROLES.ORG_ADMIN || role === USER_ROLES.SYSTEM_ADMIN) {
        return c.json({ error: `Org Admins cannot invite users with the role: ${role}.` }, 403);
      }
    }

    // Check if user already exists
    const existingUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
      return c.json({ error: "A user with this email already exists in the system." }, 400);
    }

    // Check for existing invitation
    const existingInvitation = await env.DB.prepare(`
      SELECT id FROM user_invitations 
      WHERE email = ? AND organization_id = ? AND accepted_at IS NULL AND expires_at > NOW()
    `).bind(email, organizationId).first();

    if (existingInvitation) {
      return c.json({ error: "An active invitation already exists for this email and organization." }, 400);
    }

    // Generate invitation token
    const invitationToken = self.crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create invitation
    await env.DB.prepare(`
      INSERT INTO user_invitations (
        email, organization_id, role, invited_by, invitation_token, 
        expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      email,
      organizationId,
      role,
      user.id,
      invitationToken,
      expiresAt.toISOString()
    ).run();

    // Log activity
    if (user) {
      await env.DB.prepare(`
        INSERT INTO activity_log (user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `).bind(
        user.id,
        organizationId,
        'user_invited',
        `Invited user: ${email} with role: ${role}`,
        'user',
        email
      ).run();
    }

    // In a real implementation, you would send an email here
    const invitationUrl = `${c.req.header('origin') || 'https://localhost'}/accept-invitation/${invitationToken}`;

    return c.json({
      invitation_token: invitationToken,
      invitation_url: invitationUrl,
      expires_at: expiresAt.toISOString(),
      message: "User invitation created successfully."
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return c.json({ error: "Failed to create invitation." }, 500);
  }
});

// Get invitation details moved to main index.ts for public access

// Accept invitation moved to main index.ts for public access

// Get organizations list (basic endpoint for user profile and other components)
multiTenantRoutes.get("/organizations", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile) {
    return c.json({ error: "User profile not found." }, 404);
  }

  try {
    let query = `
      SELECT o.id, o.name, o.type, o.description, o.is_active
      FROM organizations o
    `;

    let params: any[] = [];

    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      // System admin sees ALL active organizations
      query += " WHERE o.is_active = true ORDER BY o.name ASC";
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin sees their organization and subsidiaries/clients
      query += ` 
        WHERE (o.id = ? OR o.parent_organization_id = ?) AND o.is_active = true
        ORDER BY o.name ASC
      `;
      params = [userProfile.managed_organization_id, userProfile.managed_organization_id];
    } else {
      // Other roles see only their organization
      query += " WHERE o.id = ? AND o.is_active = true ORDER BY o.name ASC";
      params = [userProfile.organization_id];
    }

    const organizations = await env.DB.prepare(query).bind(...params).all();

    return c.json({
      organizations: organizations.results || []
    });

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return c.json({ error: "Failed to fetch organizations." }, 500);
  }
});

// Get organization hierarchy (for system admin and org admin) - Available at both /organizations/hierarchy and /hierarchy
multiTenantRoutes.get("/organizations/hierarchy", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile) {
    return c.json({ error: "User profile not found." }, 404);
  }

  try {
    let query = `
      SELECT o.*, 
             (SELECT COUNT(id) FROM users WHERE organization_id = o.id AND is_active = true) as user_count,
             (SELECT COUNT(id) FROM organizations WHERE parent_organization_id = o.id AND is_active = true) as subsidiary_count,
             po.name as parent_organization_name
      FROM organizations o
      LEFT JOIN organizations po ON o.parent_organization_id = po.id
    `;

    let params: any[] = [];

    console.log('User profile:', userProfile.role, 'managed_org_id:', userProfile.managed_organization_id);

    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      // System admin sees ALL organizations (active and inactive)
      query += " WHERE o.is_active = true ORDER BY o.organization_level, o.name ASC";
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin sees their organization and subsidiaries/clients (only active ones)
      // Include their managed organization AND any organizations that have it as parent
      query += ` 
        WHERE (o.id = ? OR o.parent_organization_id = ?) AND o.is_active = true
        ORDER BY 
          CASE 
            WHEN o.id = ? THEN 0 
            WHEN o.organization_level = 'company' THEN 1
            WHEN o.organization_level = 'subsidiary' THEN 2
            ELSE 3
          END,
          o.name ASC
      `;
      params = [userProfile.managed_organization_id, userProfile.managed_organization_id, userProfile.managed_organization_id];
    } else {
      // Other roles see only their organization (only active ones)
      query += " WHERE o.id = ? AND o.is_active = true ORDER BY o.organization_level, o.name ASC";
      params = [userProfile.organization_id];
    }

    console.log('Query:', query);
    console.log('Params:', params);

    const organizations = await env.DB.prepare(query).bind(...params).all();

    console.log('Found organizations:', organizations.results?.length || 0);

    return c.json({
      organizations: organizations.results || [],
      user_role: userProfile.role,
      can_manage: userProfile.can_manage_users || userProfile.role === USER_ROLES.SYSTEM_ADMIN,
      debug: {
        user_id: user.id,
        managed_organization_id: userProfile.managed_organization_id,
        role: userProfile.role
      }
    });

  } catch (error) {
    console.error('Error fetching organization hierarchy:', error);
    return c.json({ error: "Failed to fetch organization hierarchy." }, 500);
  }
});

// Get users within organization scope
multiTenantRoutes.get("/organizations/:id/users", authMiddleware, requireOrgAdmin, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
  const organizationId = parseInt(c.req.param("id"));

  try {
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.organization_id, u.phone, u.avatar_url, u.is_active, u.last_login_at, u.created_at,
             o.name as organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
    `;

    let params: any[] = [];
    let whereClause = [];

    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      // System admin can see users from any organization
      whereClause.push("u.organization_id = ?");
      params.push(organizationId);
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin can see users from their organization and subsidiaries
      whereClause.push(`u.organization_id IN (
        SELECT id FROM organizations 
        WHERE id = ? OR parent_organization_id = ?
      )`);
      params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
    } else {
      return c.json({ error: "Insufficient permissions." }, 403);
    }

    if (whereClause.length > 0) {
      query += " WHERE " + whereClause.join(" AND ");
    }

    query += " ORDER BY u.created_at DESC";

    const users = await env.DB.prepare(query).bind(...params).all();

    // Also get pending invitations for this organization
    const invitations = await env.DB.prepare(`
      SELECT ui.*, u.name as inviter_name
      FROM user_invitations ui
      LEFT JOIN users u ON ui.invited_by = u.id
      WHERE ui.organization_id = ? AND ui.accepted_at IS NULL AND ui.expires_at > NOW()
      ORDER BY ui.created_at DESC
    `).bind(organizationId).all();

    return c.json({
      users: users.results,
      pending_invitations: invitations.results
    });

  } catch (error) {
    console.error('Error fetching organization users:', error);
    return c.json({ error: "Failed to fetch organization users." }, 500);
  }
});

// Update user role within organization (for org admins)
multiTenantRoutes.put("/organizations/:orgId/users/:userId", authMiddleware, requireOrgAdmin, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
  const organizationId = parseInt(c.req.param("orgId"));
  const targetUserId = c.req.param("userId");

  const body = await c.req.json();
  const { role, is_active } = body;

  try {
    // Verify target user belongs to organization scope
    const targetUser = await env.DB.prepare(`
      SELECT u.*, o.parent_organization_id 
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = ?
    `).bind(targetUserId).first() as any;

    if (!targetUser) {
      return c.json({ error: "Target user not found." }, 404);
    }

    // Check permissions
    if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      const canManage = targetUser.organization_id === userProfile.managed_organization_id ||
        targetUser.parent_organization_id === userProfile.managed_organization_id; // Check if it's a direct subsidiary

      if (!canManage) {
        return c.json({ error: "Cannot manage users outside your assigned organization scope." }, 403);
      }

      // Org admin cannot assign roles higher than or equal to their own, except for basic roles
      if (role === USER_ROLES.ORG_ADMIN || role === USER_ROLES.SYSTEM_ADMIN) {
        return c.json({ error: `Org Admins cannot assign role: ${role}.` }, 403);
      }
    }

    // Update user
    const updateFields = [];
    const updateValues = [];

    if (role !== undefined) {
      updateFields.push("role = ?");
      updateValues.push(role);
    }

    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateValues.push(is_active);
    }

    if (updateFields.length > 0) {
      updateFields.push("updated_at = NOW()");

      await env.DB.prepare(`
        UPDATE users SET ${updateFields.join(", ")} WHERE id = ?
      `).bind(...updateValues, targetUserId).run();

      // Log activity
      if (user) {
        await env.DB.prepare(`
          INSERT INTO activity_log (user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW())
        `).bind(
          user.id,
          organizationId,
          'user_updated',
          `Updated user: ${targetUser.email} - Role: ${role}, Active: ${is_active}`,
          'user',
          targetUserId
        ).run();
      }
    }

    return c.json({ message: "User updated successfully." });

  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: "Failed to update user." }, 500);
  }
});

// Update organization (PUT endpoint)
multiTenantRoutes.put("/organizations/:id", authMiddleware, requireOrgAdmin, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const organizationId = parseInt(c.req.param("id"));
    const body = await c.req.json();

    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    // Verify permissions
    if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      const orgToUpdate = await env.DB.prepare("SELECT * FROM organizations WHERE id = ?").bind(organizationId).first() as any;
      if (!orgToUpdate || (orgToUpdate.id !== userProfile.managed_organization_id && orgToUpdate.parent_organization_id !== userProfile.managed_organization_id)) {
        return c.json({ error: "Permissões insuficientes para atualizar esta organização." }, 403);
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name', 'type', 'description', 'contact_email', 'contact_phone', 'address',
      'subscription_plan', 'max_users', 'max_subsidiaries', 'cnpj', 'razao_social',
      'nome_fantasia', 'cnae_principal', 'cnae_descricao', 'natureza_juridica',
      'data_abertura', 'capital_social', 'porte_empresa', 'situacao_cadastral',
      'numero_funcionarios', 'setor_industria', 'subsetor_industria',
      'certificacoes_seguranca', 'data_ultima_auditoria', 'nivel_risco',
      'contato_seguranca_nome', 'contato_seguranca_email', 'contato_seguranca_telefone',
      'historico_incidentes', 'observacoes_compliance', 'website', 'faturamento_anual'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(body[field]);
      }
    }

    if (updateFields.length === 0) {
      return c.json({ message: "Nenhum campo válido para atualizar." }, 400);
    }

    updateFields.push("updated_at = NOW()");

    await env.DB.prepare(`
      UPDATE organizations 
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `).bind(...updateValues, organizationId).run();

    // Log activity
    if (user) {
      await env.DB.prepare(`
        INSERT INTO activity_log (user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `).bind(
        user.id,
        organizationId,
        'organization_updated',
        `Atualizou organização: ${body.name || organizationId}`,
        'organization',
        organizationId.toString()
      ).run();
    }

    return c.json({ message: "Organização atualizada com sucesso!" });
  } catch (error) {
    console.error('Erro ao atualizar organização:', error);
    return c.json({ error: "Falha ao atualizar organização." }, 500);
  }
});

// Get activity log for organization
multiTenantRoutes.get("/organizations/:id/activity", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const organizationId = parseInt(c.req.param("id"));
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  try {
    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
    `;

    let params: any[] = [];
    let whereClause = [];

    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN) {
      // System admin can see all activity
      if (organizationId > 0) {
        whereClause.push("al.organization_id = ?");
        params.push(organizationId);
      }
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin can see activity for their organization and subsidiaries
      whereClause.push(`al.organization_id IN (
        SELECT id FROM organizations 
        WHERE id = ? OR parent_organization_id = ?
      )`);
      params.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
    } else {
      // Other roles see activity for their organization only
      whereClause.push("al.organization_id = ?");
      params.push(userProfile.organization_id);
    }

    if (whereClause.length > 0) {
      query += " WHERE " + whereClause.join(" AND ");
    }

    query += " ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const activities = await env.DB.prepare(query).bind(...params).all();

    return c.json({ activities: activities.results });

  } catch (error) {
    console.error('Error fetching activity log:', error);
    return c.json({ error: "Failed to fetch activity log." }, 500);
  }
});

// Add alternative hierarchy route for compatibility
multiTenantRoutes.get("/hierarchy", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

  if (!userProfile) {
    return c.json({ error: "User profile not found." }, 404);
  }

  try {
    let query = `
      SELECT o.*, 
             (SELECT COUNT(id) FROM users WHERE organization_id = o.id AND is_active = true) as user_count,
             (SELECT COUNT(id) FROM organizations WHERE parent_organization_id = o.id AND is_active = true) as subsidiary_count,
             po.name as parent_organization_name
      FROM organizations o
      LEFT JOIN organizations po ON o.parent_organization_id = po.id
    `;

    let params: any[] = [];

    console.log('User profile:', userProfile.role, 'managed_org_id:', userProfile.managed_organization_id);

    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN) {
      // System admin sees ALL organizations (active and inactive)
      query += " WHERE o.is_active = true ORDER BY o.organization_level, o.name ASC";
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Org admin sees their organization and subsidiaries/clients (only active ones)
      // Include their managed organization AND any organizations that have it as parent
      query += ` 
        WHERE (o.id = ? OR o.parent_organization_id = ?) AND o.is_active = true
        ORDER BY 
          CASE 
            WHEN o.id = ? THEN 0 
            WHEN o.organization_level = 'company' THEN 1
            WHEN o.organization_level = 'subsidiary' THEN 2
            ELSE 3
          END,
          o.name ASC
      `;
      params = [userProfile.managed_organization_id, userProfile.managed_organization_id, userProfile.managed_organization_id];
    } else {
      // Other roles see only their organization (only active ones)
      query += " WHERE o.id = ? AND o.is_active = true ORDER BY o.organization_level, o.name ASC";
      params = [userProfile.organization_id];
    }

    console.log('Query:', query);
    console.log('Params:', params);

    const organizations = await env.DB.prepare(query).bind(...params).all();

    console.log('Found organizations:', organizations.results?.length || 0);

    return c.json({
      organizations: organizations.results || [],
      user_role: userProfile.role,
      can_manage: userProfile.can_manage_users || userProfile.role === USER_ROLES.SYSTEM_ADMIN,
      debug: {
        user_id: user.id,
        managed_organization_id: userProfile.managed_organization_id,
        role: userProfile.role
      }
    });

  } catch (error) {
    console.error('Error fetching organization hierarchy:', error);
    return c.json({ error: "Failed to fetch organization hierarchy." }, 500);
  }
});

export default multiTenantRoutes;

