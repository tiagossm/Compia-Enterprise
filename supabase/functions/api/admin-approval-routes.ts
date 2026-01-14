import { Hono } from "hono";

/**
 * Rotas de administração para Aprovação de Usuários
 * @security System Admin tem acesso total
 * @security Org Admin pode aprovar usuários da sua organização
 */
const adminApprovalRoutes = new Hono<{ Bindings: Env; Variables: { user: any; tenantContext: any } }>();

/**
 * Helper: Verificar se usuário é SysAdmin
 */
function isSysAdmin(role: string): boolean {
    const sysAdminRoles = ['system_admin', 'sys_admin', 'admin'];
    return sysAdminRoles.includes(role?.toLowerCase() || '');
}

/**
 * Helper: Verificar se usuário é OrgAdmin
 */
function isOrgAdmin(role: string): boolean {
    const orgAdminRoles = ['org_admin', 'admin_org', 'organization_admin'];
    return orgAdminRoles.includes(role?.toLowerCase() || '');
}

/**
 * Helper: Verificar se usuário pode aprovar (SysAdmin OU OrgAdmin)
 */
function canApproveUsers(role: string): boolean {
    return isSysAdmin(role) || isOrgAdmin(role);
}

/**
 * Listar usuários pendentes
 * GET /api/admin/pending-users
 */
adminApprovalRoutes.get("/pending-users", async (c) => {
    const env = c.env;
    const user = c.get("user");

    console.log("[ADMIN-APPROVAL] GET /pending-users - User:", user?.email, "Role:", user?.role);

    // Verificar autenticação
    if (!user) {
        console.log("[ADMIN-APPROVAL] No user found in context");
        return c.json({ error: "unauthorized", message: "Autenticação necessária" }, 401);
    }

    // Verificar se pode aprovar (SysAdmin OU OrgAdmin)
    if (!canApproveUsers(user.role)) {
        console.log("[ADMIN-APPROVAL] User cannot approve:", user.role);
        return c.json({ error: "forbidden", message: "Apenas administradores podem acessar" }, 403);
    }

    try {
        const pendingUsers = await env.DB.prepare(`
      SELECT id, email, name, role, organization_id, created_at 
      FROM users 
      WHERE approval_status = 'pending'
      ORDER BY created_at DESC
    `).all();

        return c.json({
            success: true,
            data: pendingUsers.results || []
        });
    } catch (error) {
        console.error('[ADMIN-APPROVAL] Erro ao listar pendentes:', error);
        return c.json({ error: "Erro ao buscar usuários pendentes" }, 500);
    }
});

/**
 * Aprovar usuário
 * POST /api/admin/users/:id/approve
 */
adminApprovalRoutes.post("/users/:id/approve", async (c) => {
    const env = c.env;
    const targetUserId = c.req.param("id");
    const user = c.get("user");

    console.log("[ADMIN-APPROVAL] POST /users/:id/approve");
    console.log("[ADMIN-APPROVAL] Target User ID:", targetUserId);
    console.log("[ADMIN-APPROVAL] Current User:", JSON.stringify(user));

    // Verificar autenticação
    if (!user) {
        console.log("[ADMIN-APPROVAL] FALHA: Nenhum usuário no contexto");
        return c.json({ error: "unauthorized", message: "Autenticação necessária" }, 401);
    }

    // SysAdmin e OrgAdmin podem aprovar
    if (!canApproveUsers(user.role)) {
        console.log("[ADMIN-APPROVAL] FALHA: Usuário não pode aprovar. Role:", user.role);
        return c.json({ error: "forbidden", message: "Apenas administradores podem aprovar" }, 403);
    }

    console.log("[ADMIN-APPROVAL] SUCESSO: Usuário autorizado");

    try {
        const result = await env.DB.prepare(`
      UPDATE users 
      SET 
        approval_status = 'approved',
        approved_by = ?,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `).bind(user.id, targetUserId).run();

        if (result.meta.changes === 0) {
            return c.json({ error: "Usuário não encontrado" }, 404);
        }

        // NOTIFICAÇÃO: Avisar usuário que foi aprovado
        try {
            await env.DB.prepare(`
                INSERT INTO notifications (user_id, title, message, type, link) 
                VALUES (?, 'Conta Aprovada!', 'Seu cadastro foi aprovado. Bem-vindo ao sistema!', 'success', '/dashboard')
            `).bind(targetUserId).run();
        } catch (notifError) {
            console.error("Falha ao notificar usuário aprovado:", notifError);
        }

        // TRIGGER EMAIL: Send approval email
        try {
            // First fetch the approved user's details to get email/name
            const targetUser = await env.DB.prepare("SELECT email, name FROM users WHERE id = ?").bind(targetUserId).first();

            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

            if (targetUser && supabaseUrl && supabaseAnonKey) {
                fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify({
                        type: 'account_approved',
                        payload: {
                            email: targetUser.email,
                            name: targetUser.name
                        }
                    })
                }).catch(err => console.error("Failed to trigger approved email:", err));
            }
        } catch (emailErr) {
            console.error("Error triggering approved email:", emailErr);
        }

        console.log("[ADMIN-APPROVAL] Usuário aprovado com sucesso:", targetUserId);

        return c.json({
            success: true,
            message: "Usuário aprovado com sucesso"
        });

    } catch (error) {
        console.error('[ADMIN-APPROVAL] Erro ao aprovar usuário:', error);
        return c.json({ error: "Erro ao realizar aprovação" }, 500);
    }
});

/**
 * Rejeitar usuário
 * POST /api/admin/users/:id/reject
 */
adminApprovalRoutes.post("/users/:id/reject", async (c) => {
    const env = c.env;
    const targetUserId = c.req.param("id");
    const user = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const reason = body.reason || null;

    console.log("[ADMIN-APPROVAL] POST /users/:id/reject");
    console.log("[ADMIN-APPROVAL] Target User ID:", targetUserId);
    console.log("[ADMIN-APPROVAL] Current User:", JSON.stringify(user));

    // Verificar autenticação
    if (!user) {
        return c.json({ error: "unauthorized", message: "Autenticação necessária" }, 401);
    }

    // SysAdmin e OrgAdmin podem rejeitar
    if (!canApproveUsers(user.role)) {
        return c.json({ error: "forbidden", message: "Apenas administradores podem rejeitar" }, 403);
    }

    try {
        const result = await env.DB.prepare(`
      UPDATE users 
      SET 
        approval_status = 'rejected',
        approved_by = ?, 
        rejection_reason = ?,
        updated_at = NOW()
      WHERE id = ?
    `).bind(user.id, reason, targetUserId).run();

        if (result.meta.changes === 0) {
            return c.json({ error: "Usuário não encontrado" }, 404);
        }

        return c.json({
            success: true,
            message: "Usuário rejeitado com sucesso"
        });

    } catch (error) {
        console.error('[ADMIN-APPROVAL] Erro ao rejeitar usuário:', error);
        return c.json({ error: "Erro ao rejeitar usuário" }, 500);
    }
});

export default adminApprovalRoutes;
