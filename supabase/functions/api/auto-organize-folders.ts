import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";

const autoOrganizeRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Função para extrair categoria/NR do nome do checklist
function extractFolderName(templateName: string, category?: string): string | null {
    // Se categoria já existe, usar ela
    if (category && category.trim() !== '') {
        return category.trim();
    }

    // Padrões comuns de NRs no nome
    const nrPatterns = [
        /^(NR[-\s]?\d{2})/i,           // NR-06, NR 06, NR06
        /^(NR[-\s]?\d{2}[-\s]?[A-Z]?)/i, // NR-12-A, NR 35 A
        /\((NR[-\s]?\d{2})\)/i,        // (NR-06)
    ];

    for (const pattern of nrPatterns) {
        const match = templateName.match(pattern);
        if (match) {
            // Normalizar formato: "NR-XX"
            const nr = match[1].replace(/\s+/g, '-').toUpperCase();
            return nr;
        }
    }

    // Se não encontrou NR, tentar extrair primeira parte antes de " - "
    const parts = templateName.split(' - ');
    if (parts.length > 1 && parts[0].length < 50) {
        return parts[0].trim();
    }

    return null;
}

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

// Endpoint para organizar automaticamente um template em pasta
autoOrganizeRoutes.post("/auto-organize/:templateId", tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");
    const templateId = c.req.param("templateId");

    if (!user) {
        return c.json({ error: "User not found" }, 401);
    }

    try {
        // Buscar perfil do usuário
        let userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
        if (!userProfile && (user as any).profile) {
            userProfile = { ...(user as any).profile, id: user.id, email: user.email, name: (user as any).name };
        }

        if (!userProfile?.organization_id) {
            return c.json({ error: "Usuário não possui organização" }, 403);
        }

        // Buscar template
        const template = await env.DB.prepare(`
      SELECT id, name, category, folder_id, organization_id
      FROM checklist_templates 
      WHERE id = ? AND organization_id = ?
    `).bind(templateId, userProfile.organization_id).first() as any;

        if (!template) {
            return c.json({ error: "Template não encontrado" }, 404);
        }

        // Se já está em uma pasta, não fazer nada
        if (template.folder_id) {
            return c.json({
                message: "Template já está organizado em pasta",
                folder_id: template.folder_id
            });
        }

        // Extrair nome da pasta
        const folderName = extractFolderName(template.name, template.category);

        if (!folderName) {
            return c.json({
                message: "Não foi possível determinar pasta automaticamente",
                organized: false
            });
        }

        // Verificar se pasta já existe
        let folder = await env.DB.prepare(`
      SELECT id FROM checklist_folders 
      WHERE organization_id = ? AND name = ? AND parent_id IS NULL
    `).bind(userProfile.organization_id, folderName).first() as any;

        let folderId: string;

        if (!folder) {
            // Criar nova pasta
            const existingSlugs = await env.DB.prepare(`
        SELECT slug FROM checklist_folders 
        WHERE organization_id = ? AND parent_id IS NULL
      `).bind(userProfile.organization_id).all();

            const slugs = existingSlugs.results.map((r: any) => r.slug);
            const slug = generateSlug(folderName, slugs);
            const path = `/${slug}`;

            const result = await env.DB.prepare(`
        INSERT INTO checklist_folders (
          organization_id, parent_id, name, slug, path, description,
          color, icon, display_order, created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, ?, '#3B82F6', 'folder', 0, NOW(), NOW())
      `).bind(
                userProfile.organization_id,
                folderName,
                slug,
                path,
                `Pasta criada automaticamente para ${folderName}`
            ).run();

            folderId = result.meta.last_row_id as string;
        } else {
            folderId = folder.id;
        }

        // Mover template para a pasta
        await env.DB.prepare(`
      UPDATE checklist_templates 
      SET folder_id = ?, updated_at = NOW()
      WHERE id = ?
    `).bind(folderId, templateId).run();

        return c.json({
            message: "Template organizado automaticamente",
            folder_name: folderName,
            folder_id: folderId,
            organized: true
        });

    } catch (error) {
        console.error('Error auto-organizing template:', error);
        return c.json({ error: "Failed to auto-organize template" }, 500);
    }
});

// Endpoint para organizar TODOS os templates não organizados
autoOrganizeRoutes.post("/auto-organize-all", tenantAuthMiddleware, async (c) => {
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

        if (!userProfile?.organization_id) {
            return c.json({ error: "Usuário não possui organização" }, 403);
        }

        // Buscar todos os templates sem pasta
        const templates = await env.DB.prepare(`
      SELECT id, name, category
      FROM checklist_templates 
      WHERE organization_id = ? AND folder_id IS NULL AND is_category_folder = false
    `).bind(userProfile.organization_id).all();

        let organized = 0;
        let skipped = 0;
        const foldersCreated: Set<string> = new Set();

        for (const template of templates.results as any[]) {
            const folderName = extractFolderName(template.name, template.category);

            if (!folderName) {
                skipped++;
                continue;
            }

            // Verificar se pasta já existe
            let folder = await env.DB.prepare(`
        SELECT id FROM checklist_folders 
        WHERE organization_id = ? AND name = ? AND parent_id IS NULL
      `).bind(userProfile.organization_id, folderName).first() as any;

            let folderId: string;

            if (!folder) {
                // Criar nova pasta
                const existingSlugs = await env.DB.prepare(`
          SELECT slug FROM checklist_folders 
          WHERE organization_id = ? AND parent_id IS NULL
        `).bind(userProfile.organization_id).all();

                const slugs = existingSlugs.results.map((r: any) => r.slug);
                const slug = generateSlug(folderName, slugs);
                const path = `/${slug}`;

                const result = await env.DB.prepare(`
          INSERT INTO checklist_folders (
            organization_id, parent_id, name, slug, path, description,
            color, icon, display_order, created_at, updated_at
          ) VALUES (?, NULL, ?, ?, ?, ?, '#3B82F6', 'folder', 0, NOW(), NOW())
        `).bind(
                    userProfile.organization_id,
                    folderName,
                    slug,
                    path,
                    `Pasta criada automaticamente para ${folderName}`
                ).run();

                folderId = result.meta.last_row_id as string;
                foldersCreated.add(folderName);
            } else {
                folderId = folder.id;
            }

            // Mover template para a pasta
            await env.DB.prepare(`
        UPDATE checklist_templates 
        SET folder_id = ?, updated_at = NOW()
        WHERE id = ?
      `).bind(folderId, template.id).run();

            organized++;
        }

        return c.json({
            message: "Organização automática concluída",
            templates_organized: organized,
            templates_skipped: skipped,
            folders_created: foldersCreated.size,
            folder_names: Array.from(foldersCreated)
        });

    } catch (error) {
        console.error('Error auto-organizing all templates:', error);
        return c.json({ error: "Failed to auto-organize templates" }, 500);
    }
});

export default autoOrganizeRoutes;

