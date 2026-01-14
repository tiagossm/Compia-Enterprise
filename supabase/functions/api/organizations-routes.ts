import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { ExtendedMochaUser, USER_ROLES, ORGANIZATION_LEVELS } from "./user-types.ts";

type Env = {
  DB: any;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  OPENAI_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
};

const getDatabase = (env: any) => env.DB;

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// DEBUG: Log all requests hitting this router
app.get('*', async (c, next) => {
  console.log('[ORGS_ROUTER] Incoming request path:', c.req.path);
  await next();
});

// DEBUG: Public ping route
app.get('/ping', (c) => c.json({ message: 'pong', path: c.req.path }));

// Organizations stats endpoint
app.get('/stats', tenantAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);

    let stats = {
      totalMasterOrgs: 0,
      totalCompanies: 0,
      totalSubsidiaries: 0,
      totalUsers: 0,
      userManagedStats: undefined as any
    };

    if (user.profile?.role === USER_ROLES.SYSTEM_ADMIN || user.profile?.role === 'sys_admin') {
      // System admin gets global stats
      const masterOrgs = await db.prepare('SELECT COUNT(*) as count FROM organizations WHERE organization_level = ?').bind(ORGANIZATION_LEVELS.MASTER).first();
      const companies = await db.prepare('SELECT COUNT(*) as count FROM organizations WHERE organization_level = ?').bind(ORGANIZATION_LEVELS.COMPANY).first();
      const subsidiaries = await db.prepare('SELECT COUNT(*) as count FROM organizations WHERE organization_level = ?').bind(ORGANIZATION_LEVELS.SUBSIDIARY).first();
      const users = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = true').first();

      stats.totalMasterOrgs = masterOrgs?.count || 0;
      stats.totalCompanies = companies?.count || 0;
      stats.totalSubsidiaries = subsidiaries?.count || 0;
      stats.totalUsers = users?.count || 0;
    } else if (user.profile?.role === USER_ROLES.ORG_ADMIN && user.profile?.managed_organization_id) {
      // Org admin gets stats for their managed organization and subsidiaries
      const orgId = user.profile.managed_organization_id;

      const orgUsers = await db.prepare(`
        SELECT COUNT(*) as count 
        FROM users u 
        WHERE u.organization_id = ? OR u.organization_id IN(
  SELECT id FROM organizations WHERE parent_organization_id = ?
        ) AND u.is_active = true
  `).bind(orgId, orgId).first();

      const subsidiaries = await db.prepare('SELECT COUNT(*) as count FROM organizations WHERE parent_organization_id = ?').bind(orgId).first();

      const pendingInspections = await db.prepare(`
        SELECT COUNT(*) as count 
        FROM inspections 
        WHERE organization_id = ? OR organization_id IN(
    SELECT id FROM organizations WHERE parent_organization_id = ?
        ) AND status = 'pendente'
  `).bind(orgId, orgId).first();

      const activeInspections = await db.prepare(`
        SELECT COUNT(*) as count 
        FROM inspections 
        WHERE organization_id = ? OR organization_id IN(
    SELECT id FROM organizations WHERE parent_organization_id = ?
        ) AND status IN('em_andamento', 'revisao')
  `).bind(orgId, orgId).first();

      stats.userManagedStats = {
        totalUsers: orgUsers?.count || 0,
        totalSubsidiaries: subsidiaries?.count || 0,
        pendingInspections: pendingInspections?.count || 0,
        activeInspections: activeInspections?.count || 0
      };
    }

    return c.json(stats);
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Get all organizations (with user filtering)
app.get('/', tenantAuthMiddleware, async (c) => {
  console.log('[ORGS] GET / route handler reached');
  try {
    const user = c.get('user') as ExtendedMochaUser;
    console.log('[ORGS] User:', user?.email || 'NO USER');
    const db = getDatabase(c.env);

    // Get user profile
    const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      console.error('[ORGS] User profile NOT found for ID:', user.id);
      return c.json({ error: "User profile not found (DB mismatch)" }, 400);
    }
    console.log('[ORGS] User profile found, role:', userProfile.role);

    let query = `
      SELECT o.*,
  (SELECT COUNT(*) FROM user_organizations WHERE organization_id = o.id AND is_active = true) as user_count,
    (SELECT COUNT(*) FROM organizations WHERE parent_organization_id = o.id AND is_active = true) as subsidiary_count,
      po.name as parent_organization_name
      FROM organizations o
      LEFT JOIN organizations po ON o.parent_organization_id = po.id
  `;

    const params: any[] = [];
    const whereConditions: string[] = [];

    // Filter based on user role
    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      // System admin sees all organizations
      whereConditions.push("o.is_active = true");
    } else {
      // All other users see:
      // 1. Orgs they manage (if Org Admin) + Subsidiaries
      // 2. Orgs they are explicitly assigned to via user_organizations
      // 3. Their primary organization (fallback)

      const userId = user.id;
      // We use a broader clause:
      // ID in user_organizations
      // OR ID = primary org
      // OR (Role=OrgAdmin AND (ID=Managed OR Parent=Managed))

      let subConditions = [];
      const subParams = [];

      // 1. Explicit assignments & Primary (via user_organizations usually has primary, but legacy fallback:)
      subConditions.push(`o.id IN (SELECT organization_id FROM user_organizations WHERE user_id = '${userId}')`);

      // 2. Legacy Primary
      if (userProfile.organization_id) {
        subConditions.push("o.id = ?");
        subParams.push(userProfile.organization_id);
      }

      // 3. Managed Hierarchy (Org Admin)
      if (userProfile.role === USER_ROLES.ORG_ADMIN && userProfile.managed_organization_id) {
        subConditions.push("(o.id = ? OR o.parent_organization_id = ?)");
        subParams.push(userProfile.managed_organization_id, userProfile.managed_organization_id);
      }

      if (subConditions.length > 0) {
        whereConditions.push(`(${subConditions.join(' OR ')}) AND o.is_active = true`);
        params.push(...subParams);
      } else {
        whereConditions.push("1 = 0"); // No access
      }
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY o.parent_organization_id IS NULL DESC, o.name ASC";

    const organizations = await db.prepare(query).bind(...params).all();

    // Get user counts for each organization
    const userCounts: Record<number, number> = {};
    for (const org of (organizations.results || [])) {
      const orgData = org as any;
      userCounts[orgData.id] = orgData.user_count || 0;
    }

    return c.json({
      organizations: organizations.results || [],
      userCounts
    });

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return c.json({ error: 'Erro ao buscar organizações' }, 500);
  }
});

// Get single organization by ID
app.get('/:id', tenantAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);
    const organizationId = parseInt(c.req.param('id'));

    if (isNaN(organizationId)) {
      return c.json({ error: 'ID de organização inválido' }, 400);
    }

    // Get user profile
    const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Check permissions
    let hasAccess = false;
    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      hasAccess = true;
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      // Check if this organization is under their management
      const orgCheck = await db.prepare(`
        SELECT id FROM organizations 
        WHERE id = ? AND(id = ? OR parent_organization_id = ?)
        `).bind(organizationId, userProfile.managed_organization_id, userProfile.managed_organization_id).first();
      hasAccess = !!orgCheck;
    } else {
      console.log(`[ORGS - DEBUG] Deep Check for User: ${user.email} Role: ${userProfile.role} `);
      console.log(`[ORGS - DEBUG] User OrgID: ${userProfile.organization_id} (Type: ${typeof userProfile.organization_id})`);
      console.log(`[ORGS - DEBUG] Target OrgID: ${organizationId} (Type: ${typeof organizationId})`);

      // Use loose equality to handle possible BigInt/Number mismatch
      hasAccess = userProfile.organization_id == organizationId;
      console.log(`[ORGS - DEBUG] Direct Access Result: ${hasAccess} `);
    }

    if (!hasAccess) {
      // Allow access if user is participating in an event or inspection in this organization
      const userEmail = userProfile.email || user.email;
      console.log(`[ORGS] Checking participation for ${userEmail} in Org ${organizationId} `);

      const inspectionAccess = await db.prepare("SELECT id FROM inspections WHERE organization_id = ? AND inspector_email = ?").bind(organizationId, userEmail).first();
      if (inspectionAccess) {
        console.log('[ORGS-DEBUG] Access granted via Inspection:', inspectionAccess);
        hasAccess = true;
      } else {
        // Check calendar participation
        console.log(`[ORGS - DEBUG] Checking calendar for: ${userEmail} `);
        const calendarAccess = await db.prepare("SELECT id FROM calendar_events WHERE organization_id = ? AND participants::text LIKE ?").bind(organizationId, `%"${userEmail}"%`).first();
        if (calendarAccess) {
          console.log('[ORGS-DEBUG] Access granted via Calendar:', calendarAccess);
          hasAccess = true;
        } else {
          console.log('[ORGS-DEBUG] No calendar access found.');
        }
      }
    }

    if (!hasAccess) {
      return c.json({ error: 'Acesso negado a esta organização' }, 403);
    }

    // Get organization with additional data
    const organization = await db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id AND is_active = true) as user_count,
  (SELECT COUNT(*) FROM organizations WHERE parent_organization_id = o.id AND is_active = true) as subsidiary_count,
    po.name as parent_organization_name
      FROM organizations o
      LEFT JOIN organizations po ON o.parent_organization_id = po.id
      WHERE o.id = ?
  `).bind(organizationId).first() as any;

    if (!organization) {
      return c.json({ error: 'Organização não encontrada' }, 404);
    }

    return c.json({ organization });

  } catch (error: any) {
    console.error('Error fetching organization:', error);
    return c.json({
      error: 'Erro ao buscar organização',
      details: error.message,
      stack: error.stack
    }, 500);
  }
});

// Create new organization
app.post('/', tenantAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);

    // Get user profile
    const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Check permissions
    if (!userProfile.can_create_organizations &&
      userProfile.role !== USER_ROLES.SYSTEM_ADMIN &&
      userProfile.role !== 'sys_admin') {
      return c.json({ error: 'Permissões insuficientes para criar organizações' }, 403);
    }

    const body = await c.req.json();
    const {
      name, type, description, contact_email, contact_phone, address,
      parent_organization_id, subscription_plan, max_users, max_subsidiaries,
      cnpj, razao_social, nome_fantasia, cnae_principal, cnae_descricao,
      natureza_juridica, data_abertura, capital_social, porte_empresa,
      situacao_cadastral, numero_funcionarios, setor_industria,
      subsetor_industria, certificacoes_seguranca, data_ultima_auditoria,
      nivel_risco, contato_seguranca_nome, contato_seguranca_email,
      contato_seguranca_telefone, historico_incidentes, observacoes_compliance,
      website, faturamento_anual
    } = body;

    if (!name) {
      return c.json({ error: 'Nome da organização é obrigatório' }, 400);
    }

    // Determine organization level
    let orgLevel = 'company';
    let finalParentId = parent_organization_id;

    if (userProfile.role === USER_ROLES.ORG_ADMIN && userProfile.managed_organization_id) {
      // Org admin creates under their management
      finalParentId = userProfile.managed_organization_id;
      orgLevel = parent_organization_id ? 'subsidiary' : 'company';
    }

    const result = await db.prepare(`
      INSERT INTO organizations(
    name, type, description, contact_email, contact_phone, address,
    parent_organization_id, organization_level, subscription_status,
    subscription_plan, max_users, max_subsidiaries, is_active,
    cnpj, razao_social, nome_fantasia, cnae_principal, cnae_descricao,
    natureza_juridica, data_abertura, capital_social, porte_empresa,
    situacao_cadastral, numero_funcionarios, setor_industria,
    subsetor_industria, certificacoes_seguranca, data_ultima_auditoria,
    nivel_risco, contato_seguranca_nome, contato_seguranca_email,
    contato_seguranca_telefone, historico_incidentes, observacoes_compliance,
    website, faturamento_anual,
    created_at, updated_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  RETURNING id
  `).bind(
      name,
      type || 'company',
      description || null,
      contact_email || null,
      contact_phone || null,
      address || null,
      finalParentId || null,
      orgLevel,
      'active',
      subscription_plan || 'basic',
      max_users || 50,
      max_subsidiaries || 0,
      true,
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
    ).first() as any;

    const organizationId = result?.id;

    if (!organizationId) {
      console.error('Error: Organization created but no ID returned');
      return c.json({ error: 'Erro ao obter ID da organização criada' }, 500);
    }

    // Log activity
    await db.prepare(`
      INSERT INTO activity_log(user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
VALUES(?, ?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      organizationId,
      'organization_created',
      `Criou organização: ${name} `,
      'organization',
      organizationId.toString()
    ).run();

    return c.json({
      id: organizationId,
      message: "Organização criada com sucesso"
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao criar organização' }, 500);
  }
});

// Update organization
app.put('/:id', tenantAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);
    const organizationId = parseInt(c.req.param('id'));

    if (isNaN(organizationId)) {
      return c.json({ error: 'ID de organização inválido' }, 400);
    }

    // Get user profile
    const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Check permissions
    let hasAccess = false;
    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      hasAccess = true;
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      const orgCheck = await db.prepare(`
        SELECT id FROM organizations 
        WHERE id = ? AND(id = ? OR parent_organization_id = ?)
  `).bind(organizationId, userProfile.managed_organization_id, userProfile.managed_organization_id).first();
      hasAccess = !!orgCheck;
    }

    if (!hasAccess) {
      return c.json({ error: 'Permissões insuficientes para atualizar esta organização' }, 403);
    }

    const body = await c.req.json();

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name', 'type', 'description', 'contact_email', 'contact_phone', 'address',
      'subscription_plan', 'max_users', 'max_subsidiaries', 'is_active',
      'cnpj', 'razao_social', 'nome_fantasia', 'cnae_principal', 'cnae_descricao',
      'natureza_juridica', 'data_abertura', 'capital_social', 'porte_empresa',
      'situacao_cadastral', 'numero_funcionarios', 'setor_industria',
      'subsetor_industria', 'certificacoes_seguranca', 'data_ultima_auditoria',
      'nivel_risco', 'contato_seguranca_nome', 'contato_seguranca_email',
      'contato_seguranca_telefone', 'historico_incidentes', 'observacoes_compliance',
      'website', 'faturamento_anual', 'logo_url'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(body[field]);
      }
    }

    if (updateFields.length === 0) {
      return c.json({ message: "Nenhum campo para atualizar" }, 400);
    }

    updateFields.push("updated_at = NOW()");

    await db.prepare(`
      UPDATE organizations 
      SET ${updateFields.join(", ")}
      WHERE id = ?
  `).bind(...updateValues, organizationId).run();

    // Log activity
    await db.prepare(`
      INSERT INTO activity_log(user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
VALUES(?, ?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      organizationId,
      'organization_updated',
      `Atualizou organização: ${body.name || organizationId} `,
      'organization',
      organizationId.toString()
    ).run();

    return c.json({ message: "Organização atualizada com sucesso" });

  } catch (error) {
    console.error('Error updating organization:', error);
    return c.json({ error: 'Erro ao atualizar organização' }, 500);
  }
});

// Delete organization
app.delete('/:id', tenantAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);
    const organizationId = parseInt(c.req.param('id'));

    if (isNaN(organizationId)) {
      return c.json({ error: 'ID de organização inválido' }, 400);
    }

    // Get user profile
    const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Check permissions - only system admin and org admin can delete
    let hasAccess = false;
    if (userProfile.role === USER_ROLES.SYSTEM_ADMIN || userProfile.role === 'sys_admin') {
      hasAccess = true;
    } else if (userProfile.role === USER_ROLES.ORG_ADMIN) {
      const orgCheck = await db.prepare(`
        SELECT id FROM organizations 
        WHERE id = ? AND(id = ? OR parent_organization_id = ?)
  `).bind(organizationId, userProfile.managed_organization_id, userProfile.managed_organization_id).first();
      hasAccess = !!orgCheck;
    }

    if (!hasAccess) {
      return c.json({ error: 'Permissões insuficientes para excluir esta organização' }, 403);
    }

    // Get organization to check if it exists
    const organization = await db.prepare("SELECT * FROM organizations WHERE id = ?").bind(organizationId).first() as any;

    if (!organization) {
      return c.json({ error: 'Organização não encontrada' }, 404);
    }

    // Check if organization has users or subsidiaries
    const userCount = await db.prepare("SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND is_active = true").bind(organizationId).first() as any;
    const subsidiaryCount = await db.prepare("SELECT COUNT(*) as count FROM organizations WHERE parent_organization_id = ? AND is_active = true").bind(organizationId).first() as any;

    if (userCount?.count > 0) {
      return c.json({
        error: `Não é possível excluir a organização.Ela possui ${userCount.count} usuário(s) ativo(s).`,
        details: 'Remova ou transfira todos os usuários antes de excluir a organização.'
      }, 400);
    }

    if (subsidiaryCount?.count > 0) {
      return c.json({
        error: `Não é possível excluir a organização.Ela possui ${subsidiaryCount.count} subsidiária(s) ativa(s).`,
        details: 'Remova ou transfira todas as subsidiárias antes de excluir a organização.'
      }, 400);
    }

    // Check for inspections
    const inspectionCount = await db.prepare("SELECT COUNT(*) as count FROM inspections WHERE organization_id = ?").bind(organizationId).first() as any;

    if (inspectionCount?.count > 0) {
      return c.json({
        error: `Não é possível excluir a organização.Ela possui ${inspectionCount.count} inspeção(ões) associada(s).`,
        details: 'Remova ou transfira todas as inspeções antes de excluir a organização.'
      }, 400);
    }

    // Soft delete - just mark as inactive instead of actual deletion
    await db.prepare(`
      UPDATE organizations 
      SET is_active = false, updated_at = NOW()
      WHERE id = ?
  `).bind(organizationId).run();

    // Log activity
    await db.prepare(`
      INSERT INTO activity_log(user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
VALUES(?, ?, ?, ?, ?, ?, NOW())
    `).bind(
      user.id,
      organizationId,
      'organization_deleted',
      `Excluiu organização: ${organization.name} `,
      'organization',
      organizationId.toString()
    ).run();

    return c.json({
      message: "Organização excluída com sucesso",
      note: "A organização foi desativada mas seus dados foram preservados."
    });

  } catch (error) {
    console.error('Error deleting organization:', error);
    return c.json({ error: 'Erro ao excluir organização' }, 500);
  }
});

// Increment AI usage count for an organization
app.post('/increment-ai-usage', tenantAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);

    const body = await c.req.json();
    const { organization_id } = body;

    if (!organization_id) {
      return c.json({ error: 'organization_id é obrigatório' }, 400);
    }

    // Get user profile to verify access
    const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Verify user belongs to this organization or is admin
    const hasAccess =
      userProfile.organization_id === organization_id ||
      userProfile.managed_organization_id === organization_id ||
      userProfile.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile.role === 'sys_admin';

    if (!hasAccess) {
      return c.json({ error: 'Acesso negado' }, 403);
    }

    // Increment the counter
    await db.prepare(`
      UPDATE organizations 
      SET ai_usage_count = COALESCE(ai_usage_count, 0) + 1,
  updated_at = NOW()
      WHERE id = ?
  `).bind(organization_id).run();

    // Log to ai_usage_log if table exists
    try {
      await db.prepare(`
        INSERT INTO ai_usage_log(organization_id, user_id, feature_type, model_used, status, created_at)
VALUES(?, ?, 'analysis', 'gpt-4o-mini', 'success', NOW())
  `).bind(organization_id, user.id).run();
    } catch (logError) {
      console.warn('[AI-USAGE] Could not log to ai_usage_log:', logError);
    }

    console.log('[AI-USAGE] ✅ Incremented for org:', organization_id, 'by user:', user.id);

    return c.json({
      success: true,
      message: 'Uso de IA contabilizado'
    });

  } catch (error) {
    console.error('Error incrementing AI usage:', error);
    return c.json({ error: 'Erro ao contabilizar uso de IA' }, 500);
  }
});

export default app;

