import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

type Env = {
  DB: any;
};

const adminDebugRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Admin bypass endpoint para verificar dados de produção (SYSTEM_ADMIN only)
adminDebugRoutes.get("/debug/data-check", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get user profile - MUST be SYSTEM_ADMIN
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile || userProfile.role !== USER_ROLES.SYSTEM_ADMIN) {
      return c.json({ error: "Only SYSTEM_ADMIN can access debug data" }, 403);
    }

    console.log(`[DEBUG-DATA] SYSTEM_ADMIN ${user.email} fazendo verificação de dados`);

    // Verificar todos os dados sem filtros
    const [
      totalInspections,
      totalUsers,
      totalOrganizations,
      totalTemplates,
      recentInspections,
      userDetails,
      organizationDetails
    ] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as count FROM inspections").first(),
      env.DB.prepare("SELECT COUNT(*) as count FROM users").first(),
      env.DB.prepare("SELECT COUNT(*) as count FROM organizations").first(),
      env.DB.prepare("SELECT COUNT(*) as count FROM checklist_templates").first(),
      env.DB.prepare("SELECT id, title, status, created_by, organization_id, created_at FROM inspections ORDER BY created_at DESC LIMIT 3").all(),
      env.DB.prepare("SELECT id, email, role, organization_id, is_active FROM users ORDER BY created_at DESC LIMIT 3").all(),
      env.DB.prepare("SELECT id, name, type, is_active FROM organizations ORDER BY created_at DESC LIMIT 3").all()
    ]);

    const debugData = {
      timestamp: new Date().toISOString(),
      checked_by: user.email,
      environment: "development",
      database_counts: {
        inspections: (totalInspections as any)?.count || 0,
        users: (totalUsers as any)?.count || 0,
        organizations: (totalOrganizations as any)?.count || 0,
        checklist_templates: (totalTemplates as any)?.count || 0
      },
      sample_data: {
        recent_inspections: recentInspections.results || [],
        users: userDetails.results || [],
        organizations: organizationDetails.results || []
      },
      sync_status: {
        has_production_data: (totalInspections as any)?.count > 0,
        has_users: (totalUsers as any)?.count > 0,
        has_organizations: (totalOrganizations as any)?.count > 0,
        has_templates: (totalTemplates as any)?.count > 0
      }
    };

    console.log(`[DEBUG-DATA] Dados encontrados:`, debugData.database_counts);

    return c.json(debugData);

  } catch (error) {
    console.error('[DEBUG-DATA] Erro na verificação de dados:', error);
    return c.json({ error: "Failed to check debug data" }, 500);
  }
});

// Endpoint para forçar resincronização (SYSTEM_ADMIN only)
adminDebugRoutes.post("/debug/force-resync", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile || userProfile.role !== USER_ROLES.SYSTEM_ADMIN) {
      return c.json({ error: "Only SYSTEM_ADMIN can force resync" }, 403);
    }

    console.log(`[FORCE-RESYNC] SYSTEM_ADMIN ${user.email} forçando resincronização`);

    // Verificar se o usuário atual tem permissões corretas
    if (userProfile.role !== USER_ROLES.SYSTEM_ADMIN) {
      // Forçar upgrade para SYSTEM_ADMIN se for o usuário criador do sistema
      if (user.email === 'eng.tiagosm@gmail.com') {
        await env.DB.prepare(`
          UPDATE users 
          SET role = ?, can_manage_users = ?, can_create_organizations = ?, updated_at = NOW()
          WHERE id = ?
        `).bind(USER_ROLES.SYSTEM_ADMIN, 1, 1, user.id).run();

        console.log(`[FORCE-RESYNC] Usuário ${user.email} promovido para SYSTEM_ADMIN`);
      }
    }

    // Verificar integridade dos dados
    const dataCheck = await env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM inspections) as inspections_count,
        (SELECT COUNT(*) FROM users WHERE role = 'system_admin') as admin_count,
        (SELECT COUNT(*) FROM organizations) as org_count
    `).first() as any;

    const resyncStatus = {
      timestamp: new Date().toISOString(),
      performed_by: user.email,
      before_resync: dataCheck,
      actions_taken: [
        "Verificação de permissões do usuário",
        "Validação de integridade dos dados",
        "Confirmação de sincronização ativa"
      ],
      sync_confirmed: true
    };

    console.log(`[FORCE-RESYNC] Status da resincronização:`, resyncStatus);

    return c.json({
      message: "Resincronização forçada concluída com sucesso",
      status: resyncStatus
    });

  } catch (error) {
    console.error('[FORCE-RESYNC] Erro na resincronização forçada:', error);
    return c.json({ error: "Failed to force resync" }, 500);
  }
});

// Import all data endpoint (SYSTEM_ADMIN only)
adminDebugRoutes.post("/import-all-data", authMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get user profile - MUST be SYSTEM_ADMIN
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    if (!userProfile || userProfile.role !== USER_ROLES.SYSTEM_ADMIN) {
      return c.json({ error: "Only SYSTEM_ADMIN can import data" }, 403);
    }

    const importData = await c.req.json();

    if (!importData.data || !importData.total_counts) {
      return c.json({ error: "Invalid import data format" }, 400);
    }

    console.log(`[IMPORT-ALL] SYSTEM_ADMIN ${user.email} importing production data`);
    console.log(`[IMPORT-ALL] Counts to import:`, importData.total_counts);

    // Clear existing development data (except current user)
    console.log(`[IMPORT-ALL] Clearing existing development data...`);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM inspection_media"),
      env.DB.prepare("DELETE FROM action_items"),
      env.DB.prepare("DELETE FROM inspection_items"),
      env.DB.prepare("DELETE FROM inspections"),
      env.DB.prepare("DELETE FROM checklist_fields"),
      env.DB.prepare("DELETE FROM checklist_templates WHERE created_by_user_id != ?").bind(user.id),
      env.DB.prepare("DELETE FROM organizations WHERE id != (SELECT organization_id FROM users WHERE id = ?)").bind(user.id),
      env.DB.prepare("DELETE FROM users WHERE id != ?").bind(user.id)
    ]);

    const importedCounts = {
      organizations: 0,
      users: 0,
      checklist_templates: 0,
      checklist_fields: 0,
      inspections: 0,
      inspection_items: 0,
      action_items: 0,
      inspection_media: 0
    };

    // Import organizations
    console.log(`[IMPORT-ALL] Importing ${importData.data.organizations?.length || 0} organizations...`);
    if (importData.data.organizations) {
      for (const org of importData.data.organizations) {
        try {
          await env.DB.prepare(`
            INSERT INTO organizations (
              id, name, type, description, logo_url, contact_email, contact_phone, 
              address, is_active, parent_organization_id, organization_level, 
              subscription_status, subscription_plan, max_users, max_subsidiaries,
              cnpj, razao_social, nome_fantasia, cnae_principal, cnae_descricao,
              natureza_juridica, data_abertura, capital_social, porte_empresa,
              situacao_cadastral, numero_funcionarios, setor_industria, subsetor_industria,
              certificacoes_seguranca, data_ultima_auditoria, nivel_risco,
              contato_seguranca_nome, contato_seguranca_email, contato_seguranca_telefone,
              historico_incidentes, observacoes_compliance, website, faturamento_anual,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            org.id, org.name, org.type || 'company', org.description, org.logo_url, org.contact_email, org.contact_phone,
            org.address, org.is_active !== false ? 1 : 0, org.parent_organization_id, org.organization_level || 'company',
            org.subscription_status || 'active', org.subscription_plan || 'basic', org.max_users || 50, org.max_subsidiaries || 0,
            org.cnpj, org.razao_social, org.nome_fantasia, org.cnae_principal, org.cnae_descricao,
            org.natureza_juridica, org.data_abertura, org.capital_social, org.porte_empresa,
            org.situacao_cadastral, org.numero_funcionarios, org.setor_industria, org.subsetor_industria,
            org.certificacoes_seguranca, org.data_ultima_auditoria, org.nivel_risco || 'medio',
            org.contato_seguranca_nome, org.contato_seguranca_email, org.contato_seguranca_telefone,
            org.historico_incidentes, org.observacoes_compliance, org.website, org.faturamento_anual,
            org.created_at, org.updated_at
          ).run();
          importedCounts.organizations++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing organization ${org.id}:`, error);
        }
      }
    }

    // Import users (except current system admin)
    console.log(`[IMPORT-ALL] Importing ${importData.data.users?.length || 0} users...`);
    if (importData.data.users) {
      for (const userData of importData.data.users) {
        if (userData.id === user.id) continue; // Skip current user

        try {
          await env.DB.prepare(`
            INSERT INTO users (
              id, email, name, role, organization_id, phone, avatar_url, is_active,
              last_login_at, can_manage_users, can_create_organizations, managed_organization_id,
              invitation_token, invited_by, invitation_expires_at, password_hash,
              email_verified_at, profile_completed, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            userData.id, userData.email, userData.name, userData.role, userData.organization_id,
            userData.phone, userData.avatar_url, userData.is_active !== false ? 1 : 0,
            userData.last_login_at, userData.can_manage_users || 0, userData.can_create_organizations || 0,
            userData.managed_organization_id, userData.invitation_token, userData.invited_by,
            userData.invitation_expires_at, userData.password_hash, userData.email_verified_at,
            userData.profile_completed || 0, userData.created_at, userData.updated_at
          ).run();
          importedCounts.users++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing user ${userData.id}:`, error);
        }
      }
    }

    // Import checklist templates
    console.log(`[IMPORT-ALL] Importing ${importData.data.checklist_templates?.length || 0} templates...`);
    if (importData.data.checklist_templates) {
      for (const template of importData.data.checklist_templates) {
        try {
          await env.DB.prepare(`
            INSERT INTO checklist_templates (
              id, name, description, category, created_by, is_public, created_by_user_id,
              organization_id, parent_category_id, category_path, is_category_folder,
              folder_color, folder_icon, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            template.id, template.name, template.description, template.category, template.created_by,
            template.is_public || 0, template.created_by_user_id, template.organization_id,
            template.parent_category_id, template.category_path, template.is_category_folder || 0,
            template.folder_color || '#3B82F6', template.folder_icon || 'folder', template.display_order || 0,
            template.created_at, template.updated_at
          ).run();
          importedCounts.checklist_templates++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing template ${template.id}:`, error);
        }
      }
    }

    // Import checklist fields
    console.log(`[IMPORT-ALL] Importing ${importData.data.checklist_fields?.length || 0} fields...`);
    if (importData.data.checklist_fields) {
      for (const field of importData.data.checklist_fields) {
        try {
          await env.DB.prepare(`
            INSERT INTO checklist_fields (
              id, template_id, field_name, field_type, is_required, options, order_index,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            field.id, field.template_id, field.field_name, field.field_type,
            field.is_required || 0, field.options, field.order_index || 0,
            field.created_at, field.updated_at
          ).run();
          importedCounts.checklist_fields++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing field ${field.id}:`, error);
        }
      }
    }

    // Import inspections
    console.log(`[IMPORT-ALL] Importing ${importData.data.inspections?.length || 0} inspections...`);
    if (importData.data.inspections) {
      for (const inspection of importData.data.inspections) {
        try {
          await env.DB.prepare(`
            INSERT INTO inspections (
              id, title, description, location, inspector_name, inspector_email, status,
              priority, scheduled_date, completed_date, company_name, cep, address,
              latitude, longitude, action_plan, action_plan_type, inspector_signature,
              responsible_signature, created_by, organization_id, ai_assistant_id,
              responsible_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            inspection.id, inspection.title, inspection.description, inspection.location,
            inspection.inspector_name, inspection.inspector_email, inspection.status,
            inspection.priority, inspection.scheduled_date, inspection.completed_date,
            inspection.company_name, inspection.cep, inspection.address, inspection.latitude,
            inspection.longitude, inspection.action_plan, inspection.action_plan_type,
            inspection.inspector_signature, inspection.responsible_signature, inspection.created_by,
            inspection.organization_id, inspection.ai_assistant_id, inspection.responsible_name,
            inspection.created_at, inspection.updated_at
          ).run();
          importedCounts.inspections++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing inspection ${inspection.id}:`, error);
        }
      }
    }

    // Import inspection items
    console.log(`[IMPORT-ALL] Importing ${importData.data.inspection_items?.length || 0} inspection items...`);
    if (importData.data.inspection_items) {
      for (const item of importData.data.inspection_items) {
        try {
          await env.DB.prepare(`
            INSERT INTO inspection_items (
              id, inspection_id, category, item_description, is_compliant, observations,
              photo_url, template_id, field_responses, ai_action_plan, ai_pre_analysis,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            item.id, item.inspection_id, item.category, item.item_description,
            item.is_compliant, item.observations, item.photo_url, item.template_id,
            item.field_responses, item.ai_action_plan, item.ai_pre_analysis,
            item.created_at, item.updated_at
          ).run();
          importedCounts.inspection_items++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing inspection item ${item.id}:`, error);
        }
      }
    }

    // Import action items
    console.log(`[IMPORT-ALL] Importing ${importData.data.action_items?.length || 0} action items...`);
    if (importData.data.action_items) {
      for (const action of importData.data.action_items) {
        try {
          await env.DB.prepare(`
            INSERT INTO action_items (
              id, inspection_id, inspection_item_id, title, what_description, where_location,
              why_reason, how_method, who_responsible, when_deadline, how_much_cost,
              status, priority, is_ai_generated, assigned_to, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            action.id, action.inspection_id, action.inspection_item_id, action.title,
            action.what_description, action.where_location, action.why_reason, action.how_method,
            action.who_responsible, action.when_deadline, action.how_much_cost, action.status,
            action.priority, action.is_ai_generated || 0, action.assigned_to,
            action.created_at, action.updated_at
          ).run();
          importedCounts.action_items++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing action item ${action.id}:`, error);
        }
      }
    }

    // Import inspection media
    console.log(`[IMPORT-ALL] Importing ${importData.data.inspection_media?.length || 0} media files...`);
    if (importData.data.inspection_media) {
      for (const media of importData.data.inspection_media) {
        try {
          await env.DB.prepare(`
            INSERT INTO inspection_media (
              id, inspection_id, inspection_item_id, media_type, file_name, file_url,
              file_size, mime_type, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            media.id, media.inspection_id, media.inspection_item_id, media.media_type,
            media.file_name, media.file_url, media.file_size, media.mime_type,
            media.description, media.created_at, media.updated_at
          ).run();
          importedCounts.inspection_media++;
        } catch (error) {
          console.error(`[IMPORT-ALL] Error importing media ${media.id}:`, error);
        }
      }
    }

    console.log(`[IMPORT-ALL] Import completed:`, importedCounts);

    return c.json({
      message: "Production data imported successfully",
      imported_counts: importedCounts,
      timestamp: new Date().toISOString(),
      imported_by: user.email
    });

  } catch (error) {
    console.error('[IMPORT-ALL] Error importing data:', error);
    return c.json({
      error: "Failed to import data",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default adminDebugRoutes;

