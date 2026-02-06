import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { requireProtectedSysAdmin } from "./rbac-middleware.ts";

type Env = {
    DB: any;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    ENVIRONMENT?: string;
};


const authRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>().basePath('/api/auth');
console.log('[AUTH-ROUTES] Auth routes module loaded, typeof:', typeof authRoutes);

// Helper para hash de senha SEGURO usando PBKDF2 (recomendado para senhas)
// PBKDF2 é lento por design, dificultando ataques de força bruta
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

async function hashPassword(password: string, existingSalt?: string): Promise<string> {
    const encoder = new TextEncoder();

    // Gerar salt ou usar existente (para verificação)
    let salt: Uint8Array;
    if (existingSalt) {
        salt = new Uint8Array(existingSalt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    } else {
        salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    }

    // Importar senha como chave
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derivar hash com PBKDF2
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Formato: salt$hash (permite extrair salt para verificação)
    return `${saltHex}$${hashHex}`;
}

// Função para verificar senha contra hash armazenado
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    // Hash antigo (SHA-256 puro) não tem '$'
    if (!storedHash.includes('$')) {
        // Compatibilidade: verificar com SHA-256 legado
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return legacyHash === storedHash;
    }

    // Hash novo (PBKDF2): extrair salt e verificar
    const [salt] = storedHash.split('$');
    const newHash = await hashPassword(password, salt);
    return newHash === storedHash;
}

// Debug endpoint to check permissions
authRoutes.get("/debug-permissions", tenantAuthMiddleware, requireProtectedSysAdmin(), (c) => {
    if (Deno.env.get('ENVIRONMENT') === 'production') {
        return c.json({ error: "Debug endpoints desabilitados em produção" }, 403);
    }

    const tenantContext = c.get("tenantContext");
    const user = c.get("user");
    return c.json({
        user_id: user?.id,
        role: user?.role,
        tenant_context: tenantContext
    });
});

// Get current user details - supports both Supabase auth and session cookie
authRoutes.get("/me", tenantAuthMiddleware, async (c) => {
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
        let dbUser = await env.DB.prepare("SELECT * FROM users WHERE id = ? OR email = ?").bind(user.id, user.email).first();

        if (!dbUser && user?.email) {
            const userName = (user as any).user_metadata?.full_name || (user as any).user_metadata?.name || user.email?.split('@')[0] || 'User';
            try {
                await env.DB.prepare(`
                    INSERT INTO users (id, email, name, role, is_active, approval_status, created_at, updated_at, avatar_url)
                    VALUES (?, ?, ?, 'inspector', true, 'pending', NOW(), NOW(), ?)
                `).bind(user.id, user.email, userName, (user as any).user_metadata?.avatar_url || (user as any).user_metadata?.picture || null).run();
                dbUser = await env.DB.prepare("SELECT * FROM users WHERE id = ? OR email = ?").bind(user.id, user.email).first();
            } catch (insertError) {
                console.error('[AUTH-ME] Auto-create user failed:', insertError);
            }
        }

        if (!dbUser) {
            return c.json({ user: null });
        }


        // VERIFICAÇÃO CRÍTICA: Bloquear APENAS usuários rejeitados
        if (dbUser.approval_status === 'rejected') {
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
            // ... existing profile build ...

            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            organization_id: dbUser.organization_id,
            can_manage_users: dbUser.can_manage_users,
            can_create_organizations: dbUser.can_create_organizations,
            is_active: dbUser.is_active,
            managed_organization_id: dbUser.managed_organization_id,
            avatar_url: dbUser.avatar_url,
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
        const { email, password, name, organization_name, role, subscription_plan } = await c.req.json();

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

            // Determine Plan and Status
            const plan = subscription_plan || 'basic';
            const subStatus = (plan === 'pro' || plan === 'enterprise') ? 'pending_payment' : 'active';


            const orgResult = await env.DB.prepare(`
                INSERT INTO organizations (name, type, subscription_plan, subscription_status, created_at, updated_at)
                VALUES (?, 'company', ?, ?, NOW(), NOW())
            `).bind(organization_name, plan, subStatus).run();

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
                // Fix: Use email-worker/send instead of send-email (which is deprecated/empty)
                // Fix: Change type to 'welcome' and payload to data
                fetch(`${supabaseUrl}/functions/v1/email-worker/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify({
                        to: email, // Changed from implicit in payload to explicit 'to' field if needed, likely email-worker expects 'to' at top level
                        type: 'welcome',
                        data: { email, name }
                    })
                }).catch(err => console.error("Failed to trigger welcome email:", err));
            }
        } catch (emailErr) {
            console.error("Error triggering welcome email:", emailErr);
        }

        // AUTO-LOGIN: Set session cookie immediately
        // SEGURANÇA: Gerar token de sessão com UUID criptográfico
        const sessionToken = crypto.randomUUID();

        // SEGURANÇA: Armazenar sessão no banco
        try {
            await env.DB.prepare(`
                INSERT INTO user_sessions (id, user_id, token, created_at, expires_at)
                VALUES (?, ?, ?, NOW(), NOW() + INTERVAL '7 days')
            `).bind(crypto.randomUUID(), userId, sessionToken).run();
        } catch (sessionErr) {
            console.warn('[AUTH] Warn saving session:', sessionErr);
        }

        // SEGURANÇA: Cookie secure dinâmico
        const isProduction = Deno.env.get('ENVIRONMENT') !== 'development';

        setCookie(c, "mocha-session-token", sessionToken, {
            httpOnly: true,
            path: "/",
            sameSite: "Lax",
            secure: isProduction,
            maxAge: 60 * 60 * 24 * 7 // 7 dias
        });

        return c.json({
            success: true,
            message: "Conta criada com sucesso. Redirecionando...",
            requires_approval: true, // Still true, but we allow access to limited areas
            user: {
                id: userId,
                email,
                name,
                role: initialRole,
                approval_status: initialStatus
            }
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
        // VERIFICAÇÃO DE APROVAÇÃO
        if (user.approval_status === 'rejected') {
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

        // Verificar senha (suporta hash novo PBKDF2 e legado SHA-256)
        const isValidPassword = await verifyPassword(password, credentials.password_hash as string);

        if (!isValidPassword) {
            return c.json({ error: "Credenciais inválidas" }, 401);
        }


        // Login sucesso
        // Atualizar last_login
        await env.DB.prepare("UPDATE user_credentials SET last_login_at = NOW() WHERE user_id = ?").bind(user.id).run();

        // SEGURANÇA: Gerar token de sessão com UUID criptográfico (não previsível)
        const sessionToken = crypto.randomUUID();

        // SEGURANÇA: Armazenar sessão no banco para validação futura
        try {
            await env.DB.prepare(`
                INSERT INTO user_sessions (id, user_id, token, created_at, expires_at)
                VALUES (?, ?, ?, NOW(), NOW() + INTERVAL '7 days')
            `).bind(crypto.randomUUID(), user.id, sessionToken).run();
        } catch (sessionErr) {
            console.warn('[AUTH] Não foi possível salvar sessão no banco (tabela pode não existir):', sessionErr);
        }

        // SEGURANÇA: Cookie secure dinâmico baseado no ambiente
        const isProduction = Deno.env.get('ENVIRONMENT') !== 'development';

        setCookie(c, "mocha-session-token", sessionToken, {
            httpOnly: true,
            path: "/",
            sameSite: "Lax",
            secure: isProduction, // true em produção, false em dev
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

// Forgot Password - Gera token e envia email
authRoutes.post("/forgot-password", async (c) => {
    const env = c.env;
    try {
        console.log('[AUTH-RESET] Iniciando solicitação de forgot-password');
        const { email } = await c.req.json();
        if (!email) {
            return c.json({ error: "Email é obrigatório" }, 400);
        }

        // 1. Verificar se usuário existe
        const user = await env.DB.prepare("SELECT id, name, email FROM users WHERE email = ?").bind(email).first();

        // Segurança: Retornar sucesso mesmo se não existir para evitar enumeração de usuários
        // Mas logar internamente para debug
        if (!user) {
            console.log(`[AUTH-RESET] Solicitação de reset para email inexistente: ${email}`);
            return c.json({ success: true, message: "Se o email estiver cadastrado, você receberá um link de recuperação." });
        }

        // 2. Gerar Token único e Hash
        const token = crypto.randomUUID();
        // Não precisamos de hash complexo aqui, pois o token é curto vida (1h) e random
        // Mas se quisessemos mais segurança, poderiamos hashear. Por simplicidade e performance, guardamos direto.
        // O token é o "segredo" enviado por email.

        // 3. Salvar token no banco
        // 3. Salvar token no banco
        // Definir validade de 1 hora explicitamente
        await env.DB.prepare(`
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES (?, ?, NOW() + INTERVAL '1 hour')
        `).bind(user.id, token).run();


        // 4. Enviar Email
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const resetUrl = `https://compia.tech/reset-password?token=${token}`;

        if (supabaseUrl && supabaseAnonKey) {
            // Fire-and-forget: não bloquear resposta esperando email
            // Fix: Append /send to URL
            fetch(`${supabaseUrl}/functions/v1/email-worker/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                    to: user.email,
                    type: 'reset_password',
                    data: {
                        name: user.name,
                        resetUrl: resetUrl
                    }
                })
            }).then(res => {
                if (!res.ok) console.error("[AUTH-RESET] Falha ao enviar email do worker:", res.status);
            }).catch(err => console.error("[AUTH-RESET] Erro ao chamar email-worker:", err));
        }

        return c.json({ success: true, message: "Se o email estiver cadastrado, você receberá um link de recuperação." });

    } catch (error) {
        console.error('Erro em forgot-password:', error);
        return c.json({ error: "Erro interno ao processar solicitação" }, 500);
    }
});

// Reset Password - Valida token e atualiza senha
authRoutes.post("/reset-password", async (c) => {
    const env = c.env;
    try {
        const { token, newPassword } = await c.req.json();

        if (!token || !newPassword) {
            return c.json({ error: "Token e nova senha são obrigatórios" }, 400);
        }

        // 1. Validar Token
        const tokenRecord = await env.DB.prepare(`
            SELECT * FROM password_reset_tokens 
            WHERE token = ? AND used = FALSE AND expires_at > NOW()
        `).bind(token).first();

        if (!tokenRecord) {
            return c.json({ error: "Token inválido ou expirado" }, 400);
        }

        // 2. Hash da nova senha
        const newPasswordHash = await hashPassword(newPassword);

        // 3. Atualizar Credenciais
        await env.DB.prepare("UPDATE user_credentials SET password_hash = ?, updated_at = NOW() WHERE user_id = ?")
            .bind(newPasswordHash, tokenRecord.user_id).run();

        // 4. Marcar token como usado
        await env.DB.prepare("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?")
            .bind(tokenRecord.id).run();

        // 5. Opcional: Invalidar sessões antigas?
        // Por segurança, seria bom, mas pode ser agressivo. Vamos manter logado quem está logado, 
        // mas quem esqueceu a senha provavelmente não está logado.

        return c.json({ success: true, message: "Senha atualizada com sucesso" });

    } catch (error) {
        console.error('Erro em reset-password:', error);
        return c.json({ error: "Erro ao redefinir senha" }, 500);
    }
});

export default authRoutes;

