import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";


const authRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();
console.log('[AUTH-ROUTES] Auth routes module loaded, typeof:', typeof authRoutes);

// Helper para hash de senha (simples para demo, idealmente usar bcrypt/argon2 em prod real)
// Como estamos no worker, vamos usar Web Crypto API
async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Debug endpoint to check permissions
authRoutes.get("/debug-permissions", tenantAuthMiddleware, (c) => {
    const tenantContext = c.get("tenantContext");
    const user = c.get("user");
    return c.json({
        user_id: user?.id,
        role: user?.role,
        tenant_context: tenantContext
    });
});

// Get current user details - supports both Supabase auth and session cookie
authRoutes.get("/me", async (c) => {
    const env = c.env;

    // 1. Try Supabase auth user first (for Google login)
    let user = c.get('user');

    // 2. If no Supabase user, check session cookie (for email/password login)
    // SEGURANÇA: dev-session só é aceito em ambiente de desenvolvimento
    // Fail Secure: Assume produção (false) a menos que explicitamente 'development'
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';

    if (!user) {
        const sessionToken = getCookie(c, 'mocha-session-token');
        if (sessionToken && sessionToken.startsWith('dev-session-') && isDevelopment) {
            const userId = sessionToken.replace('dev-session-', '');
            // Validate session by looking up user in DB
            const dbUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
            if (dbUser) {
                user = { id: dbUser.id, email: dbUser.email };
            }
        } else if (sessionToken && sessionToken.startsWith('dev-session-') && !isDevelopment) {
            console.warn('[AUTH-ROUTES] BLOQUEADO: Tentativa de usar dev-session em produção');
        }
    }

    if (!user) {
        return c.json({ user: null }); // Return null user instead of 401 for session checks
    }

    try {
        // Fetch full user details from DB to get role/name
        const dbUser = await env.DB.prepare("SELECT * FROM users WHERE id = ? OR email = ?").bind(user.id, user.email).first();

        if (!dbUser) {
            return c.json({ user: null });
        }

        // VERIFICAÇÃO CRÍTICA: Bloquear usuários pendentes
        if (dbUser.approval_status === 'pending') {
            return c.json({
                error: "Conta em análise",
                message: "Sua conta aguarda aprovação do administrador.",
                code: "APPROVAL_PENDING",
                approval_status: "pending",
                user: null
            }, 403);
        } else if (dbUser.approval_status === 'rejected') {
            return c.json({
                error: "Conta recusada",
                message: "Sua solicitação de cadastro foi recusada.",
                code: "APPROVAL_REJECTED",
                approval_status: "rejected",
                user: null
            }, 403);
        }

        // Build profile object as expected by frontend
        const profile = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            organization_id: dbUser.organization_id,
            can_manage_users: dbUser.can_manage_users,
            can_create_organizations: dbUser.can_create_organizations,
            is_active: dbUser.is_active,
            managed_organization_id: dbUser.managed_organization_id,
            created_at: dbUser.created_at,
            updated_at: dbUser.updated_at,
            profile_completed: true,
            approval_status: dbUser.approval_status
        };

        // Helper to extract Google Data
        let googleUserData = null;
        console.log('[AUTH-ME] User object keys:', user ? Object.keys(user) : 'null');
        console.log('[AUTH-ME] User metadata:', user ? (user as any).user_metadata : 'null');

        if (user && (user as any).user_metadata) {
            const meta = (user as any).user_metadata;
            console.log('[AUTH-ME] Meta keys:', Object.keys(meta));
            if (meta.picture || meta.avatar_url) {
                googleUserData = {
                    picture: meta.picture || meta.avatar_url,
                    name: meta.full_name || meta.name
                };
                console.log('[AUTH-ME] Extracted google_user_data:', googleUserData);

                // NOVO: Persistir avatar_url na tabela users se ainda não existir
                if (!dbUser.avatar_url && googleUserData.picture) {
                    try {
                        await env.DB.prepare(`
                            UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?
                        `).bind(googleUserData.picture, dbUser.id).run();
                        console.log('[AUTH-ME] Avatar URL persistido para usuário:', dbUser.id);
                    } catch (avatarErr) {
                        console.error('[AUTH-ME] Erro ao persistir avatar:', avatarErr);
                    }
                }
            }
        } else if ((user as any).google_user_data) {
            // Fallback if attached by middleware (though middleware might not run here)
            googleUserData = (user as any).google_user_data;
        }

        // Fetch accessible organizations
        // SYS_ADMIN gets ALL organizations, others get only their assigned ones
        let accessibleOrganizations: any[] = [];
        try {
            const isSysAdmin = ['sys_admin', 'system_admin', 'admin'].includes(dbUser.role?.toLowerCase());

            if (isSysAdmin) {
                // System Admin: Get ALL active organizations
                accessibleOrganizations = await env.DB.prepare(`
                    SELECT o.id, o.name, o.type, o.organization_level, 'sys_admin' as role, false as is_primary
                    FROM organizations o
                    WHERE o.is_active = true
                    ORDER BY o.name ASC
                `).all().then((res: any) => res.results || []);
                console.log(`[AUTH-ME] SysAdmin ${dbUser.email} has access to ${accessibleOrganizations.length} organizations`);
            } else {
                // Regular users: Get only assigned organizations
                accessibleOrganizations = await env.DB.prepare(`
                    SELECT o.id, o.name, o.type, o.organization_level, uo.role, uo.is_primary
                    FROM organizations o
                    JOIN user_organizations uo ON o.id = uo.organization_id
                    WHERE uo.user_id = ? AND o.is_active = true
                `).bind(dbUser.id).all().then((res: any) => res.results || []);
            }
        } catch (e) {
            console.error('[AUTH-ME] Error fetching user organizations:', e);
        }

        return c.json({
            success: true,
            user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role,
                approval_status: dbUser.approval_status,
                profile: profile, // Frontend expects user.profile.role
                google_user_data: googleUserData, // Pass Verified Google Data
                organizations: accessibleOrganizations // N-to-N Orgs list
            }
        });
    } catch (error) {
        console.error('Error fetching user /me:', error);
        return c.json({ error: "Server error" }, 500);
    }
});

// Registro de usuário
authRoutes.post("/register", async (c) => {
    const env = c.env;

    try {
        const { email, password, name, organization_name, role } = await c.req.json();

        if (!email || !password || !name) {
            return c.json({ error: "Email, senha e nome são obrigatórios" }, 400);
        }

        // Database initialization removed (migrated to Postgres)

        // Verificar se usuário já existe
        const existingUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();

        if (existingUser) {
            return c.json({ error: "Email já cadastrado" }, 409);
        }

        // Criar ID único
        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);

        // Verificar se é o usuário Admin de Bootstrap
        const isBootstrapAdmin = email === 'eng.tiagosm@gmail.com';

        // Definir Role Inicial
        let initialRole = role || 'inspector';

        // Se estiver criando organização, força ser Admin da Org
        if (organization_name) {
            initialRole = 'org_admin';
        }

        // Sanitização de segurança: Impedir criação direta de SysAdmin via API
        if (initialRole === 'sys_admin' || initialRole === 'system_admin') {
            if (isBootstrapAdmin) {
                initialRole = 'sys_admin'; // Permitido apenas para o e-mail mestre
            } else {
                initialRole = 'org_admin'; // Downgrade seguro
            }
        }

        // Definir Status: SEMPRE pendente, exceto o bootstrap admin
        const initialStatus = isBootstrapAdmin ? 'approved' : 'pending';

        // 1. Criar usuário (Agora com role dinâmico e status forçado)
        await env.DB.prepare(`
          INSERT INTO users (id, email, name, role, approval_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `).bind(userId, email, name, initialRole, initialStatus).run();

        // 2. Criar credenciais
        await env.DB.prepare(`
          INSERT INTO user_credentials (user_id, password_hash, created_at, updated_at)
          VALUES (?, ?, NOW(), NOW())
        `).bind(userId, passwordHash).run();

        // 3. Se forneceu nome da organização, criar e vincular
        if (organization_name) {
            const orgResult = await env.DB.prepare(`
                INSERT INTO organizations (name, type, created_at, updated_at)
                VALUES (?, 'company', NOW(), NOW())
            `).bind(organization_name).run();

            const orgId = orgResult.meta.last_row_id;

            // Vincular usuário à organização criada
            await env.DB.prepare(`
                UPDATE users 
                SET organization_id = ?, can_manage_users = true, can_create_organizations = true
                WHERE id = ?
            `).bind(orgId, userId).run();
        }

        // NOTIFICAÇÃO: Avisar SysAdmins sobre novo cadastro urgente
        try {
            const sysAdmins = await env.DB.prepare("SELECT id FROM users WHERE role IN ('sys_admin', 'system_admin')").all();
            if (sysAdmins && sysAdmins.results) {
                const notifications = sysAdmins.results.map((admin: any) => ({
                    user_id: admin.id,
                    title: "Novo Cadastro Pendente",
                    message: `O usuário ${name} (${email}) se cadastrou e aguarda aprovação.`,
                    type: "info",
                    link: "/users"
                }));

                // Bulk insert or loop
                for (const notif of notifications) {
                    await env.DB.prepare(`
                        INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)
                    `).bind(notif.user_id, notif.title, notif.message, notif.type, notif.link).run();
                }
            }
        } catch (notifError) {
            console.error("Falha ao criar notificação para admins:", notifError);
            // Non-blocking error
        }

        // TRIGGER EMAIL: Send welcome email (Pending Approval)
        try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

            if (supabaseUrl && supabaseAnonKey) {
                fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify({
                        type: 'welcome_pending',
                        payload: { email, name }
                    })
                }).catch(err => console.error("Failed to trigger welcome email:", err));
            }
        } catch (emailErr) {
            console.error("Error triggering welcome email:", emailErr);
        }

        return c.json({
            success: true,
            message: "Conta criada com sucesso. Aguardando aprovação do administrador.",
            requires_approval: true,
            user: { id: userId, email, name }
        }, 201);

    } catch (error) {
        console.error('Erro no registro:', error);
        return c.json({ error: "Erro ao criar conta" }, 500);
    }
});

// Login
authRoutes.post("/login", async (c) => {
    const env = c.env;

    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({ error: "Email e senha são obrigatórios" }, 400);
        }

        // initializeDatabase(env) removed

        // Buscar usuário e verificar status de aprovação
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

        if (!user) {
            return c.json({ error: "Credenciais inválidas" }, 401);
        }

        // VERIFICAÇÃO DE APROVAÇÃO
        if (user.approval_status === 'pending') {
            return c.json({
                error: "Conta em análise",
                message: "Sua conta aguarda aprovação do administrador.",
                code: "APPROVAL_PENDING"
            }, 403);
        } else if (user.approval_status === 'rejected') {
            return c.json({
                error: "Conta recusada",
                message: "Sua solicitação de cadastro foi recusada.",
                code: "APPROVAL_REJECTED"
            }, 403);
        }

        // Verificar senha
        const credentials = await env.DB.prepare("SELECT password_hash FROM user_credentials WHERE user_id = ?").bind(user.id).first();

        if (!credentials) {
            // Usuário existe mas sem senha (login social?)
            return c.json({ error: "Este usuário deve fazer login via Google" }, 401);
        }

        const inputHash = await hashPassword(password);

        if (inputHash !== credentials.password_hash) {
            return c.json({ error: "Credenciais inválidas" }, 401);
        }

        // Login sucesso
        // Atualizar last_login
        await env.DB.prepare("UPDATE user_credentials SET last_login_at = NOW() WHERE user_id = ?").bind(user.id).run();

        // Gerar token de sessão (simples para demo)
        const sessionToken = `dev-session-${user.id}`;

        // Setar cookie
        setCookie(c, "mocha-session-token", sessionToken, {
            httpOnly: true,
            path: "/",
            sameSite: "Lax",
            secure: false, // true em prod
            maxAge: 60 * 60 * 24 * 7 // 7 dias
        });

        return c.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        return c.json({ error: "Erro ao realizar login" }, 500);
    }
});

// Logout
authRoutes.post("/logout", async (c) => {
    deleteCookie(c, "mocha-session-token");
    return c.json({ success: true });
});

export default authRoutes;

