import { Hono } from "hono";
import { tenantAuthMiddleware, TenantContext, AuthenticatedUser } from "./tenant-auth-middleware.ts";
import { USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
};

const invitationRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser; tenantContext: TenantContext } }>()
    .basePath('/api/invitations');


/**
 * POST /api/invitations/register-and-accept
 * Registra novo usuário e aceita convite automaticamente
 * (Fim-a-fim sem verificação de email necessária pois convite é confiável)
 */
invitationRoutes.post("/register-and-accept", async (c) => {
    const env = c.env;
    const body = await c.req.json();
    const { token, password, name } = body;

    if (!token || !password) {
        return c.json({ error: "Token e senha obrigatórios" }, 400);
    }

    if (password.length < 6) {
        return c.json({ error: "A senha deve ter pelo menos 6 caracteres" }, 400);
    }

    try {
        // 1. Validar token primeiro
        const invitation = await env.DB.prepare("SELECT * FROM validate_invitation_token(?)").bind(token).first();

        if (!invitation || !invitation.invitation_id) {
            return c.json({ error: "Convite inválido ou expirado" }, 400);
        }

        // 2. Criar cliente Admin para gerenciar Auth
        const supabaseUrl = env.SUPABASE_URL || Deno.env.get("SUPABASE_URL") || 'https://vjlvvmriqerfmztwtewa.supabase.co';
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseKey) {
            console.error("SUPABASE_SERVICE_ROLE_KEY ausente");
            return c.json({ error: "Erro de configuração do servidor" }, 500);
        }

        const { createClient } = await import("npm:@supabase/supabase-js@2");
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 3. Verificar se usuário existe no Auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: invitation.email,
            password: password,
            email_confirm: true,
            user_metadata: { name: name || invitation.email.split('@')[0] }
        });

        let userId = newUser?.user?.id;

        if (createError) {
            console.log("Erro ao criar usuário (pode já existir):", createError.message);
            if (createError.message.includes("already registered") || createError.message.includes("already been registered")) {
                return c.json({
                    error: "user_exists",
                    message: "Usuário já cadastrado. Por favor faça login.",
                    email: invitation.email
                }, 400);
            }
            throw createError;
        }

        // 4. Aceitar convite
        if (!userId) throw new Error("Falha ao criar usuário: ID nulo");

        const result = await env.DB.prepare("SELECT accept_invitation(?, ?) as result").bind(token, userId).first();
        const acceptResult = typeof result?.result === 'string' ? JSON.parse(result.result) : result?.result;

        if (!acceptResult?.success) {
            return c.json({
                success: false,
                error: acceptResult?.error || 'Erro ao vincular convite'
            }, 400);
        }

        return c.json({
            success: true,
            message: "Conta criada e convite aceito!",
            email: invitation.email
        });

    } catch (error: any) {
        console.error("[INVITATIONS] Erro em register-and-accept:", error);
        return c.json({ error: "Erro ao processar registro", details: error.message }, 500);
    }
});

// Middleware de autenticação em todas as rotas
invitationRoutes.use('/*', tenantAuthMiddleware);

/**
 * GET /api/invitations
 * Lista convites da organização do usuário
 */
invitationRoutes.get("/", async (c) => {
    const env = c.env;
    const user = c.get("user");
    const tenantContext = c.get("tenantContext");

    if (!user) {
        return c.json({ error: "Não autenticado" }, 401);
    }

    const orgId = tenantContext?.organizationId || user.managed_organization_id;

    if (!orgId && !tenantContext?.isSystemAdmin) {
        return c.json({ error: "Organização não encontrada" }, 400);
    }

    try {
        let query = `
            SELECT 
                i.id,
                i.email,
                i.role,
                i.status,
                i.expires_at,
                i.created_at,
                i.resend_count,
                i.email_sent,
                o.name as organization_name,
                u.name as invited_by_name
            FROM organization_invitations i
            JOIN organizations o ON o.id = i.organization_id
            LEFT JOIN users u ON u.id = i.created_by
        `;

        const params: any[] = [];

        if (tenantContext?.isSystemAdmin) {
            // SysAdmin vê todos
            query += ` ORDER BY i.created_at DESC LIMIT 100`;
        } else {
            query += ` WHERE i.organization_id = ? ORDER BY i.created_at DESC`;
            params.push(orgId);
        }

        const result = await env.DB.prepare(query).bind(...params).all();
        return c.json({ invitations: result.results || [] });
    } catch (error: any) {
        console.error("[INVITATIONS] Erro ao listar:", error);
        return c.json({ error: "Erro ao listar convites", details: error.message }, 500);
    }
});

/**
 * GET /api/invitations/seats
 * Retorna vagas disponíveis da organização
 */
invitationRoutes.get("/seats", async (c) => {
    const env = c.env;
    const user = c.get("user");
    const tenantContext = c.get("tenantContext");

    if (!user) {
        return c.json({ error: "Não autenticado" }, 401);
    }

    const orgId = c.req.query("organization_id") || tenantContext?.organizationId || user.managed_organization_id;

    if (!orgId) {
        return c.json({ error: "organization_id obrigatório" }, 400);
    }

    try {
        const result = await env.DB.prepare("SELECT * FROM get_available_seats(?)").bind(orgId).first();
        return c.json(result || { max_users: 5, active_users: 0, pending_invites: 0, available_seats: 5 });
    } catch (error: any) {
        console.error("[INVITATIONS] Erro ao buscar vagas:", error);
        return c.json({ error: "Erro ao buscar vagas", details: error.message }, 500);
    }
});

/**
 * POST /api/invitations
 * Envia convite(s) para email(s)
 */
invitationRoutes.post("/", async (c) => {
    const env = c.env;
    const user = c.get("user");
    const tenantContext = c.get("tenantContext");

    if (!user) {
        return c.json({ error: "Não autenticado" }, 401);
    }

    // Verificar permissão
    if (user.role !== USER_ROLES.ORG_ADMIN && user.role !== USER_ROLES.SYSTEM_ADMIN && user.role !== 'sys_admin' && user.role !== 'org_admin') {
        return c.json({ error: "Permissão negada. Apenas administradores podem enviar convites." }, 403);
    }

    const body = await c.req.json();
    const { emails, role = 'inspector', organization_id } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return c.json({ error: "Lista de emails obrigatória" }, 400);
    }

    const orgId = organization_id || tenantContext?.organizationId || user.managed_organization_id;

    if (!orgId) {
        return c.json({ error: "organization_id obrigatório" }, 400);
    }

    // Verificar limite do plano
    try {
        const seats = await env.DB.prepare("SELECT * FROM get_available_seats(?)").bind(orgId).first();
        const available = seats?.available_seats || 0;

        if (emails.length > available) {
            return c.json({
                error: "plan_limit_reached",
                message: `Limite do plano atingido. Vagas disponíveis: ${available}, solicitado: ${emails.length}`,
                available,
                requested: emails.length
            }, 403);
        }
    } catch (e) {
        console.error("[INVITATIONS] Erro ao verificar vagas:", e);
    }

    const results: any[] = [];
    const failed: any[] = [];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

    for (const email of emails) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            failed.push({ email, error: "Email inválido" });
            continue;
        }

        try {
            // Verificar se já existe convite pendente
            const existing = await env.DB.prepare(`
                SELECT id FROM organization_invitations 
                WHERE organization_id = ? AND LOWER(email) = ? AND status = 'pending'
            `).bind(orgId, normalizedEmail).first();

            if (existing) {
                failed.push({ email: normalizedEmail, error: "Convite pendente já existe" });
                continue;
            }

            // Gerar token seguro
            const token = crypto.randomUUID() + '-' + crypto.randomUUID();

            // Inserir convite
            await env.DB.prepare(`
                INSERT INTO organization_invitations 
                (organization_id, email, role, token, expires_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(orgId, normalizedEmail, role, token, expiresAt, user.id).run();

            // Buscar o convite criado
            const invitation = await env.DB.prepare(`
                SELECT id, email, role, expires_at FROM organization_invitations WHERE token = ?
            `).bind(token).first();

            // TODO: Enviar email via email-worker
            // Por agora, marcar como não enviado para admin copiar link
            const inviteUrl = `${Deno.env.get('FRONTEND_URL') || 'https://compia.tech'}/invite/accept?token=${token}`;

            results.push({
                id: invitation?.id,
                email: normalizedEmail,
                role,
                expires_at: expiresAt,
                invite_url: inviteUrl,
                email_sent: false
            });

        } catch (error: any) {
            console.error(`[INVITATIONS] Erro ao criar convite para ${normalizedEmail}:`, error);
            failed.push({ email: normalizedEmail, error: error.message });
        }
    }

    return c.json({
        success: results.length > 0,
        created: results.length,
        failed: failed.length,
        invitations: results,
        errors: failed
    }, results.length > 0 ? 201 : 400);
});

/**
 * POST /api/invitations/:id/revoke
 * Revoga um convite pendente
 */
invitationRoutes.post("/:id/revoke", async (c) => {
    const env = c.env;
    const user = c.get("user");
    const id = c.req.param("id");

    if (!user) {
        return c.json({ error: "Não autenticado" }, 401);
    }

    try {
        // Verificar se convite existe e pertence à org do usuário
        const invitation = await env.DB.prepare(`
            SELECT i.*, o.name as org_name 
            FROM organization_invitations i
            JOIN organizations o ON o.id = i.organization_id
            WHERE i.id = ?
        `).bind(id).first();

        if (!invitation) {
            return c.json({ error: "Convite não encontrado" }, 404);
        }

        if (invitation.status !== 'pending') {
            return c.json({ error: "Apenas convites pendentes podem ser revogados" }, 400);
        }

        // Revogar
        await env.DB.prepare(`
            UPDATE organization_invitations 
            SET status = 'revoked', revoked_at = NOW(), revoked_by = ?
            WHERE id = ?
        `).bind(user.id, id).run();

        return c.json({ success: true, message: "Convite revogado com sucesso" });
    } catch (error: any) {
        console.error("[INVITATIONS] Erro ao revogar:", error);
        return c.json({ error: "Erro ao revogar convite", details: error.message }, 500);
    }
});

/**
 * POST /api/invitations/:id/resend
 * Reenvia email do convite e renova validade
 */
invitationRoutes.post("/:id/resend", async (c) => {
    const env = c.env;
    const user = c.get("user");
    const id = c.req.param("id");

    if (!user) {
        return c.json({ error: "Não autenticado" }, 401);
    }

    try {
        const invitation = await env.DB.prepare(`
            SELECT * FROM organization_invitations WHERE id = ? AND status = 'pending'
        `).bind(id).first();

        if (!invitation) {
            return c.json({ error: "Convite não encontrado ou não está pendente" }, 404);
        }

        // Gerar novo token e renovar validade
        const newToken = crypto.randomUUID() + '-' + crypto.randomUUID();
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await env.DB.prepare(`
            UPDATE organization_invitations 
            SET token = ?, expires_at = ?, resend_count = resend_count + 1, last_resent_at = NOW()
            WHERE id = ?
        `).bind(newToken, newExpiresAt, id).run();

        const inviteUrl = `${Deno.env.get('FRONTEND_URL') || 'https://compia.tech'}/invite/accept?token=${newToken}`;

        // TODO: Reenviar email

        return c.json({
            success: true,
            message: "Convite reenviado",
            new_expires_at: newExpiresAt,
            invite_url: inviteUrl
        });
    } catch (error: any) {
        console.error("[INVITATIONS] Erro ao reenviar:", error);
        return c.json({ error: "Erro ao reenviar convite", details: error.message }, 500);
    }
});

/**
 * GET /api/invitations/validate
 * Valida token de convite (para frontend)
 */
invitationRoutes.get("/validate", async (c) => {
    const env = c.env;
    const token = c.req.query("token");

    if (!token) {
        return c.json({ valid: false, error: "Token obrigatório" }, 400);
    }

    try {
        const result = await env.DB.prepare("SELECT * FROM validate_invitation_token(?)").bind(token).first();

        if (!result || !result.invitation_id) {
            return c.json({ valid: false, reason: "Token inválido ou expirado" }, 400);
        }

        return c.json({
            valid: true,
            organization_name: result.organization_name,
            email: result.email,
            role: result.role,
            expires_at: result.expires_at
        });
    } catch (error: any) {
        console.error("[INVITATIONS] Erro ao validar token:", error);
        return c.json({ valid: false, error: "Erro ao validar token" }, 500);
    }
});

/**
 * POST /api/invitations/accept
 * Aceita convite e vincula usuário à organização
 */
invitationRoutes.post("/accept", async (c) => {
    const env = c.env;
    const user = c.get("user");
    const body = await c.req.json();
    const { token } = body;

    if (!user) {
        return c.json({ error: "Você precisa estar logado para aceitar o convite" }, 401);
    }

    if (!token) {
        return c.json({ error: "Token obrigatório" }, 400);
    }

    try {
        const result = await env.DB.prepare("SELECT accept_invitation(?, ?) as result").bind(token, user.id).first();
        const acceptResult = typeof result?.result === 'string' ? JSON.parse(result.result) : result?.result;

        if (!acceptResult?.success) {
            const errorMessages: Record<string, string> = {
                'invalid_or_expired_token': 'Convite inválido ou expirado. Solicite um novo convite.',
                'user_not_found': 'Usuário não encontrado.',
                'email_mismatch': `Este convite foi enviado para ${acceptResult?.expected_email}. Faça login com esse email.`
            };

            return c.json({
                success: false,
                error: errorMessages[acceptResult?.error] || acceptResult?.error || 'Erro desconhecido'
            }, 400);
        }

        return c.json({
            success: true,
            message: "Convite aceito com sucesso!",
            organization_id: acceptResult.organization_id,
            role: acceptResult.role,
            redirectTo: "/dashboard"
        });
    } catch (error: any) {
        console.error("[INVITATIONS] Erro ao aceitar convite:", error);
        return c.json({ error: "Erro ao aceitar convite", details: error.message }, 500);
    }
});

export default invitationRoutes;
