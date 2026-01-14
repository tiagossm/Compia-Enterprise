import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";
import { requireScopes, SCOPES, createAuthErrorResponse, isSystemAdmin } from "./rbac-middleware.ts";
import { logActivity } from "./audit-logger.ts";

type Env = {
  DB: any;
};

const checklistFoldersRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Função para gerar slug único
function generateSlug(name: string, existing: string[] = []): string {
  let baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  let slug = baseSlug;
  let counter = 1;

  while (existing.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// Função para construir path baseado na hierarquia
async function buildFolderPath(db: any, folderId: string): Promise<string> {
  const pathParts: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = await db.prepare("SELECT slug, parent_id FROM checklist_folders WHERE id = ?")
      .bind(currentId).first() as any;

    if (!folder) break;

    pathParts.unshift(folder.slug);
    currentId = folder.parent_id;
  }

  return '/' + pathParts.join('/');
}

// Migração segura de categorias existentes para pastas
checklistFoldersRoutes.post("/migrate-categories", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Buscar perfil do usuário
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Verificar permissões - admins ou gestores da organização
    const isSysAdmin = userProfile?.role === USER_ROLES.SYSTEM_ADMIN || userProfile?.role === 'admin';
    const isOrgAdmin = userProfile?.role === USER_ROLES.ORG_ADMIN || userProfile?.role === USER_ROLES.MANAGER;

    if (!isSysAdmin && (!isOrgAdmin || !userProfile?.organization_id)) {
      return c.json({ error: "Insufficient permissions for migration" }, 403);
    }

    let query = `
      SELECT DISTINCT organization_id 
      FROM checklist_templates 
      WHERE organization_id IS NOT NULL AND folder_id IS NULL
    `;
    let params: any[] = [];

    // Se não for sysadmin, restringir à própria organização
    if (!isSysAdmin && userProfile?.organization_id) {
      query += " AND organization_id = ?";
      params.push(userProfile.organization_id);
    }

    // Buscar organizações para migrar
    const organizations = await env.DB.prepare(query).bind(...params).all();

    let totalMigrated = 0;
    const migrationDetails: any[] = [];

    for (const org of organizations.results) {
      const orgId = (org as any).organization_id;

      // Buscar categorias únicas nesta organização
      const categories = await env.DB.prepare(`
        SELECT DISTINCT category 
        FROM checklist_templates 
        WHERE organization_id = ? AND folder_id IS NULL AND is_category_folder = false
      `).bind(orgId).all();

      let orgMigrated = 0;

      for (const cat of categories.results) {
        const categoryName = (cat as any).category;

        if (!categoryName || categoryName.trim() === '') continue;

        // Verificar se pasta já existe
        const existingFolder = await env.DB.prepare(`
          SELECT id FROM checklist_folders 
          WHERE organization_id = ? AND name = ? AND parent_id IS NULL
        `).bind(orgId, categoryName).first() as any;

        let folderId: string;

        if (existingFolder) {
          folderId = existingFolder.id;
        } else {
          // Criar nova pasta para esta categoria
          const existingSlugs = await env.DB.prepare(`
            SELECT slug FROM checklist_folders WHERE organization_id = ? AND parent_id IS NULL
          `).bind(orgId).all();

          const slugs = existingSlugs.results.map((r: any) => r.slug);
          const slug = generateSlug(categoryName, slugs);
          const path = `/${slug}`;

          const result = await env.DB.prepare(`
            INSERT INTO checklist_folders (
              organization_id, parent_id, name, slug, path, description,
              color, icon, display_order, created_at, updated_at
            ) VALUES (?, NULL, ?, ?, ?, ?, '#3B82F6', 'folder', 0, NOW(), NOW())
          `).bind(
            orgId,
            categoryName,
            slug,
            path,
            `Pasta criada automaticamente da categoria: ${categoryName}`
          ).run();

          folderId = result.meta.last_row_id as string;
        }

        // Migrar templates desta categoria para a pasta
        const updateResult = await env.DB.prepare(`
          UPDATE checklist_templates 
          SET folder_id = ?, updated_at = NOW()
          WHERE organization_id = ? AND category = ? AND folder_id IS NULL AND is_category_folder = false
        `).bind(folderId, orgId, categoryName).run();

        orgMigrated += updateResult.meta.changes || 0;
      }

      if (orgMigrated > 0) {
        migrationDetails.push({
          organization_id: orgId,
          templates_migrated: orgMigrated
        });
        totalMigrated += orgMigrated;
      }
    }

    // Log da migração
    await env.DB.prepare(`
      INSERT INTO migrations_log (migration_type, details, items_migrated, created_at)
      VALUES ('category_to_folder', ?, ?, NOW())
    `).bind(
      JSON.stringify({
        organizations_migrated: migrationDetails.length,
        details: migrationDetails,
        total_templates: totalMigrated
      }),
      totalMigrated
    ).run();

    // Global Log Activity
    await logActivity(env, {
      userId: user.id,
      orgId: userProfile?.organization_id || null,
      actionType: 'MIGRATE',
      actionDescription: `Checklist Categories Migrated to Folders`,
      targetType: 'SYSTEM',
      targetId: null,
      metadata: { organizations_migrated: migrationDetails.length, total_templates: totalMigrated },
      req: c.req
    });

    return c.json({
      success: true,
      message: `Migração concluída com sucesso`,
      organizations_migrated: migrationDetails.length,
      templates_migrated: totalMigrated,
      details: migrationDetails
    });

  } catch (error) {
    console.error('Error in category migration:', error);
    return c.json({
      error: "Failed to migrate categories",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Listar pastas com contadores (requires checklist:folders:read scope)
checklistFoldersRoutes.get("/folders", tenantAuthMiddleware, requireScopes(SCOPES.CHECKLIST_FOLDERS_READ), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Buscar perfil do usuário
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }
    const parentId = c.req.query('parent_id') || null;

    if (!userProfile?.organization_id) {
      return c.json(createAuthErrorResponse('forbidden', 'Usuário não possui organização associada', [SCOPES.CHECKLIST_FOLDERS_READ]), 403);
    }

    let whereClause = "WHERE (f.organization_id = ? OR f.organization_id IS NULL)";
    let params: any[] = [userProfile?.organization_id];

    if (parentId === null || parentId === 'null') {
      whereClause += " AND f.parent_id IS NULL";
    } else {
      whereClause += " AND f.parent_id = ?";
      params.push(parentId);
    }

    // Buscar pastas com contadores
    const folders = await env.DB.prepare(`
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
    `).bind(...params).all();

    return c.json({
      folders: folders.results || [],
      parent_id: parentId
    });

  } catch (error) {
    console.error('Error fetching folders:', error);
    return c.json({ error: error instanceof Error ? error.message : "Failed to fetch folders" }, 500);
  }
});

// Obter árvore de pastas (leve para breadcrumbs)
checklistFoldersRoutes.get("/tree", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Buscar perfil do usuário
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Buscar todas as pastas da organização com contadores
    const folders = await env.DB.prepare(`
      SELECT 
        f.id, f.parent_id, f.name, f.slug, f.path, f.color, f.icon, f.display_order,
        COUNT(DISTINCT cf.id) as subfolder_count,
        COUNT(DISTINCT ct.id) as template_count
      FROM checklist_folders f
      LEFT JOIN checklist_folders cf ON cf.parent_id = f.id
      LEFT JOIN checklist_templates ct ON ct.folder_id = f.id AND (ct.is_category_folder = false OR ct.is_category_folder IS NULL)
      WHERE (f.organization_id = ? OR f.organization_id IS NULL)
      GROUP BY f.id
      ORDER BY f.display_order ASC, f.name ASC
    `).bind(userProfile?.organization_id).all();

    // Construir árvore hierárquica (limitada a 3 níveis por performance)
    function buildTree(parentId: string | null = null, currentDepth = 0): any[] {
      if (currentDepth >= 3) return [];

      return (folders.results as any[])
        .filter(f => f.parent_id === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id, currentDepth + 1)
        }));
    }

    const tree = buildTree();

    return c.json({ tree });

  } catch (error) {
    console.error('Error fetching folder tree:', error);
    return c.json({ error: error instanceof Error ? error.message : "Failed to fetch folder tree" }, 500);
  }
});

// Get folder path/breadcrumb
checklistFoldersRoutes.get("/folders/:id/path", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get("user");
  const folderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    // Buscar perfil do usuário
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Build path from root to this folder
    const path: any[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await env.DB.prepare(`
        SELECT id, name, slug, parent_id, color, icon 
        FROM checklist_folders 
        WHERE id = ? AND organization_id = ?
      `).bind(currentId, userProfile?.organization_id).first() as any;

      if (!folder) break;

      path.unshift(folder); // Add to beginning to build path from root
      currentId = folder.parent_id;
    }

    return c.json({ path });

  } catch (error) {
    console.error('Error fetching folder path:', error);
    return c.json({ error: "Failed to fetch folder path" }, 500);
  }
});

// Criar nova pasta (requires checklist:folders:write scope)
checklistFoldersRoutes.post("/folders", tenantAuthMiddleware, requireScopes(SCOPES.CHECKLIST_FOLDERS_WRITE), async (c) => {
  const env = c.env;
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, parent_id, color, icon } = body;

    if (!name || name.trim() === '') {
      return c.json({ error: "Nome da pasta é obrigatório" }, 400);
    }

    // Buscar perfil do usuário
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    if (!userProfile?.organization_id) {
      return c.json(createAuthErrorResponse('forbidden', 'Usuário não possui organização associada', [SCOPES.CHECKLIST_FOLDERS_WRITE]), 403);
    }

    // Verificar se pasta pai existe (se especificada)
    if (parent_id) {
      const parentFolder = await env.DB.prepare(`
        SELECT id FROM checklist_folders 
        WHERE id = ? AND organization_id = ?
      `).bind(parent_id, userProfile?.organization_id).first();

      if (!parentFolder) {
        return c.json({ error: "Pasta pai não encontrada" }, 404);
      }
    }

    // Gerar slug único
    const existingSlugs = await env.DB.prepare(`
      SELECT slug FROM checklist_folders 
      WHERE organization_id = ? AND parent_id ${parent_id ? '= ?' : 'IS NULL'}
    `).bind(userProfile?.organization_id, ...(parent_id ? [parent_id] : [])).all();

    const slugs = existingSlugs.results.map((r: any) => r.slug);
    const slug = generateSlug(name, slugs);

    // Criar pasta
    const result = await env.DB.prepare(`
      INSERT INTO checklist_folders (
        organization_id, parent_id, name, slug, path, description,
        color, icon, display_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '', ?, ?, ?, 0, NOW(), NOW())
    `).bind(
      userProfile?.organization_id,
      parent_id || null,
      name.trim(),
      slug,
      description?.trim() || null,
      color || '#3B82F6',
      icon || 'folder'
    ).run();

    const folderId = result.meta.last_row_id as string;

    // Construir e atualizar o path
    const path = await buildFolderPath(env.DB, folderId);
    await env.DB.prepare("UPDATE checklist_folders SET path = ? WHERE id = ?")
      .bind(path, folderId).run();

    // Log Creation
    await logActivity(env, {
      userId: user.id,
      orgId: userProfile?.organization_id,
      actionType: 'CREATE',
      actionDescription: `Checklist Folder Created: ${name}`,
      targetType: 'CHECKLIST_FOLDER',
      targetId: folderId,
      metadata: { name, slug, path },
      req: c.req
    });

    return c.json({
      id: folderId,
      message: "Pasta criada com sucesso",
      slug,
      path
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    return c.json({ error: "Failed to create folder" }, 500);
  }
});

// Atualizar pasta (renomear/mover) (requires checklist:folders:write scope)
checklistFoldersRoutes.patch("/folders/:id", tenantAuthMiddleware, requireScopes(SCOPES.CHECKLIST_FOLDERS_WRITE), async (c) => {
  const env = c.env;
  const user = c.get("user");
  const folderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, parent_id, color, icon } = body;

    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Verificar se pasta existe
    const folder = await env.DB.prepare(`
      SELECT * FROM checklist_folders 
      WHERE id = ? AND organization_id = ?
    `).bind(folderId, userProfile?.organization_id).first() as any;

    if (!folder) {
      return c.json({ error: "Pasta não encontrada" }, 404);
    }

    // Verificação de permissões já foi feita pelo middleware RBAC

    // Verificar se novo pai não cria ciclo
    if (parent_id && parent_id !== folder.parent_id) {
      let currentParent = parent_id;
      while (currentParent) {
        if (currentParent === folderId) {
          return c.json({ error: "Não é possível mover pasta para dentro de si mesma" }, 400);
        }

        const parentFolder = await env.DB.prepare("SELECT parent_id FROM checklist_folders WHERE id = ?")
          .bind(currentParent).first() as any;
        currentParent = parentFolder?.parent_id;
      }
    }

    let newSlug = folder.slug;

    // Se nome mudou, gerar novo slug
    if (name && name.trim() !== folder.name) {
      const existingSlugs = await env.DB.prepare(`
        SELECT slug FROM checklist_folders 
        WHERE organization_id = ? AND parent_id ${parent_id ? '= ?' : 'IS NULL'} AND id != ?
      `).bind(userProfile?.organization_id, ...(parent_id ? [parent_id] : []), folderId).all();

      const slugs = existingSlugs.results.map((r: any) => r.slug);
      newSlug = generateSlug(name.trim(), slugs);
    }

    // Atualizar pasta
    await env.DB.prepare(`
      UPDATE checklist_folders SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        parent_id = COALESCE(?, parent_id),
        slug = ?,
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        updated_at = NOW()
      WHERE id = ?
    `).bind(
      name?.trim(),
      description?.trim(),
      parent_id,
      newSlug,
      color,
      icon,
      folderId
    ).run();

    // Reconstruir paths se houve mudança de nome ou pai
    if ((name && name.trim() !== folder.name) || (parent_id !== folder.parent_id)) {
      await updateFolderPaths(env.DB, folderId);
    }

    return c.json({ message: "Pasta atualizada com sucesso" });

    // Log Update (Async)
    logActivity(env, {
      userId: user.id,
      orgId: userProfile?.organization_id,
      actionType: 'UPDATE',
      actionDescription: `Checklist Folder Updated: ${name || folder.name}`,
      targetType: 'CHECKLIST_FOLDER',
      targetId: folderId,
      metadata: { name, description, parent_id },
      req: c.req
    });

  } catch (error) {
    console.error('Error updating folder:', error);
    return c.json({ error: "Failed to update folder" }, 500);
  }
});

// Função auxiliar para atualizar paths em cascata
async function updateFolderPaths(db: any, folderId: string) {
  // Atualizar path da pasta atual
  const newPath = await buildFolderPath(db, folderId);
  await db.prepare("UPDATE checklist_folders SET path = ? WHERE id = ?")
    .bind(newPath, folderId).run();

  // Atualizar subpastas recursivamente
  const children = await db.prepare("SELECT id FROM checklist_folders WHERE parent_id = ?")
    .bind(folderId).all();

  for (const child of children.results) {
    await updateFolderPaths(db, (child as any).id);
  }
}

// Excluir pasta (requires checklist:folders:delete scope)
checklistFoldersRoutes.delete("/folders/:id", tenantAuthMiddleware, requireScopes(SCOPES.CHECKLIST_FOLDERS_DELETE), async (c) => {
  const env = c.env;
  const user = c.get("user");
  const folderId = c.req.param("id");
  const strategy = c.req.query('strategy') || 'block';

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Verificar se pasta existe
    const folder = await env.DB.prepare(`
      SELECT * FROM checklist_folders 
      WHERE id = ? AND organization_id = ?
    `).bind(folderId, userProfile?.organization_id).first() as any;

    if (!folder) {
      return c.json({ error: "Pasta não encontrada" }, 404);
    }

    // Verificar permissões para cascade (apenas system admin)
    if (strategy === 'cascade' && !isSystemAdmin(userProfile?.role)) {
      return c.json(createAuthErrorResponse('forbidden', 'Apenas administradores de sistema podem usar exclusão em cascata', [SCOPES.SYSTEM_ADMIN]), 403);
    }

    // Verificar conteúdo da pasta
    const subfolders = await env.DB.prepare("SELECT COUNT(*) as count FROM checklist_folders WHERE parent_id = ?")
      .bind(folderId).first() as any;
    const templates = await env.DB.prepare("SELECT COUNT(*) as count FROM checklist_templates WHERE folder_id = ?")
      .bind(folderId).first() as any;

    const hasContent = (subfolders?.count || 0) > 0 || (templates?.count || 0) > 0;

    if (strategy === 'block' && hasContent) {
      return c.json({
        error: "Pasta contém itens. Use estratégia 'merge' ou 'cascade' para proceder",
        subfolders: subfolders?.count || 0,
        templates: templates?.count || 0
      }, 400);
    }

    if (strategy === 'merge') {
      // Mover conteúdo para pasta pai
      await env.DB.prepare("UPDATE checklist_folders SET parent_id = ? WHERE parent_id = ?")
        .bind(folder.parent_id, folderId).run();
      await env.DB.prepare("UPDATE checklist_templates SET folder_id = ? WHERE folder_id = ?")
        .bind(folder.parent_id, folderId).run();

      // Atualizar paths das subpastas movidas
      const movedFolders = await env.DB.prepare("SELECT id FROM checklist_folders WHERE parent_id = ?")
        .bind(folder.parent_id).all();
      for (const moved of movedFolders.results) {
        await updateFolderPaths(env.DB, (moved as any).id);
      }
    } else if (strategy === 'cascade') {
      // Excluir recursivamente (apenas system_admin)
      await deleteFolder(env.DB, folderId);
    }

    // Excluir a pasta
    await env.DB.prepare("DELETE FROM checklist_folders WHERE id = ?").bind(folderId).run();

    return c.json({ message: "Pasta excluída com sucesso" });

    // Log Deletion (Async)
    logActivity(env, {
      userId: user.id,
      orgId: userProfile?.organization_id,
      actionType: 'DELETE',
      actionDescription: `Checklist Folder Deleted: ${folder.name}`,
      targetType: 'CHECKLIST_FOLDER',
      targetId: folderId,
      metadata: { name: folder.name, strategy },
      req: c.req
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    return c.json({ error: "Failed to delete folder" }, 500);
  }
});

// Função auxiliar para exclusão em cascata
async function deleteFolder(db: any, folderId: string) {
  // Excluir subpastas recursivamente
  const subfolders = await db.prepare("SELECT id FROM checklist_folders WHERE parent_id = ?")
    .bind(folderId).all();

  for (const subfolder of subfolders.results) {
    await deleteFolder(db, (subfolder as any).id);
  }

  // Excluir templates da pasta
  await db.prepare("DELETE FROM checklist_templates WHERE folder_id = ?").bind(folderId).run();

  // Excluir pasta
  await db.prepare("DELETE FROM checklist_folders WHERE id = ?").bind(folderId).run();
}

// Mover itens em lote (requires checklist:folders:write scope)
checklistFoldersRoutes.post("/folders/:id/move-items", tenantAuthMiddleware, requireScopes(SCOPES.CHECKLIST_FOLDERS_WRITE), async (c) => {
  const env = c.env;
  const user = c.get("user");
  const targetFolderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  try {
    const body = await c.req.json();
    const { templateIds = [], folderIds = [] } = body;

    // Buscar perfil do usuário
    let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile && (user as any).profile) {
      userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
    }

    // Verificar se pasta destino existe (pode ser null para raiz)
    if (targetFolderId && targetFolderId !== 'null') {
      const targetFolder = await env.DB.prepare(`
        SELECT id FROM checklist_folders 
        WHERE id = ? AND organization_id = ?
      `).bind(targetFolderId, userProfile?.organization_id).first();

      if (!targetFolder) {
        return c.json({ error: "Pasta destino não encontrada" }, 404);
      }
    }

    const finalTargetId = (targetFolderId === 'null') ? null : targetFolderId;
    let movedCount = 0;

    // Mover templates
    if (templateIds.length > 0) {
      for (const templateId of templateIds) {
        const result = await env.DB.prepare(`
          UPDATE checklist_templates 
          SET folder_id = ?, updated_at = NOW()
          WHERE id = ? AND organization_id = ?
        `).bind(finalTargetId, templateId, userProfile?.organization_id).run();

        movedCount += result.meta.changes || 0;
      }
    }

    // Mover pastas
    if (folderIds.length > 0) {
      for (const folderId of folderIds) {
        // Verificar se não está tentando mover para dentro de si mesma
        if (finalTargetId) {
          let currentParent = finalTargetId;
          let isCycle = false;

          while (currentParent && !isCycle) {
            if (currentParent === folderId) {
              isCycle = true;
              break;
            }

            const parent = await env.DB.prepare("SELECT parent_id FROM checklist_folders WHERE id = ?")
              .bind(currentParent).first() as any;
            currentParent = parent?.parent_id;
          }

          if (isCycle) {
            continue; // Pular esta pasta para evitar ciclo
          }
        }

        const result = await env.DB.prepare(`
          UPDATE checklist_folders 
          SET parent_id = ?, updated_at = NOW()
          WHERE id = ? AND organization_id = ?
        `).bind(finalTargetId, folderId, userProfile?.organization_id).run();

        if (result.meta.changes && result.meta.changes > 0) {
          // Atualizar paths em cascata
          await updateFolderPaths(env.DB, folderId);
          movedCount += result.meta.changes;
        }
      }
    }

    return c.json({
      message: `${movedCount} itens movidos com sucesso`,
      moved_count: movedCount
    });

  } catch (error) {
    console.error('Error moving items:', error);
    return c.json({ error: "Failed to move items" }, 500);
  }
});

export default checklistFoldersRoutes;

