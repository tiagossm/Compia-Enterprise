import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";
import { logActivity } from "./audit-logger.ts";
import { aiRateLimitMiddleware, finalizeAIUsage } from "./ai-rate-limit.ts";
import { generateAICompletion } from "./ai-service.ts";
import { incrementAiUsage } from "./ai-usage-tracker.ts";

type Env = {
  DB: any;
  OPENAI_API_KEY?: string;
  [key: string]: any;
};

const checklistRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>().basePath('/api/checklist');

// List all checklist templates - ENHANCED ADMIN VISIBILITY
// List all checklist templates - ENHANCED ADMIN VISIBILITY
checklistRoutes.get("/templates", tenantAuthMiddleware, async (c) => {
  // Reuse the same logic - copy paste or function extraction would be better but for now replacing content
  // Actually, I can just mount the same handler if I extracted it, but for this tool I need to careful.
  // I will just change the existing route to be /templates OR keep both if I want backward compatibility.
  // Given this is a new app phase, let's just CHANGE it to /templates as it is cleaner, 
  // BUT wait, looking at the code I see "/checklist-templates". I should probably just change that line to "/templates" 
  // since "checklist" is already in the prefix from index.ts.
  // So URL will be /api/checklist/templates. Perfect.
  return handleListTemplates(c);
});

checklistRoutes.get("/checklist-templates", tenantAuthMiddleware, async (c) => {
  return handleListTemplates(c);
});

async function handleListTemplates(c: any) {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  // Verificar se o banco de dados está disponível
  if (!env?.DB) {
    return c.json({ error: "Database não disponível", templates: [] }, 503);
  }

  try {
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    console.log(`[TEMPLATES] [PROD] Usuario ${user.email} role: ${userProfile?.role} org: ${userProfile?.organization_id}`);

    let query = `
      SELECT ct.*, 
             COUNT(cf.id) as field_count,
             ct.is_category_folder as is_folder
      FROM checklist_templates ct
      LEFT JOIN checklist_fields cf ON ct.id = cf.template_id
    `;
    let params: any[] = [];
    let whereClause = ["(ct.is_category_folder = false OR ct.is_category_folder IS NULL)"];

    // ADMIN SYSTEM TEM ACESSO IRRESTRITO A TUDO
    if (userProfile?.role === USER_ROLES.SYSTEM_ADMIN || userProfile?.role === 'admin') {
      console.log(`[TEMPLATES] [PROD] ADMIN COMPLETO - TODAS as templates sem filtros aplicados`);
    } else {
      // Postgres boolean comparison requires true/false
      let conditions = ["ct.is_public = true", "ct.created_by_user_id = ?"];
      params.push(user.id);

      if (userProfile?.organization_id) {
        conditions.push("ct.organization_id = ?");
        params.push(userProfile.organization_id);
      }
      whereClause.push(`(${conditions.join(" OR ")})`);
    }

    // Filter by folder_id
    const folderId = c.req.query("folder_id");
    if (folderId && folderId !== 'null') {
      whereClause.push("ct.folder_id = ?");
      params.push(folderId);
    } else if (folderId === 'null') {
      whereClause.push("ct.folder_id IS NULL");
    }

    if (whereClause.length > 0) {
      query += " WHERE " + whereClause.join(" AND ");
    }

    query += " GROUP BY ct.id ORDER BY ct.display_order ASC, ct.created_at DESC";

    console.log(`[TEMPLATES] [PROD] Query final: ${query}`);
    console.log(`[TEMPLATES] [PROD] Parametros: ${JSON.stringify(params)}`);

    const result = await env.DB.prepare(query).bind(...params).all();
    const templates = result.results || [];

    console.log(`[TEMPLATES] [PROD] Found ${templates.length} templates for user ${user.email} (role: ${userProfile?.role})`);

    if (templates.length > 0) {
      console.log(`[TEMPLATES] [PROD] Primeiras templates encontradas:`, templates.slice(0, 5).map((t: any) => ({
        id: t.id,
        name: t.name,
        is_public: t.is_public,
        organization_id: t.organization_id,
        created_by_user_id: t.created_by_user_id,
        is_folder: t.is_category_folder
      })));
    } else {
      console.log(`[TEMPLATES] [PROD] ZERO templates encontradas - possível problema de filtros`);
      console.log(`[TEMPLATES] [PROD] Debug info:`, {
        userRole: userProfile?.role,
        userOrgId: userProfile?.organization_id,
        userId: user.id,
        userEmail: user.email,
        isSystemAdmin: userProfile?.role === USER_ROLES.SYSTEM_ADMIN,
        isAdmin: userProfile?.role === 'admin'
      });
    }

    return c.json({ templates });
  } catch (error) {
    console.error('[TEMPLATES] [PROD] Error fetching templates:', error);
    return c.json({ error: error instanceof Error ? error.message : "Failed to fetch templates" }, 500);
  }
}

// Get specific checklist template with fields
checklistRoutes.get("/checklist-templates/:id", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const templateId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get template
    const template = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(templateId).first() as any;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    // Check access permissions
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }
    const canAccess = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      template.is_public ||
      template.created_by_user_id === user.id ||
      template.organization_id === userProfile?.organization_id;

    if (!canAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    // Get fields
    const fields = await env.DB.prepare(`
      SELECT * FROM checklist_fields 
      WHERE template_id = ? 
      ORDER BY order_index ASC
    `).bind(templateId).all();

    return c.json({
      template,
      fields: fields.results || []
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return c.json({ error: "Failed to fetch template" }, 500);
  }
});

// Create checklist template
checklistRoutes.post("/checklist-templates", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, category, is_public, parent_category_id, folder_id } = body;

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    const result = await env.DB.prepare(`
      INSERT INTO checklist_templates (
        name, description, category, created_by, created_by_user_id, 
        organization_id, is_public, parent_category_id, folder_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id
    `).bind(
      name,
      description || null,
      category,
      user.google_user_data?.name || user.email,
      user.id,
      userProfile?.organization_id || null,
      is_public || false,
      parent_category_id || null,
      folder_id || null
    ).run();

    const newTemplateId = result.meta.last_row_id;

    // Log Activity
    await logActivity(env, {
      userId: user.id,
      orgId: userProfile?.organization_id || null,
      actionType: 'CREATE',
      actionDescription: `Checklist Template Created: ${name}`,
      targetType: 'CHECKLIST_TEMPLATE',
      targetId: newTemplateId,
      metadata: { name, category, is_public },
      req: c.req
    });

    return c.json({
      id: newTemplateId,
      message: "Template created successfully"
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return c.json({ error: "Failed to create template" }, 500);
  }
});

// Create checklist field
checklistRoutes.post("/checklist-fields", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    console.log('[CHECKLIST_FIELDS] Received body:', JSON.stringify(body));
    const { template_id, field_name, field_type, is_required, options, order_index } = body;

    if (!template_id || !field_name || !field_type) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Verify template ownership/access
    const template = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(template_id).first() as any;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Check permissions
    const isSysAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile?.role === 'sys_admin' ||
      userProfile?.role === 'admin';

    if (!isSysAdmin) {
      if (template.created_by_user_id !== user.id && template.organization_id !== userProfile?.organization_id) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }

    const result = await env.DB.prepare(`
      INSERT INTO checklist_fields (
        template_id, field_name, field_type, is_required, options, order_index,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id
    `).bind(
      template_id,
      field_name,
      field_type,
      is_required ? 1 : 0,
      options || null,
      order_index || 0
    ).run();

    return c.json({
      id: result.meta.last_row_id,
      message: "Field created successfully"
    });
  } catch (error) {
    console.error('Error creating field:', error);
    return c.json({ error: "Failed to create field" }, 500);
  }
});

// Update checklist template
checklistRoutes.put("/checklist-templates/:id", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const templateId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, category, is_public, folder_id } = body;

    // Check template ownership
    const template = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(templateId).first() as any;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Check permissions - SYS_ADMIN TEM ACESSO TOTAL
    const isSysAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile?.role === 'sys_admin' ||
      userProfile?.role === 'admin';

    if (!isSysAdmin) {
      if (template.created_by_user_id !== user.id && template.organization_id !== userProfile?.organization_id) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }

    await env.DB.prepare(`
      UPDATE checklist_templates 
      SET name = ?, description = ?, category = ?, is_public = ?, folder_id = ?, updated_at = NOW()
      WHERE id = ?
    `).bind(name, description, category, is_public, folder_id || null, templateId).run();

    // Log update
    await logActivity(env, {
      userId: user.id,
      orgId: template.organization_id, // Use template org
      actionType: 'UPDATE',
      actionDescription: `Checklist Template Updated: ${name || template.name}`,
      targetType: 'CHECKLIST_TEMPLATE',
      targetId: templateId,
      metadata: { name, category, is_public },
      req: c.req
    });

    return c.json({ message: "Template updated successfully" });
  } catch (error) {
    console.error('Error updating template:', error);
    return c.json({ error: "Failed to update template" }, 500);
  }
});

// Delete checklist template
checklistRoutes.delete("/checklist-templates/:id", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const templateId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Check template ownership
    const template = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(templateId).first() as any;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Check permissions - SYS_ADMIN TEM ACESSO TOTAL
    const isSysAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile?.role === 'sys_admin' ||
      userProfile?.role === 'admin';

    if (!isSysAdmin) {
      if (template.created_by_user_id !== user.id && template.organization_id !== userProfile?.organization_id) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }

    // Delete fields first
    await env.DB.prepare("DELETE FROM checklist_fields WHERE template_id = ?").bind(templateId).run();

    // Delete template
    await env.DB.prepare("DELETE FROM checklist_templates WHERE id = ?").bind(templateId).run();

    // Log deletion
    await logActivity(env, {
      userId: user.id,
      orgId: template.organization_id,
      actionType: 'DELETE',
      actionDescription: `Checklist Template Deleted: ${template.name}`,
      targetType: 'CHECKLIST_TEMPLATE',
      targetId: templateId,
      metadata: { name: template.name, category: template.category },
      req: c.req
    });

    return c.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error('Error deleting template:', error);
    return c.json({ error: "Failed to delete template" }, 500);
  }
});

// Duplicate checklist template
checklistRoutes.post("/checklist-templates/:id/duplicate", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const templateId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get original template
    const originalTemplate = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(templateId).first() as any;

    if (!originalTemplate) {
      return c.json({ error: "Template not found" }, 404);
    }

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Create duplicate template
    const newName = `${originalTemplate.name} - Cópia`;
    const result = await env.DB.prepare(`
      INSERT INTO checklist_templates (
        name, description, category, created_by, created_by_user_id, 
        organization_id, is_public, parent_category_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      newName,
      originalTemplate.description,
      originalTemplate.category,
      user.google_user_data?.name || user.email,
      user.id,
      userProfile?.organization_id || null,
      false, // Copies are private by default
      originalTemplate.parent_category_id
    ).run();

    const newTemplateId = result.meta.last_row_id as number;

    // OPTIMIZATION: Batch Insert (fix N+1 query)
    // Fetch fields first
    const fields = await env.DB.prepare("SELECT * FROM checklist_fields WHERE template_id = ?").bind(templateId).all();
    const fieldResults = fields.results || [];
    if (fieldResults.length > 0) {
      const nowIso = new Date().toISOString();

      let insertQuery = `
        INSERT INTO checklist_fields (
          template_id, field_name, field_type, is_required, options, order_index,
          created_at, updated_at
        ) VALUES 
      `;
      const insertParams: any[] = [];
      const placeholders: string[] = [];

      for (const field of fieldResults) {
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?)');
        insertParams.push(
          newTemplateId,
          (field as any).field_name,
          (field as any).field_type,
          (field as any).is_required,
          (field as any).options,
          (field as any).order_index,
          nowIso,
          nowIso
        );
      }

      insertQuery += placeholders.join(', ');
      await env.DB.prepare(insertQuery).bind(...insertParams).run();
      console.log(`[DUPLICATE] Batch inserted ${fieldResults.length} fields for template ${newTemplateId}`);
    }

    return c.json({
      id: newTemplateId,
      message: "Template duplicated successfully"
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    return c.json({ error: "Failed to duplicate template" }, 500);
  }
});

// Share checklist template
checklistRoutes.put("/checklist-templates/:id/share", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const templateId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { visibility, shared_with } = body;

    // Check template ownership
    const template = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(templateId).first() as any;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Check permissions - only owner, org admins, or sys admins can share
    const isSysAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN ||
      userProfile?.role === 'sys_admin' ||
      userProfile?.role === 'admin';

    if (!isSysAdmin) {
      if (template.created_by_user_id !== user.id && template.organization_id !== userProfile?.organization_id) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }

    // Validate visibility
    const validVisibilities = ['private', 'public', 'shared'];
    if (!validVisibilities.includes(visibility)) {
      return c.json({ error: "Invalid visibility value" }, 400);
    }

    // Update is_public based on visibility
    const isPublic = visibility === 'public';
    const sharedWithJson = visibility === 'shared' && shared_with ? JSON.stringify(shared_with) : null;

    await env.DB.prepare(`
      UPDATE checklist_templates 
      SET visibility = ?, is_public = ?, shared_with = ?, updated_at = NOW()
      WHERE id = ?
    `).bind(visibility, isPublic, sharedWithJson, templateId).run();

    // Log sharing
    await logActivity(env, {
      userId: user.id,
      orgId: template.organization_id,
      actionType: 'SHARE',
      actionDescription: `Checklist Template Shared: ${template.name}`,
      targetType: 'CHECKLIST_TEMPLATE',
      targetId: templateId,
      metadata: { visibility, is_public: isPublic },
      req: c.req
    });

    return c.json({ message: "Sharing settings updated successfully" });
  } catch (error) {
    console.error('Error updating share settings:', error);
    return c.json({ error: "Failed to update share settings" }, 500);
  }
});

// Generate AI checklist - simple version with enhanced error handling
// Includes rate limiting to track usage per organization
checklistRoutes.post("/checklist-templates/generate-ai-simple", tenantAuthMiddleware, aiRateLimitMiddleware('analysis'), async (c) => {
  const env = c.env;
  const user = c.get("user");

  console.log('[AI-CHECKLIST] Prompt Generation Route Hit - VERSION 2.2 (Stable - Fallback Active)');

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    console.log('[AI-CHECKLIST] Iniciando geração de checklist...');

    const body = await c.req.json();
    const { industry, location_type, template_name, category, num_questions, specific_requirements, detail_level, regulation } = body;

    console.log('[AI-CHECKLIST] Parâmetros recebidos:', {
      industry, location_type, template_name, category, num_questions
    });

    // Validate required fields
    if (!industry || !location_type || !template_name || !category) {
      return c.json({
        success: false,
        error: "Campos obrigatórios: setor, tipo de local, nome do template e categoria"
      }, 400);
    }

    // Check API keys
    const openAiKey = env?.OPENAI_API_KEY || Deno.env.get('OPENAI_API_KEY');
    const geminiKey = env?.GEMINI_API_KEY || Deno.env.get('GEMINI_API_KEY');

    if (!openAiKey && !geminiKey) {
      console.error('[AI-CHECKLIST] Nenhuma chave de API (OpenAI ou Gemini) configurada');
      return c.json({
        success: false,
        error: "IA não configurada no sistema. Contate o suporte."
      }, 500);
    }

    console.log('[AI-CHECKLIST] Iniciando chamada para AI Service (Gemini/OpenAI)...');

    // Limit questions to prevent timeouts
    const limitedQuestions = Math.min(num_questions || 10, 15);

    // Construct context based on detail level
    let detailContext = "";
    switch (detail_level) {
      case 'basico':
        detailContext = "Crie perguntas simples e diretas (Sim/Não). Foque no essencial.";
        break;
      case 'avancado':
        detailContext = "Crie perguntas detalhadas e técnicas. Inclua campos para medições ou observações específicas onde aplicável.";
        break;
      case 'intermediario':
      default:
        detailContext = "Equilibre perguntas diretas com algumas que exijam observação.";
    }

    // Construct regulation context
    const regulationContext = regulation && regulation !== 'Nenhuma norma específica'
      ? `Baseie as perguntas estritamente na norma ${regulation}. Cite o item da norma se possível.`
      : "Baseie-se nas melhores práticas de segurança do trabalho.";

    // Create optimized AI prompt
    const prompt = `Crie um checklist de segurança com ${limitedQuestions} perguntas para:
- Setor: ${industry}
- Local: ${location_type}
- Nome: ${template_name}
- Categoria: ${category}
${specific_requirements ? `- Requisitos: ${specific_requirements}` : ''}
- Nível de Detalhe: ${detail_level} (${detailContext})
- Norma/Regulamentação: ${regulationContext}

Retorne APENAS JSON válido nesta estrutura exata:
{
  "template": {
    "name": "${template_name}",
    "description": "Checklist de segurança para ${industry} - ${location_type}. Baseado em: ${regulation || 'Melhores práticas'}",
    "category": "${category}",
    "is_public": false
  },
  "fields": [
    {
      "field_name": "Pergunta sobre segurança",
      "field_type": "boolean",
      "is_required": true,
      "options": "",
      "order_index": 0
    }
  ]
}

IMPORTANTE:
- Exatamente ${limitedQuestions} campos no array fields
- Use field_type: "boolean", "text", "textarea", "select", "rating", "date" ou "file"
- Para "select", use options: ["Conforme", "Não Conforme", "N/A"]
- Foque em itens práticos de segurança
- Se o nível for avançado, você pode usar "text" para observações obrigatórias em pontos críticos
- Use "file" para solicitar evidências fotográficas quando necessário`;

    // Fetch system settings for AI preferences
    let preferredProvider: 'gemini' | 'openai' = 'gemini';
    let fallbackEnabled = true;

    try {
      const settings = await env.DB.prepare("SELECT ai_primary_provider, ai_fallback_enabled FROM system_settings WHERE id = 'global'").first() as any;
      if (settings) {
        if (settings.ai_primary_provider === 'openai') preferredProvider = 'openai';
        // default is gemini if null or 'gemini'

        if (settings.ai_fallback_enabled === false || settings.ai_fallback_enabled === 0) {
          fallbackEnabled = false;
        }
      }
    } catch (err) {
      console.warn('[AI-CHECKLIST] Failed to fetch settings, using defaults:', err);
    }

    // Call AI Service with fallback
    const aiResult = await generateAICompletion(geminiKey, openAiKey, {
      systemPrompt: 'Você é um especialista em segurança do trabalho. Responda SEMPRE com JSON válido, sem markdown ou texto adicional. Seja conciso e prático.',
      userPrompt: prompt,
      maxTokens: Math.min(1500, limitedQuestions * 100),
      temperature: 0.3,
      timeoutMs: 60000
    }, { preferredProvider, fallbackEnabled });

    if (!aiResult.success) {
      console.error('[AI-CHECKLIST] Erro na geração IA:', aiResult.error);
      return c.json({
        success: false,
        error: aiResult.error || "Erro ao gerar checklist com IA."
      }, 500);
    }

    const content = aiResult.content;

    // Log which provider was used
    console.log(`[AI-CHECKLIST] Sucesso via ${aiResult.provider} (${aiResult.model}). Fallback usado: ${aiResult.fallbackUsed}`);

    // Parse AI response with robust error handling
    let aiData;
    try {
      // Try direct JSON parse first
      aiData = JSON.parse(content);
    } catch (parseError) {
      console.log('[AI-CHECKLIST] Direct parse failed, trying to extract JSON...');

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          aiData = JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          console.error('[AI-CHECKLIST] JSON extraction failed:', extractError);
          return c.json({
            success: false,
            error: "IA retornou formato inválido. Tente novamente com menos perguntas."
          }, 500);
        }
      } else {
        console.error('[AI-CHECKLIST] No JSON found in response');
        return c.json({
          success: false,
          error: "IA não retornou dados válidos. Tente reformular a solicitação."
        }, 500);
      }
    }

    // Validate AI response structure
    if (!aiData || typeof aiData !== 'object') {
      console.error('[AI-CHECKLIST] Invalid AI data structure:', typeof aiData);
      return c.json({
        success: false,
        error: "Estrutura de dados inválida da IA"
      }, 500);
    }

    if (!aiData.template || !aiData.fields || !Array.isArray(aiData.fields)) {
      console.error('[AI-CHECKLIST] Missing required fields in AI response');
      return c.json({
        success: false,
        error: "IA não retornou template completo. Tente novamente."
      }, 500);
    }

    if (aiData.fields.length === 0) {
      console.error('[AI-CHECKLIST] Empty fields array');
      return c.json({
        success: false,
        error: "IA não gerou campos para o checklist. Tente com parâmetros diferentes."
      }, 500);
    }

    console.log(`[AI-CHECKLIST] Successfully generated ${aiData.fields.length} fields`);

    // Clean up and validate the fields
    const cleanFields = aiData.fields
      .filter((field: any) => field && typeof field === 'object' && field.field_name)
      .map((field: any, index: number) => {
        // Ensure valid field_type
        const validTypes = ['boolean', 'text', 'textarea', 'select', 'multiselect', 'radio', 'rating', 'file'];
        const fieldType = validTypes.includes(field.field_type) ? field.field_type : 'boolean';

        // Process options for select/radio fields
        let processedOptions = '';
        if ((fieldType === 'select' || fieldType === 'radio') && field.options) {
          try {
            if (typeof field.options === 'string' && field.options.startsWith('[')) {
              const parsed = JSON.parse(field.options);
              processedOptions = JSON.stringify(Array.isArray(parsed) ? parsed : ['Conforme', 'Não Conforme', 'N/A']);
            } else if (Array.isArray(field.options)) {
              processedOptions = JSON.stringify(field.options);
            } else {
              processedOptions = JSON.stringify(['Conforme', 'Não Conforme', 'N/A']);
            }
          } catch (error) {
            processedOptions = JSON.stringify(['Conforme', 'Não Conforme', 'N/A']);
          }
        }

        return {
          field_name: String(field.field_name).trim().substring(0, 200),
          field_type: fieldType,
          is_required: Boolean(field.is_required),
          options: processedOptions,
          order_index: index
        };
      })
      .slice(0, limitedQuestions); // Ensure we don't exceed the limit

    if (cleanFields.length === 0) {
      console.error('[AI-CHECKLIST] No valid fields after cleaning');
      return c.json({
        success: false,
        error: "IA não gerou campos válidos. Tente com parâmetros diferentes."
      }, 500);
    }

    // Ensure template has valid structure
    const cleanTemplate = {
      name: String(aiData.template.name || template_name).trim().substring(0, 200),
      description: String(aiData.template.description || `Checklist de segurança para ${industry} - ${location_type}`).trim().substring(0, 500),
      category: String(aiData.template.category || category).trim().substring(0, 100),
      is_public: Boolean(aiData.template.is_public || false)
    };

    console.log('[AI-CHECKLIST] Checklist gerado com sucesso');

    // Increment AI usage count for the organization using shared helper
    let usageIncremented = false;
    try {
      const userId = user.id || (user as any).sub;
      const usageResult = await incrementAiUsage(
        env.DB,
        userId,
        'checklist-generation',
        aiResult.model,
        aiResult.totalTokens
      );
      usageIncremented = usageResult.success;
    } catch (usageError) {
      console.error('[AI-CHECKLIST] Failed to update usage:', usageError);
      // Don't fail the request if usage tracking fails
    }

    return c.json({
      success: true,
      template: cleanTemplate,
      fields: cleanFields,
      meta: {
        generated_at: new Date().toISOString(),
        requested_questions: num_questions,
        delivered_questions: cleanFields.length,
        usage_incremented: usageIncremented
      }
    });

  } catch (error) {
    console.error('[AI-CHECKLIST] Erro geral:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return c.json({
          success: false,
          error: "Timeout na geração. Tente com menos perguntas (5-8)."
        }, 408);
      } else if (error.message.includes('fetch')) {
        return c.json({
          success: false,
          error: "Erro de conexão com a IA. Verifique sua internet e tente novamente."
        }, 502);
      }
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro interno do servidor"
    }, 500);
  }
});

// Save generated checklist
checklistRoutes.post("/checklist-templates/save-generated", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { template, fields, folder_id } = body;

    // Validate user.id exists before any database operation
    const userId = user.id || (user as any).user_id || (user as any).sub;
    if (!userId) {
      console.error('[SAVE-GENERATED] User has no ID:', JSON.stringify(user));
      return c.json({
        error: "User ID not found",
        details: "Session user does not have a valid ID"
      }, 400);
    }

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: userId, email: user.email, name: (user as any).name };
    }

    // Create template - ensure no undefined values
    const createdBy = user.google_user_data?.name || user.email || 'Sistema';
    const createdByUserId = userId; // Use validated userId
    const orgId = userProfile?.organization_id || null;
    const isPublic = template.is_public === true ? true : false;
    const folderId = folder_id || null;

    console.log('[SAVE-GENERATED] Creating template with:', {
      name: template.name,
      category: template.category,
      createdBy,
      createdByUserId,
      orgId,
      isPublic,
      folderId
    });

    const templateResult = await env.DB.prepare(`
      INSERT INTO checklist_templates (
        name, description, category, created_by, created_by_user_id, 
        organization_id, is_public, folder_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      RETURNING id
    `).bind(
      template.name || 'Checklist sem nome',
      template.description || null,
      template.category || 'Geral',
      createdBy,
      createdByUserId,
      orgId,
      isPublic,
      folderId
    ).first() as any;

    const templateId = templateResult?.id;

    if (!templateId) {
      console.error('[SAVE-GENERATED] Failed to get template ID after insert:', templateResult);
      return c.json({
        error: "Failed to create template",
        details: "Template ID not returned from database"
      }, 500);
    }

    console.log('[SAVE-GENERATED] Template created with ID:', templateId);

    // Create fields with enhanced validation
    for (const field of fields) {
      // Only process fields with valid names
      const fieldName = field.field_name?.trim();
      if (!fieldName) {
        console.warn('[SAVE-GENERATED] Skipping field without name:', field);
        continue;
      }

      // Ensure field_type is never undefined
      const fieldType = field.field_type || 'text';
      const isRequired = field.is_required === true;
      const orderIndex = typeof field.order_index === 'number' ? field.order_index : 0;

      let processedOptions: string | null = null;

      // VALIDAÇÃO: Garantir que campos que precisam de opções tenham opções válidas
      const fieldsRequiringOptions = ['select', 'multiselect', 'radio'];
      if (fieldsRequiringOptions.includes(fieldType)) {
        let validOptions: string[] = [];

        if (field.options && typeof field.options === 'string' && field.options.trim() !== '') {
          try {
            if (field.options.startsWith('[')) {
              const parsed = JSON.parse(field.options);
              if (Array.isArray(parsed)) {
                validOptions = parsed.filter((opt: any) => opt && String(opt).trim() !== '');
              }
            } else {
              validOptions = field.options.split(/[|\n]/).map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0);
            }
          } catch (error) {
            console.warn('Error parsing field options during save:', error);
          }
        } else if (Array.isArray(field.options)) {
          validOptions = field.options.filter((opt: any) => opt && String(opt).trim() !== '');
        }

        // Se não há opções válidas, usar padrão
        if (validOptions.length === 0) {
          switch (fieldType) {
            case 'select':
            case 'radio':
              validOptions = ['Conforme', 'Não Conforme', 'Não Aplicável'];
              break;
            case 'multiselect':
              validOptions = ['Adequado', 'Inadequado', 'Não Verificado', 'Não Aplicável'];
              break;
          }
        }

        processedOptions = JSON.stringify(validOptions);
      } else if (field.options) {
        // For non-select fields, preserve options as-is if present
        processedOptions = typeof field.options === 'string' ? field.options : JSON.stringify(field.options);
      }

      console.log('[SAVE-GENERATED] Inserting field:', { fieldName, fieldType, isRequired, orderIndex });

      await env.DB.prepare(`
        INSERT INTO checklist_fields (
          template_id, field_name, field_type, is_required, options, order_index,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `).bind(
        templateId,
        fieldName,
        fieldType,
        isRequired,
        processedOptions,
        orderIndex
      ).run();
    }

    return c.json({
      id: templateId,
      message: "Generated template saved successfully"
    });
  } catch (error) {
    console.error('Error saving generated template:', error);
    return c.json({
      error: "Failed to save generated template",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Delete template fields (for template editing)
checklistRoutes.delete("/checklist-templates/:id/fields", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const templateId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get user profile to check permissions
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Check if template exists
    const template = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(templateId).first() as any;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    // System admin can delete anything
    if (userProfile?.role !== USER_ROLES.SYSTEM_ADMIN) {
      // Check if user owns the template or it's in their organization
      if (template.created_by_user_id !== user.id && template.organization_id !== userProfile?.organization_id) {
        return c.json({ error: "Insufficient permissions to modify this template" }, 403);
      }
    }

    // Delete all fields for this template
    await env.DB.prepare("DELETE FROM checklist_fields WHERE template_id = ?").bind(templateId).run();

    return c.json({ message: "Template fields deleted successfully" });
  } catch (error) {
    console.error('Error deleting template fields:', error);
    return c.json({ error: "Failed to delete template fields" }, 500);
  }
});

// Create checklist field
checklistRoutes.post("/checklist-fields", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { template_id, field_name, field_type, is_required, options, order_index } = body;

    // VALIDAÇÃO CRÍTICA: Campos que precisam de opções DEVEM ter opções válidas
    const fieldsRequiringOptions = ['select', 'multiselect', 'radio'];
    if (fieldsRequiringOptions.includes(field_type)) {
      let validOptions: string[] = [];

      // Tentar parsear as opções
      if (options && options.trim() !== '') {
        try {
          // Se é string JSON, parsear
          if (typeof options === 'string' && options.startsWith('[')) {
            const parsed = JSON.parse(options);
            if (Array.isArray(parsed)) {
              validOptions = parsed.filter((opt: any) => opt && opt.trim() !== '');
            }
          } else if (typeof options === 'string') {
            // Se é string separada por | ou \n
            validOptions = options.split(/[|\n]/).map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0);
          } else if (Array.isArray(options)) {
            validOptions = options.filter((opt: any) => opt && opt.trim() !== '');
          }
        } catch (error) {
          console.warn('Error parsing field options:', error);
        }
      }

      // Se não há opções válidas, usar padrão baseado no tipo
      if (validOptions.length === 0) {
        switch (field_type) {
          case 'select':
          case 'radio':
            validOptions = ['Conforme', 'Não Conforme', 'Não Aplicável'];
            break;
          case 'multiselect':
            validOptions = ['Adequado', 'Inadequado', 'Não Verificado', 'Não Aplicável'];
            break;
        }
      }

      // Se ainda não há opções, retornar erro
      if (validOptions.length === 0) {
        return c.json({
          error: `Campo do tipo "${field_type}" requer pelo menos uma opção válida. Por favor, forneça as opções necessárias.`,
          field_type,
          suggested_options: ['Conforme', 'Não Conforme', 'Não Aplicável']
        }, 400);
      }

      // Garantir que options é uma string JSON válida
      body.options = JSON.stringify(validOptions);
    }

    // Get user profile to check permissions
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Check if template exists
    const template = await env.DB.prepare("SELECT * FROM checklist_templates WHERE id = ?").bind(template_id).first() as any;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    // System admin can edit anything
    if (userProfile?.role !== USER_ROLES.SYSTEM_ADMIN) {
      // Check if user owns the template or it's in their organization
      if (template.created_by_user_id !== user.id && template.organization_id !== userProfile?.organization_id) {
        return c.json({ error: "Insufficient permissions to modify this template" }, 403);
      }
    }

    // Create field
    await env.DB.prepare(`
      INSERT INTO checklist_fields (
        template_id, field_name, field_type, is_required, options, order_index,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      template_id,
      field_name,
      field_type,
      is_required || false,
      options || null,
      order_index || 0
    ).run();

    return c.json({ message: "Field created successfully" });
  } catch (error) {
    console.error('Error creating checklist field:', error);
    return c.json({ error: "Failed to create field" }, 500);
  }
});

// Create folder for templates
checklistRoutes.post("/checklist-templates/create-folder", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, category, folder_color, folder_icon, parent_category_id } = body;

    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;

    // Create folder
    const result = await env.DB.prepare(`
      INSERT INTO checklist_templates (
        name, description, category, is_category_folder, folder_color, folder_icon,
        parent_category_id, created_by, created_by_user_id, organization_id, is_public,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      name,
      description || null,
      category,
      true, // is_category_folder
      folder_color || '#3B82F6',
      folder_icon || 'folder',
      parent_category_id || null,
      user.google_user_data?.name || user.email,
      user.id,
      userProfile?.organization_id || null,
      true // public by default
    ).run();

    return c.json({
      id: result.meta.last_row_id,
      message: "Folder created successfully"
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return c.json({ error: "Failed to create folder" }, 500);
  }
});

// Pre-analysis with AI multimodal support
checklistRoutes.post("/inspection-items/:itemId/pre-analysis", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const itemId = parseInt(c.req.param("itemId"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  if (!env.OPENAI_API_KEY) {
    return c.json({ error: "IA não disponível" }, 503);
  }

  try {
    const body = await c.req.json();
    const { field_name, response_value, media_data, user_prompt } = body;

    // Get inspection item and context
    const item = await env.DB.prepare(`
      SELECT ii.*, i.location, i.company_name, i.title as inspection_title
      FROM inspection_items ii
      JOIN inspections i ON ii.inspection_id = i.id
      WHERE ii.id = ?
    `).bind(itemId).first() as any;

    if (!item) {
      return c.json({ error: "Item de inspeção não encontrado" }, 404);
    }

    // Prepare media context - SEMPRE mencionar se há ou não mídias
    let mediaContext = '';
    let hasMedia = false;

    if (media_data && media_data.length > 0) {
      hasMedia = true;
      const mediaTypes = media_data.reduce((acc: any, media: any) => {
        acc[media.media_type] = (acc[media.media_type] || 0) + 1;
        return acc;
      }, {});

      mediaContext = `EVIDÊNCIAS DISPONÍVEIS: ${mediaTypes.image || 0} foto(s), ${mediaTypes.audio || 0} áudio(s), ${mediaTypes.video || 0} vídeo(s) foram analisados.`;
    } else {
      mediaContext = `EVIDÊNCIAS DISPONÍVEIS: Nenhuma mídia (foto, áudio ou vídeo) foi anexada. Análise baseada apenas na resposta do inspetor.`;
    }

    // Create comprehensive and detailed prompt for deeper analysis
    const prompt = `Você é um especialista sênior em segurança do trabalho e saúde ocupacional, com vasta experiência em análise de conformidade regulatória e gestão de riscos.

CONTEXTO DETALHADO DA INSPEÇÃO:
- Local da Inspeção: ${item.location}
- Empresa Inspecionada: ${item.company_name}
- Título da Inspeção: ${item.inspection_title}

ITEM ESPECÍFICO EM ANÁLISE:
- Campo Inspecionado: ${field_name}
- Categoria do Item: ${item.category}
- Descrição Completa do Item: ${item.item_description}
- Resposta Fornecida pelo Inspetor: ${response_value !== null && response_value !== undefined ? response_value : 'Não respondido'}
- Observações Adicionais do Inspetor: ${item.observations || 'Nenhuma observação prévia'}

${mediaContext}

${user_prompt ? `FOCO PRINCIPAL FORNECIDO PELO USUÁRIO: ${user_prompt}. Priorize esta informação em sua análise detalhada.` : ''}

SUA TAREFA:
Realize uma **análise técnica aprofundada e abrangente** deste item inspecionado considerando:

1. **Observações Detalhadas**: Descreva minuciosamente o que foi observado e como se relaciona com as evidências disponíveis
2. **Análise de Conformidade**: Avalie claramente se o item está conforme ou não conforme com as normas de segurança aplicáveis (cite NRs específicas quando relevante)
3. **Identificação de Riscos**: Detalhe os riscos potenciais associados à condição atual do item, incluindo consequências de curto e longo prazo
4. **Causa Raiz**: Identifique possíveis causas fundamentais da não conformidade (se aplicável)
5. **Implicações Regulatórias**: Mencione possíveis implicações com órgãos fiscalizadores se relevante
6. **Urgência e Prioridade**: Indique claramente a urgência de uma ação corretiva (Baixa, Média, Alta, Crítica) e justifique
7. **Recomendação Específica**: Sugira claramente se uma ação corretiva é necessária e qual a natureza geral dessa ação

Forneça uma análise estruturada e técnica (máximo 600 caracteres) em texto corrido simples. NÃO use markdown, asteriscos, negrito, itálico, listas ou qualquer formatação especial. Seja direto, objetivo e tecnicamente preciso.`;

    // Call OpenAI API
    const openaiResponse = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em segurança do trabalho. Forneça análises técnicas objetivas e concisas em texto simples. Seja específico sobre evidências disponíveis e necessidade de ações.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.4
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', openaiResponse.status, errorText);
      throw new Error(`Erro na API da OpenAI: ${openaiResponse.status}`);
    }

    // Robust JSON parsing with HTML error handling
    let openaiResult;
    try {
      const responseText = await openaiResponse.text();

      // Check if response is HTML (common error response format)
      if (responseText.trim().startsWith('<')) {
        console.error('OpenAI returned HTML instead of JSON:', responseText);
        throw new Error('API da OpenAI retornou resposta inválida (HTML). Verifique a chave da API e tente novamente.');
      }

      openaiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }

    const analysis = openaiResult.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('Resposta inválida da IA');
    }

    // Clean up analysis - remove markdown and excessive formatting
    const cleanAnalysis = analysis
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/`/g, '')
      .replace(/^\s*-\s*/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Update the inspection item with the analysis
    await env.DB.prepare(`
      UPDATE inspection_items 
      SET ai_pre_analysis = ?, updated_at = NOW()
      WHERE id = ?
    `).bind(cleanAnalysis, itemId).run();

    return c.json({
      success: true,
      analysis: cleanAnalysis,
      pre_analysis: cleanAnalysis,
      media_analyzed: hasMedia ? media_data.length : 0,
      item_id: itemId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in pre-analysis:', error);
    return c.json({
      error: "Erro ao fazer pré-análise",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

// Generate field response with AI multimodal analysis
checklistRoutes.post("/inspection-items/:itemId/generate-field-response", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const itemId = parseInt(c.req.param("itemId"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  if (!env.OPENAI_API_KEY) {
    return c.json({ error: "IA não disponível" }, 503);
  }

  try {
    const body = await c.req.json();
    const { field_name, field_type, current_response, media_data, field_options } = body;

    // Get inspection item and context
    const item = await env.DB.prepare(`
      SELECT ii.*, i.location, i.company_name, i.title as inspection_title
      FROM inspection_items ii
      JOIN inspections i ON ii.inspection_id = i.id
      WHERE ii.id = ?
    `).bind(itemId).first() as any;

    if (!item) {
      return c.json({ error: "Item de inspeção não encontrado" }, 404);
    }

    // Parse field options
    let availableOptions: string[] = [];
    if (field_options) {
      try {
        if (typeof field_options === 'string' && field_options.startsWith('[')) {
          availableOptions = JSON.parse(field_options);
        } else if (typeof field_options === 'string') {
          availableOptions = field_options.split('|').map(opt => opt.trim()).filter(opt => opt);
        } else if (Array.isArray(field_options)) {
          availableOptions = field_options;
        }
      } catch (error) {
        console.error('Error parsing field options:', error);
      }
    }

    // Prepare media analysis content - SEMPRE mencionar status das mídias
    let mediaAnalysisContent = '';
    if (media_data && media_data.length > 0) {
      const mediaTypes = media_data.reduce((acc: any, media: any) => {
        acc[media.media_type] = (acc[media.media_type] || 0) + 1;
        return acc;
      }, {});

      mediaAnalysisContent = `EVIDÊNCIAS DISPONÍVEIS: ${mediaTypes.image || 0} foto(s), ${mediaTypes.audio || 0} áudio(s), ${mediaTypes.video || 0} vídeo(s) analisados para gerar resposta.`;
    } else {
      mediaAnalysisContent = `EVIDÊNCIAS DISPONÍVEIS: Nenhuma mídia anexada. Resposta baseada no contexto da inspeção e conhecimento técnico.`;
    }

    // Create specialized prompt based on field type
    let responseInstructions = '';
    switch (field_type) {
      case 'boolean':
        responseInstructions = `
RESPOSTA ESPERADA: true (Conforme) ou false (Não Conforme)
CRITÉRIO: Avalie se o item está em conformidade com as normas de segurança.`;
        break;
      case 'select':
      case 'radio':
        if (availableOptions.length > 0) {
          responseInstructions = `
RESPOSTA ESPERADA: Uma das opções disponíveis: ${availableOptions.join(', ')}
CRITÉRIO: Escolha a opção que melhor descreve a situação observada.`;
        } else {
          responseInstructions = `
RESPOSTA ESPERADA: Uma descrição textual da condição observada.`;
        }
        break;
      case 'multiselect':
        if (availableOptions.length > 0) {
          responseInstructions = `
RESPOSTA ESPERADA: Array com uma ou mais opções: ${availableOptions.join(', ')}
CRITÉRIO: Selecione todas as opções que se aplicam à situação.`;
        }
        break;
      case 'rating':
        responseInstructions = `
RESPOSTA ESPERADA: Número de 1 a 5 (1 = Inadequado, 5 = Excelente)
CRITÉRIO: Avalie a qualidade/conformidade do item observado.`;
        break;
      case 'text':
      case 'textarea':
        responseInstructions = `
RESPOSTA ESPERADA: Descrição textual detalhada
CRITÉRIO: Descreva o que foi observado de forma objetiva e técnica.`;
        break;
      default:
        responseInstructions = `
RESPOSTA ESPERADA: Valor adequado para o tipo de campo solicitado.`;
    }

    const prompt = `Você é um especialista sênior em segurança do trabalho e saúde ocupacional, com vasta experiência em análise de conformidade regulatória e gestão de riscos industriais.

CONTEXTO DETALHADO DA INSPEÇÃO:
- Local da Inspeção: ${item.location}
- Empresa Inspecionada: ${item.company_name}
- Título da Inspeção: ${item.inspection_title}

ITEM ESPECÍFICO EM ANÁLISE:
- Campo Inspecionado: ${field_name}
- Tipo de Campo: ${field_type}
- Categoria do Item: ${item.category}
- Descrição Completa do Item: ${item.item_description}
- Observações Existentes: ${item.observations || 'Nenhuma observação prévia'}
- Resposta Atual: ${current_response !== null && current_response !== undefined ? current_response : 'Não respondido'}

${mediaAnalysisContent}

${responseInstructions}

SUA TAREFA ESPECIALIZADA:
Como especialista em segurança, analise profundamente as evidências disponíveis e forneça:

1. **Análise Técnica das Evidências**: Considere todos os aspectos técnicos, normativos e de risco
2. **Resposta Baseada em Evidências**: Gere uma resposta precisa baseada na análise das evidências disponíveis
3. **Comentário Técnico Detalhado**: Forneça um comentário técnico abrangente (máximo 400 caracteres) que inclua:
   - O que foi especificamente observado nas evidências
   - Referência às normas aplicáveis (NRs, se relevante)
   - Justificativa técnica para a resposta gerada
   - Identificação de riscos ou não conformidades
   - Urgência de ação corretiva (se aplicável)

4. **Avaliação de Confiança**: Baseie sua confiança na qualidade e quantidade das evidências analisadas

Responda APENAS em formato JSON:
{
  "generated_response": <valor_da_resposta>,
  "generated_comment": "Comentário técnico detalhado incluindo observações específicas das evidências, conformidade normativa, riscos identificados e justificativa da resposta",
  "confidence": "alta|media|baixa",
  "media_analyzed": ${media_data ? media_data.length : 0},
  "technical_analysis": "Análise técnica específica das evidências observadas",
  "regulatory_compliance": "Status de conformidade com normas aplicáveis"
}

Seja tecnicamente preciso, detalhado e específico sobre as evidências analisadas.`;

    // Call OpenAI API
    const openaiResponse = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em segurança do trabalho. Analise evidências e forneça respostas técnicas precisas. Responda sempre em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.4
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', openaiResponse.status, errorText);
      throw new Error(`Erro na API da OpenAI: ${openaiResponse.status}`);
    }

    // Robust JSON parsing with HTML error handling
    let openaiResult;
    try {
      const responseText = await openaiResponse.text();

      // Check if response is HTML (common error response format)
      if (responseText.trim().startsWith('<')) {
        console.error('OpenAI returned HTML instead of JSON:', responseText);
        throw new Error('API da OpenAI retornou resposta inválida (HTML). Verifique a chave da API e tente novamente.');
      }

      openaiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }

    const content = openaiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta inválida da IA');
    }

    // Parse AI response
    let aiResult;
    try {
      aiResult = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Falha ao parsear resposta da IA como JSON');
      }
    }

    // Validate and clean response based on field type
    let finalResponse = aiResult.generated_response;

    if (field_type === 'boolean') {
      if (typeof finalResponse === 'string') {
        finalResponse = finalResponse.toLowerCase() === 'true' || finalResponse === '1';
      } else if (typeof finalResponse !== 'boolean') {
        finalResponse = null;
      }
    } else if (field_type === 'multiselect') {
      if (!Array.isArray(finalResponse)) {
        if (typeof finalResponse === 'string') {
          finalResponse = [finalResponse];
        } else {
          finalResponse = [];
        }
      }
      // Filter to only valid options if available
      if (availableOptions.length > 0) {
        finalResponse = finalResponse.filter((opt: string) => availableOptions.includes(opt));
      }
    } else if ((field_type === 'select' || field_type === 'radio') && availableOptions.length > 0) {
      // Ensure response is one of the available options
      if (!availableOptions.includes(finalResponse)) {
        finalResponse = availableOptions[0]; // Default to first option
      }
    } else if (field_type === 'rating') {
      const numResponse = parseInt(finalResponse);
      if (isNaN(numResponse) || numResponse < 1 || numResponse > 5) {
        finalResponse = 3; // Default to middle rating
      } else {
        finalResponse = numResponse;
      }
    }

    return c.json({
      success: true,
      generated_response: finalResponse,
      generated_comment: aiResult.generated_comment || '',
      confidence: aiResult.confidence || 'media',
      media_analyzed: aiResult.media_analyzed || 0,
      item_id: itemId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating field response:', error);
    return c.json({
      error: "Erro ao gerar resposta do campo",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

// Create AI-generated action item for inspection item
checklistRoutes.post("/inspection-items/:itemId/create-action", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const itemId = parseInt(c.req.param("itemId"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  if (!env.OPENAI_API_KEY) {
    return c.json({ error: "IA não disponível" }, 503);
  }

  try {
    const body = await c.req.json();
    const { field_name, field_type, response_value, pre_analysis, media_data, user_prompt } = body;

    // Get inspection item and context
    const item = await env.DB.prepare(`
      SELECT ii.*, i.location, i.company_name, i.title as inspection_title, i.id as inspection_id
      FROM inspection_items ii
      JOIN inspections i ON ii.inspection_id = i.id
      WHERE ii.id = ?
    `).bind(itemId).first() as any;

    if (!item) {
      return c.json({ error: "Item de inspeção não encontrado" }, 404);
    }

    // CORRIGIDO: Lógica melhorada para determinar necessidade de ação
    // Agora considera análise prévia, evidências de mídia e respostas
    let needsAction = false;
    let riskLevel = 'baixo';
    let actionReason = '';

    // 1. Verificar resposta direta de não conformidade
    if (field_type === 'boolean' && response_value === false) {
      needsAction = true;
      riskLevel = 'alto';
      actionReason = 'Item marcado como não conforme';
    } else if (field_type === 'rating' && response_value <= 2) {
      needsAction = true;
      riskLevel = response_value === 1 ? 'critica' : 'alta';
      actionReason = `Avaliação baixa (${response_value}/5)`;
    } else if (field_type === 'select' && response_value) {
      const valueStr = response_value.toLowerCase();
      if (valueStr.includes('não conforme') || valueStr.includes('inadequado') ||
        valueStr.includes('não aplicável') === false && valueStr.includes('conforme') === false) {
        needsAction = true;
        riskLevel = 'media';
        actionReason = `Resposta indica não conformidade: ${response_value}`;
      }
    }

    // 2. Verificar análise prévia para identificar riscos (NOVO)
    if (pre_analysis && !needsAction) {
      const analysisText = pre_analysis.toLowerCase();
      const riskKeywords = [
        'não conforme', 'inadequado', 'risco', 'perigo', 'incorreto', 'falha',
        'violação', 'infração', 'necessário', 'corrigir', 'ajustar', 'melhorar',
        'ação', 'problema', 'deficiência', 'insuficiente'
      ];

      const foundRisks = riskKeywords.filter(keyword => analysisText.includes(keyword));
      if (foundRisks.length >= 2) {
        needsAction = true;
        riskLevel = 'media';
        actionReason = `Análise prévia identificou riscos: ${foundRisks.slice(0, 3).join(', ')}`;
      }
    }

    // 3. Se ainda não identificou necessidade, deixar a IA decidir baseada em evidências
    if (!needsAction && (media_data?.length > 0 || pre_analysis)) {
      needsAction = true; // Permitir que a IA analise e decida
      riskLevel = 'media';
      actionReason = 'Análise inteligente das evidências disponíveis';
    }

    // ÚLTIMA VALIDAÇÃO: Se realmente não há nada para analisar
    if (!needsAction && !response_value && !pre_analysis && (!media_data || media_data.length === 0)) {
      return c.json({
        success: true,
        action: {
          requires_action: false,
          message: "Não há evidências suficientes (resposta, análise ou mídias) para determinar necessidade de ação. Adicione mais informações para análise."
        }
      });
    }

    // CORRIGIDO: Preparar análise multimodal real das evidências
    let mediaContext = '';
    let mediaAnalysisMessages = [];

    if (media_data && media_data.length > 0) {
      const mediaTypes = media_data.reduce((acc: any, media: any) => {
        acc[media.media_type] = (acc[media.media_type] || 0) + 1;
        return acc;
      }, {});

      mediaContext = `EVIDÊNCIAS MULTIMODAIS ANALISADAS: ${mediaTypes.image || 0} foto(s), ${mediaTypes.audio || 0} áudio(s), ${mediaTypes.video || 0} vídeo(s).`;

      // Preparar imagens para análise visual (máximo 3 para evitar timeout)
      const imageMedia = media_data.filter((m: any) => m.media_type === 'image').slice(0, 3);
      for (const img of imageMedia) {
        if (img.file_url) {
          mediaAnalysisMessages.push({
            type: "image_url",
            image_url: {
              url: img.file_url,
              detail: "high" // Para análise detalhada com gpt-4o-mini
            }
          });
        }
      }

      // Adicionar descrição de áudios/vídeos se existirem
      const audioCount = mediaTypes.audio || 0;
      const videoCount = mediaTypes.video || 0;
      if (audioCount > 0 || videoCount > 0) {
        mediaContext += ` Inclui ${audioCount} áudio(s) e ${videoCount} vídeo(s) que podem conter evidências sonoras de não conformidades.`;
      }
    } else {
      mediaContext = `EVIDÊNCIAS DISPONÍVEIS: Nenhuma mídia anexada. Ação baseada na resposta e análise prévia.`;
    }

    // Construir mensagens para OpenAI incluindo análise visual
    const systemMessage = {
      role: 'system',
      content: 'Você é um especialista em segurança do trabalho especializado em análise multimodal. Analise imagens, textos e contexto para criar planos de ação 5W2H precisos baseados em evidências reais.'
    };

    const userMessage = {
      role: 'user',
      content: [
        {
          type: "text",
          text: `Analise as evidências e determine se é necessária uma ação corretiva.

CONTEXTO DA INSPEÇÃO:
- Local: ${item.location}
- Empresa: ${item.company_name}
- Item: ${field_name} (${item.category})
- Descrição: ${item.item_description}
- Resposta do Inspetor: ${response_value || 'Não respondido'}
- Motivo da Análise: ${actionReason}
- Nível de Risco Inicial: ${riskLevel}
- Observações: ${item.observations || 'Nenhuma'}

${mediaContext}

${pre_analysis ? `ANÁLISE PRÉVIA DA IA:
${pre_analysis}

IMPORTANTE: Sua decisão deve ser coerente com esta análise prévia.` : ''}

${user_prompt ? `FOCO ESPECÍFICO: ${user_prompt}` : ''}

INSTRUÇÕES DETALHADAS PARA ANÁLISE ESPECIALIZADA:
1. **Análise Multimodal Completa**: Examine minuciosamente todas as evidências disponíveis (imagens, análise prévia, resposta do inspetor, contexto)
2. **Avaliação de Conformidade Técnica**: Determine conformidade com normas regulamentadoras aplicáveis (NRs, ABNT, ISO)
3. **Análise de Causa Raiz**: Identifique causas fundamentais de não conformidades
4. **Avaliação de Riscos**: Determine riscos de segurança, saúde, ambientais e legais
5. **Tomada de Decisão**: Se ação corretiva é necessária, crie plano 5W2H detalhado e específico
6. **Justificativa Técnica**: Explique claramente a fundamentação técnica da decisão

Responda APENAS em formato JSON:
{
  "requires_action": true/false,
  "title": "Título específico da ação ou motivo técnico de não necessidade",
  "what_description": "Descrição detalhada e específica do que deve ser feito, incluindo etapas claras e objetivos mensuráveis",
  "where_location": "Local específico da ação com detalhes do ambiente",
  "why_reason": "Justificativa técnica abrangente baseada em análise de riscos, conformidade regulatória e evidências observadas",
  "how_method": "Metodologia detalhada de execução incluindo recursos necessários, procedimentos e padrões técnicos",
  "who_responsible": "Responsável específico com qualificação técnica adequada",
  "when_deadline": "Prazo em dias baseado na criticidade e urgência técnica",
  "how_much_cost": "Estimativa detalhada incluindo recursos, materiais e mão de obra",
  "priority": "baixa|media|alta|critica",
  "evidence_analysis": "Análise técnica detalhada das evidências observadas incluindo aspectos críticos de segurança",
  "visual_findings": "Descrição específica e técnica do que foi observado nas imagens com foco em não conformidades",
  "regulatory_compliance": "Status de conformidade com normas aplicáveis e implicações regulatórias",
  "risk_assessment": "Avaliação detalhada dos riscos identificados e suas consequências potenciais",
  "root_cause_analysis": "Análise das causas fundamentais do problema identificado"
}`
        },
        ...mediaAnalysisMessages
      ]
    };

    const messages = [systemMessage, userMessage];

    // CORRIGIDO: Call OpenAI API com análise multimodal
    const openaiResponse = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Mudança solicitada para gpt-4o-mini
        messages: messages,
        max_tokens: 2000, // Aumentado para análise mais detalhada
        temperature: 0.3 // Reduzido para mais consistência
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', openaiResponse.status, errorText);
      throw new Error(`Erro na API da OpenAI: ${openaiResponse.status}`);
    }

    // Robust JSON parsing with HTML error handling
    let openaiResult;
    try {
      const responseText = await openaiResponse.text();

      // Check if response is HTML (common error response format)
      if (responseText.trim().startsWith('<')) {
        console.error('OpenAI returned HTML instead of JSON:', responseText);
        throw new Error('API da OpenAI retornou resposta inválida (HTML). Verifique a chave da API e tente novamente.');
      }

      openaiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }

    const content = openaiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta inválida da IA');
    }

    // Parse AI response
    let actionPlan;
    try {
      actionPlan = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        actionPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Falha ao parsear resposta da IA como JSON');
      }
    }

    if (actionPlan.requires_action) {
      // Calculate deadline
      const deadlineDays = parseInt(actionPlan.when_deadline) || 30;
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

      // Create action item in database
      const result = await env.DB.prepare(`
        INSERT INTO action_items (
          inspection_id, inspection_item_id, title, what_description, where_location,
          why_reason, how_method, who_responsible, when_deadline, how_much_cost,
          status, priority, is_ai_generated, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `).bind(
        item.inspection_id,
        itemId,
        actionPlan.title,
        actionPlan.what_description,
        actionPlan.where_location,
        actionPlan.why_reason,
        actionPlan.how_method,
        actionPlan.who_responsible,
        deadlineDate.toISOString().split('T')[0],
        actionPlan.how_much_cost,
        'pending',
        actionPlan.priority || 'media',
        true,
        actionPlan.who_responsible,
      ).run();

      // Update action plan in inspection item with enhanced analysis
      const enhancedPlan = {
        ...actionPlan,
        evidence_analysis: actionPlan.evidence_analysis || 'Análise baseada em evidências disponíveis',
        visual_findings: actionPlan.visual_findings || 'Nenhuma análise visual específica',
        media_analyzed: media_data ? media_data.length : 0,
        analysis_type: mediaAnalysisMessages.length > 0 ? 'multimodal' : 'textual'
      };

      await env.DB.prepare(`
        UPDATE inspection_items 
        SET ai_action_plan = ?, updated_at = NOW()
        WHERE id = ?
      `).bind(JSON.stringify(enhancedPlan), itemId).run();

      actionPlan.id = result.meta.last_row_id;
      actionPlan.evidence_analysis = enhancedPlan.evidence_analysis;
      actionPlan.visual_findings = enhancedPlan.visual_findings;
    }

    return c.json({
      success: true,
      action: actionPlan,
      item_id: itemId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating action with AI:', error);
    return c.json({
      error: "Erro ao criar ação com IA",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

// Delete pre-analysis for an inspection item
checklistRoutes.delete("/inspection-items/:itemId/pre-analysis", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const itemId = parseInt(c.req.param("itemId"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Update the inspection item to remove pre-analysis
    await env.DB.prepare(`
      UPDATE inspection_items 
      SET ai_pre_analysis = NULL, updated_at = NOW()
      WHERE id = ?
    `).bind(itemId).run();

    return c.json({
      success: true,
      message: "Pré-análise removida com sucesso"
    });

  } catch (error) {
    console.error('Error deleting pre-analysis:', error);
    return c.json({
      error: "Erro ao remover pré-análise"
    }, 500);
  }
});

// Get actions for specific inspection item
checklistRoutes.get("/inspection-items/:itemId/actions", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const itemId = parseInt(c.req.param("itemId"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get inspection item to verify access
    const item = await env.DB.prepare(`
      SELECT ii.*, i.created_by, i.organization_id
      FROM inspection_items ii
      JOIN inspections i ON ii.inspection_id = i.id
      WHERE ii.id = ?
    `).bind(itemId).first() as any;

    if (!item) {
      return c.json({ error: "Item de inspeção não encontrado" }, 404);
    }

    // Get actions for this item
    const actions = await env.DB.prepare(`
      SELECT * FROM action_items 
      WHERE inspection_item_id = ?
      ORDER BY created_at DESC
    `).bind(itemId).all();

    return c.json({
      actions: actions.results || []
    });

  } catch (error) {
    console.error('Error fetching inspection item actions:', error);
    return c.json({ error: "Erro ao buscar ações do item" }, 500);
  }
});

// ================================
// ACTION ITEMS MANAGEMENT ENDPOINTS
// ================================

// Get action plan for inspection
checklistRoutes.get("/inspections/:id/action-plan", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const inspectionId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get inspection to verify access
    const inspection = await env.DB.prepare(`
      SELECT i.*, u.role as user_role, u.organization_id as user_org_id
      FROM inspections i
      JOIN users u ON u.id = ?
      WHERE i.id = ?
    `).bind(user.id, inspectionId).first() as any;

    if (!inspection) {
      return c.json({ error: "Inspeção não encontrada" }, 404);
    }

    // Check access permissions
    const hasAccess = inspection.created_by === user.id ||
      inspection.organization_id === inspection.user_org_id ||
      inspection.user_role === 'system_admin';

    if (!hasAccess) {
      return c.json({ error: "Acesso negado" }, 403);
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
      inspection: {
        id: inspection.id,
        title: inspection.title,
        location: inspection.location,
        company_name: inspection.company_name,
        status: inspection.status
      },
      action_items: actionItems.results || []
    });

  } catch (error) {
    console.error('Error fetching action plan:', error);
    return c.json({ error: "Erro ao carregar plano de ação" }, 500);
  }
});

// Create manual action item
checklistRoutes.post("/inspections/:inspectionId/action-items", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const inspectionId = parseInt(c.req.param("inspectionId"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const {
      title,
      what_description,
      where_location,
      why_reason,
      how_method,
      who_responsible,
      when_deadline,
      how_much_cost,
      priority = 'media',
      assigned_to,
      inspection_item_id
    } = body;

    // Validate required fields
    if (!title || !what_description || !who_responsible) {
      return c.json({
        error: "Campos obrigatórios: título, descrição do que fazer e responsável"
      }, 400);
    }

    // Get inspection to verify access and context
    const inspection = await env.DB.prepare(`
      SELECT i.*, u.role as user_role, u.organization_id as user_org_id
      FROM inspections i
      JOIN users u ON u.id = ?
      WHERE i.id = ?
    `).bind(user.id, inspectionId).first() as any;

    if (!inspection) {
      return c.json({ error: "Inspeção não encontrada" }, 404);
    }

    // Check permissions to create actions
    const canCreate = inspection.created_by === user.id ||
      inspection.organization_id === inspection.user_org_id ||
      inspection.user_role === 'system_admin';

    if (!canCreate) {
      return c.json({ error: "Sem permissão para criar ações nesta inspeção" }, 403);
    }

    // Parse and validate deadline
    let deadlineDate = null;
    if (when_deadline) {
      try {
        deadlineDate = new Date(when_deadline).toISOString().split('T')[0];
      } catch (error) {
        return c.json({ error: "Data de prazo inválida" }, 400);
      }
    }

    // Create action item
    const result = await env.DB.prepare(`
      INSERT INTO action_items (
        inspection_id, inspection_item_id, title, what_description, where_location,
        why_reason, how_method, who_responsible, when_deadline, how_much_cost,
        status, priority, is_ai_generated, assigned_to, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, false, ?, NOW(), NOW())
    `).bind(
      inspectionId,
      inspection_item_id || null,
      title,
      what_description,
      where_location || inspection.location,
      why_reason || 'Ação manual criada pelo inspetor',
      how_method || 'A definir',
      who_responsible,
      deadlineDate,
      how_much_cost || 'A definir',
      priority,
      assigned_to || who_responsible
    ).run();

    return c.json({
      id: result.meta.last_row_id,
      message: "Ação criada com sucesso"
    });

  } catch (error) {
    console.error('Error creating manual action item:', error);
    return c.json({ error: "Erro ao criar ação manual" }, 500);
  }
});

// Update action item
checklistRoutes.put("/action-items/:id", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const actionId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const {
      title,
      what_description,
      where_location,
      why_reason,
      how_method,
      who_responsible,
      when_deadline,
      how_much_cost,
      priority,
      status,
      assigned_to
    } = body;

    // Get action item to verify access
    const action = await env.DB.prepare(`
      SELECT ai.*, i.created_by as inspection_created_by, 
             i.organization_id as inspection_org_id, u.role as user_role,
             u.organization_id as user_org_id
      FROM action_items ai
      JOIN inspections i ON ai.inspection_id = i.id
      JOIN users u ON u.id = ?
      WHERE ai.id = ?
    `).bind(user.id, actionId).first() as any;

    if (!action) {
      return c.json({ error: "Ação não encontrada" }, 404);
    }

    // Check permissions to edit
    const canEdit = action.inspection_created_by === user.id ||
      action.inspection_org_id === action.user_org_id ||
      action.user_role === 'system_admin' ||
      action.assigned_to === user.email;

    if (!canEdit) {
      return c.json({ error: "Sem permissão para editar esta ação" }, 403);
    }

    // Parse deadline if provided
    let deadlineDate = action.when_deadline;
    if (when_deadline !== undefined) {
      if (when_deadline) {
        try {
          deadlineDate = new Date(when_deadline).toISOString().split('T')[0];
        } catch (error) {
          return c.json({ error: "Data de prazo inválida" }, 400);
        }
      } else {
        deadlineDate = null;
      }
    }

    // Update action item
    await env.DB.prepare(`
      UPDATE action_items SET 
        title = COALESCE(?, title),
        what_description = COALESCE(?, what_description),
        where_location = COALESCE(?, where_location),
        why_reason = COALESCE(?, why_reason),
        how_method = COALESCE(?, how_method),
        who_responsible = COALESCE(?, who_responsible),
        when_deadline = COALESCE(?, when_deadline),
        how_much_cost = COALESCE(?, how_much_cost),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        assigned_to = COALESCE(?, assigned_to),
        updated_at = NOW()
      WHERE id = ?
    `).bind(
      title,
      what_description,
      where_location,
      why_reason,
      how_method,
      who_responsible,
      deadlineDate,
      how_much_cost,
      priority,
      status,
      assigned_to,
      actionId
    ).run();

    return c.json({ message: "Ação atualizada com sucesso" });

  } catch (error) {
    console.error('Error updating action item:', error);
    return c.json({ error: "Erro ao atualizar ação" }, 500);
  }
});

// Delete action item
checklistRoutes.delete("/action-items/:id", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const actionId = parseInt(c.req.param("id"));

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Get action item to verify access
    const action = await env.DB.prepare(`
      SELECT ai.*, i.created_by as inspection_created_by, 
             i.organization_id as inspection_org_id, u.role as user_role,
             u.organization_id as user_org_id
      FROM action_items ai
      JOIN inspections i ON ai.inspection_id = i.id
      JOIN users u ON u.id = ?
      WHERE ai.id = ?
    `).bind(user.id, actionId).first() as any;

    if (!action) {
      return c.json({ error: "Ação não encontrada" }, 404);
    }

    // Check permissions to delete
    const canDelete = action.inspection_created_by === user.id ||
      action.inspection_org_id === action.user_org_id ||
      action.user_role === 'system_admin';

    if (!canDelete) {
      return c.json({ error: "Sem permissão para excluir esta ação" }, 403);
    }

    // Delete action item
    await env.DB.prepare("DELETE FROM action_items WHERE id = ?").bind(actionId).run();

    return c.json({ message: "Ação excluída com sucesso" });

  } catch (error) {
    console.error('Error deleting action item:', error);
    return c.json({ error: "Erro ao excluir ação" }, 500);
  }
});

export default checklistRoutes;

