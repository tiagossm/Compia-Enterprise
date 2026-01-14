import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
    [key: string]: unknown;
};

const userAssignmentRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Helper para verificar se usuário pode atribuir a uma organização
async function canAssignToOrganization(
    db: any,
    currentUser: any,
    targetOrgId: number
): Promise<boolean> {
    const role = currentUser.role?.toLowerCase() || '';

    // SysAdmin pode atribuir a qualquer organização
    const sysAdminRoles = ['system_admin', 'sys_admin', 'admin'];
    if (sysAdminRoles.includes(role)) {
        return true;
    }

    // OrgAdmin pode atribuir à sua organização e subsidiárias
    const orgAdminRoles = ['org_admin', 'admin_org', 'organization_admin'];
    if (orgAdminRoles.includes(role)) {
        const managedOrgId = currentUser.managed_organization_id || currentUser.organization_id;
        if (!managedOrgId) return false;

        // Verificar se é a própria organização ou subsidiária
        if (targetOrgId === managedOrgId) return true;

        const subsidiary = await db.prepare(`
      SELECT id FROM organizations 
      WHERE id = ? AND parent_organization_id = ?
    `).bind(targetOrgId, managedOrgId).first();

        return !!subsidiary;
    }

    return false;
}

// GET /api/user-assignments/:userId - Listar atribuições de um usuário
userAssignmentRoutes.get("/:userId", tenantAuthMiddleware, async (c) => {
    const userId = c.req.param("userId");
    const currentUser = c.get("user");
    const db = c.env.DB;

    if (!currentUser) {
        return c.json({ error: "Não autorizado" }, 401);
    }

    try {
        const assignments = await db.prepare(`
      SELECT 
        uo.id,
        uo.user_id,
        uo.organization_id,
        uo.role,
        uo.permissions,
        uo.is_primary,
        uo.is_active,
        uo.assigned_by,
        uo.assigned_at,
        o.name as organization_name,
        o.type as organization_type,
        assigner.name as assigned_by_name
      FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      LEFT JOIN users assigner ON uo.assigned_by = assigner.id
      WHERE uo.user_id = ?
      ORDER BY uo.is_primary DESC, o.name ASC
    `).bind(userId).all();

        return c.json({
            assignments: assignments.results || [],
            count: assignments.results?.length || 0
        });
    } catch (error) {
        console.error("Erro ao buscar atribuições:", error);
        return c.json({ error: "Erro ao buscar atribuições" }, 500);
    }
});

// GET /api/user-assignments/organization/:orgId - Listar usuários de uma organização
userAssignmentRoutes.get("/organization/:orgId", tenantAuthMiddleware, async (c) => {
    const orgId = parseInt(c.req.param("orgId"));
    const currentUser = c.get("user");
    const db = c.env.DB;

    if (!currentUser) {
        return c.json({ error: "Não autorizado" }, 401);
    }

    try {
        const assignments = await db.prepare(`
      SELECT 
        uo.id,
        uo.user_id,
        uo.organization_id,
        uo.role,
        uo.permissions,
        uo.is_primary,
        uo.is_active,
        uo.assigned_at,
        u.name as user_name,
        u.email as user_email,
        u.avatar_url,
        u.approval_status
      FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE uo.organization_id = ? AND uo.is_active = 1
      ORDER BY uo.role, u.name ASC
    `).bind(orgId).all();

        return c.json({
            assignments: assignments.results || [],
            count: assignments.results?.length || 0
        });
    } catch (error) {
        console.error("Erro ao buscar usuários da organização:", error);
        return c.json({ error: "Erro ao buscar usuários da organização" }, 500);
    }
});

// GET /api/user-assignments/available/:orgId - Listar usuários disponíveis para atribuição
userAssignmentRoutes.get("/available/:orgId", tenantAuthMiddleware, async (c) => {
    const orgId = parseInt(c.req.param("orgId"));
    const currentUser = c.get("user");
    const db = c.env.DB;

    if (!currentUser) {
        return c.json({ error: "Não autorizado" }, 401);
    }

    // Verificar permissão
    const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(currentUser.id).first();
    const canAssign = await canAssignToOrganization(db, userProfile, orgId);

    if (!canAssign) {
        return c.json({ error: "Sem permissão para atribuir usuários a esta organização" }, 403);
    }

    try {
        // Usuários aprovados que não estão atribuídos a esta organização
        const availableUsers = await db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role as current_role,
        u.avatar_url,
        u.approval_status,
        (SELECT COUNT(*) FROM user_organizations WHERE user_id = u.id AND is_active = 1) as org_count
      FROM users u
      WHERE u.approval_status = 'approved'
        AND u.is_active = 1
        AND u.role NOT IN ('sys_admin', 'system_admin')
        AND u.id NOT IN (
          SELECT user_id FROM user_organizations 
          WHERE organization_id = ? AND is_active = 1
        )
      ORDER BY u.name ASC
    `).bind(orgId).all();

        return c.json({
            users: availableUsers.results || [],
            count: availableUsers.results?.length || 0
        });
    } catch (error) {
        console.error("Erro ao buscar usuários disponíveis:", error);
        return c.json({ error: "Erro ao buscar usuários disponíveis" }, 500);
    }
});

// POST /api/user-assignments - Criar nova atribuição
userAssignmentRoutes.post("/", tenantAuthMiddleware, async (c) => {
    const currentUser = c.get("user");
    const db = c.env.DB;

    if (!currentUser) {
        return c.json({ error: "Não autorizado" }, 401);
    }

    try {
        const body = await c.req.json();
        const { user_id, organization_id, role, permissions, is_primary } = body;

        if (!user_id || !organization_id || !role) {
            return c.json({ error: "user_id, organization_id e role são obrigatórios" }, 400);
        }

        // Verificar permissão
        const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(currentUser.id).first();
        const canAssign = await canAssignToOrganization(db, userProfile, organization_id);

        if (!canAssign) {
            return c.json({ error: "Sem permissão para atribuir usuários a esta organização" }, 403);
        }

        // Verificar se usuário existe e está aprovado
        const targetUser = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user_id).first() as any;
        if (!targetUser) {
            return c.json({ error: "Usuário não encontrado" }, 404);
        }
        if (targetUser.approval_status !== 'approved') {
            return c.json({ error: "Usuário precisa estar aprovado para ser atribuído" }, 400);
        }

        // Verificar se já existe atribuição
        const existing = await db.prepare(`
      SELECT id FROM user_organizations 
      WHERE user_id = ? AND organization_id = ?
    `).bind(user_id, organization_id).first();

        if (existing) {
            return c.json({ error: "Usuário já está atribuído a esta organização" }, 409);
        }

        // Se is_primary, remover flag de outras atribuições
        if (is_primary) {
            await db.prepare(`
        UPDATE user_organizations SET is_primary = false WHERE user_id = ?
      `).bind(user_id).run();

            // Atualizar organization_id na tabela users (retrocompatibilidade)
            await db.prepare(`
        UPDATE users SET organization_id = ?, role = ? WHERE id = ?
      `).bind(organization_id, role, user_id).run();
        }

        // Criar atribuição
        const assignmentId = crypto.randomUUID();
        await db.prepare(`
      INSERT INTO user_organizations (
        id, user_id, organization_id, role, permissions, is_primary, is_active, assigned_by, assigned_at
      ) VALUES (?, ?, ?, ?, ?, ?, true, ?, NOW())
    `).bind(
            assignmentId,
            user_id,
            organization_id,
            role,
            JSON.stringify(permissions || {}),
            is_primary ? true : false,
            currentUser.id
        ).run();

        return c.json({
            success: true,
            message: "Usuário atribuído com sucesso",
            assignment_id: assignmentId
        }, 201);

    } catch (error) {
        console.error("Erro ao criar atribuição:", error);
        return c.json({ error: "Erro ao criar atribuição" }, 500);
    }
});

// POST /api/user-assignments/bulk - Atribuição em massa
userAssignmentRoutes.post("/bulk", tenantAuthMiddleware, async (c) => {
    const currentUser = c.get("user");
    const db = c.env.DB;

    if (!currentUser) {
        return c.json({ error: "Não autorizado" }, 401);
    }

    try {
        const body = await c.req.json();
        const { user_id, organization_ids, role, permissions } = body;

        if (!user_id || !organization_ids || !Array.isArray(organization_ids) || organization_ids.length === 0 || !role) {
            return c.json({ error: "user_id, organization_ids (array) e role são obrigatórios" }, 400);
        }

        // Verificar se usuário target existe
        const targetUser = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user_id).first() as any;
        if (!targetUser) {
            return c.json({ error: "Usuário alvo não encontrado" }, 404);
        }

        // Verificar permissões do usuário atual
        const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(currentUser.id).first();

        const results = {
            success: [] as number[],
            failed: [] as { id: number, reason: string }[]
        };

        for (const orgId of organization_ids) {
            try {
                // Check permissions per org
                const canAssign = await canAssignToOrganization(db, userProfile, orgId);
                if (!canAssign) {
                    results.failed.push({ id: orgId, reason: "Sem permissão" });
                    continue;
                }

                // Check existing assignment
                const existing = await db.prepare(`
                    SELECT id FROM user_organizations 
                    WHERE user_id = ? AND organization_id = ?
                `).bind(user_id, orgId).first();

                if (existing) {
                    results.failed.push({ id: orgId, reason: "Já atribuído" });
                    continue;
                }

                // Insert assignment
                const assignmentId = crypto.randomUUID();
                await db.prepare(`
                    INSERT INTO user_organizations (
                        id, user_id, organization_id, role, permissions, is_primary, is_active, assigned_by, assigned_at
                    ) VALUES (?, ?, ?, ?, ?, false, true, ?, NOW())
                `).bind(
                    assignmentId,
                    user_id,
                    orgId,
                    role,
                    JSON.stringify(permissions || {}),
                    currentUser.id
                ).run();

                results.success.push(orgId);

            } catch (err: any) {
                console.error(`Erro ao atribuir org ${orgId}:`, err);
                results.failed.push({ id: orgId, reason: err.message || "Erro interno" });
            }
        }

        return c.json({
            message: "Processamento concluído",
            results
        });

    } catch (error) {
        console.error("Erro na atribuição em massa:", error);
        return c.json({ error: "Erro interno ao processar atribuições em massa" }, 500);
    }
});

// PUT /api/user-assignments/:assignmentId - Atualizar atribuição
userAssignmentRoutes.put("/:assignmentId", tenantAuthMiddleware, async (c) => {
    const assignmentId = c.req.param("assignmentId");
    const currentUser = c.get("user");
    const db = c.env.DB;

    if (!currentUser) {
        return c.json({ error: "Não autorizado" }, 401);
    }

    try {
        const body = await c.req.json();
        const { role, permissions, is_primary, is_active } = body;

        // Buscar atribuição existente
        const assignment = await db.prepare(`
      SELECT * FROM user_organizations WHERE id = ?
    `).bind(assignmentId).first() as any;

        if (!assignment) {
            return c.json({ error: "Atribuição não encontrada" }, 404);
        }

        // Verificar permissão
        const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(currentUser.id).first();
        const canAssign = await canAssignToOrganization(db, userProfile, assignment.organization_id);

        if (!canAssign) {
            return c.json({ error: "Sem permissão para modificar esta atribuição" }, 403);
        }

        // Se is_primary mudou para true, remover flag de outras atribuições
        if (is_primary && !assignment.is_primary) {
            await db.prepare(`
        UPDATE user_organizations SET is_primary = 0 WHERE user_id = ?
      `).bind(assignment.user_id).run();

            // Atualizar organization_id na tabela users
            await db.prepare(`
        UPDATE users SET organization_id = ?, role = ? WHERE id = ?
      `).bind(assignment.organization_id, role || assignment.role, assignment.user_id).run();
        }

        // Atualizar atribuição
        await db.prepare(`
      UPDATE user_organizations SET
        role = COALESCE(?, role),
        permissions = COALESCE(?, permissions),
        is_primary = COALESCE(?, is_primary),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
    `).bind(
            role || null,
            permissions ? JSON.stringify(permissions) : null,
            is_primary !== undefined ? (is_primary ? 1 : 0) : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            assignmentId
        ).run();

        return c.json({ success: true, message: "Atribuição atualizada com sucesso" });

    } catch (error) {
        console.error("Erro ao atualizar atribuição:", error);
        return c.json({ error: "Erro ao atualizar atribuição" }, 500);
    }
});

// DELETE /api/user-assignments/:assignmentId - Remover atribuição
userAssignmentRoutes.delete("/:assignmentId", tenantAuthMiddleware, async (c) => {
    const assignmentId = c.req.param("assignmentId");
    const currentUser = c.get("user");
    const db = c.env.DB;

    if (!currentUser) {
        return c.json({ error: "Não autorizado" }, 401);
    }

    try {
        // Buscar atribuição existente
        const assignment = await db.prepare(`
      SELECT * FROM user_organizations WHERE id = ?
    `).bind(assignmentId).first() as any;

        if (!assignment) {
            return c.json({ error: "Atribuição não encontrada" }, 404);
        }

        // Verificar permissão
        const userProfile = await db.prepare("SELECT * FROM users WHERE id = ?").bind(currentUser.id).first();
        const canAssign = await canAssignToOrganization(db, userProfile, assignment.organization_id);

        if (!canAssign) {
            return c.json({ error: "Sem permissão para remover esta atribuição" }, 403);
        }

        // Soft delete - apenas desativar
        await db.prepare(`
      UPDATE user_organizations SET is_active = 0, updated_at = NOW() WHERE id = ?
    `).bind(assignmentId).run();

        // Se era a atribuição primária, limpar organization_id do user
        if (assignment.is_primary) {
            // Tentar encontrar outra atribuição ativa para ser primária
            const nextPrimary = await db.prepare(`
        SELECT * FROM user_organizations 
        WHERE user_id = ? AND is_active = 1 AND id != ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(assignment.user_id, assignmentId).first() as any;

            if (nextPrimary) {
                await db.prepare(`UPDATE user_organizations SET is_primary = 1 WHERE id = ?`).bind(nextPrimary.id).run();
                await db.prepare(`UPDATE users SET organization_id = ?, role = ? WHERE id = ?`)
                    .bind(nextPrimary.organization_id, nextPrimary.role, assignment.user_id).run();
            } else {
                await db.prepare(`UPDATE users SET organization_id = NULL WHERE id = ?`).bind(assignment.user_id).run();
            }
        }

        return c.json({ success: true, message: "Atribuição removida com sucesso" });

    } catch (error) {
        console.error("Erro ao remover atribuição:", error);
        return c.json({ error: "Erro ao remover atribuição" }, 500);
    }
});

export default userAssignmentRoutes;

