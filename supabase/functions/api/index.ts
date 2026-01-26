import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

// Import wrapper para compatibilidade
import { createD1Wrapper } from './d1-wrapper.ts'

// Importar rotas
import usersRoutes from "./users-routes.ts";
import kanbanRoutes from "./kanban-routes.ts";
import organizationsRoutes from "./organizations-routes.ts";
import inspectionRoutes from "./inspection-routes.ts";
import checklistRoutes from "./checklist-routes.ts";
import authRoutes from "./auth-routes.ts";
import aiAssistantsRoutes from "./ai-assistants-routes.ts";
import checklistFoldersRoutes from "./checklist-folders-routes.ts";
import dashboardRoutes from "./dashboard-routes.ts";
import shareRoutes from "./share-routes.ts";
import adminApprovalRoutes from "./admin-approval-routes.ts";
import userAssignmentRoutes from "./user-assignment-routes.ts";
import multiTenantRoutes from "./multi-tenant-routes.ts";
import systemAdminRoutes from "./system-admin-routes.ts";
import rolePermissionsRoutes from "./role-permissions-routes.ts";
import cepRoutes from "./cep-routes.ts";
import cnpjRoutes from "./cnpj-routes.ts";
import mediaRoutes from "./media-routes.ts";
import adminDebugRoutes from "./admin-debug-routes.ts";
import databaseDebugRoutes from "./database-debug-routes.ts";
import autoOrganizeFolders from "./auto-organize-folders.ts";
import autosuggestRoutes from "./autosuggest-routes.ts";
import { aiUsageRoutes } from "./ai-usage-routes.ts";
import securityEndpoints from "./security-endpoints.ts";
import actionPlansRoutes from "./action-plans-routes.ts";
import resetProjectRoutes from "./reset-project.ts";
import notificationsRoutes from "./notifications-routes.ts";
import financialRoutes from "./financial-routes.ts";
import asaasWebhookRoutes from "./asaas-webhook.ts";
import inspectionItemRoutes from "./inspection-item-routes.ts";
import gamificationRoutes from "./gamification-routes.ts";
import aiAssistantRoutes from "./ai-assistant-routes.ts";
import { auditRoutes } from "./audit-routes.ts";
import calendarRoutes from "./calendar-routes.ts";
import calendarSettingsRoutes from "./calendar-settings-routes.ts";
import testOrgsRoutes from "./test-orgs.ts";
import integrationsRoutes from "./integrations-routes.ts";
import calendarUploadRoutes from "./calendar-upload-routes.ts";
import crmRoutes from "./crm-routes.ts";
import systemPlansRoutes from "./system-plans-routes.ts";

const app = new Hono()

// GLOBAL ERROR HANDLER (Sentinela Security Pattern)
app.onError((err, c) => {
    console.error('[GLOBAL-ERROR] Uncaught exception:', err);

    // Fail Secure: Não vazar stack trace em produção
    const isDev = Deno.env.get('ENVIRONMENT') === 'development';

    return c.json({
        error: "Internal Server Error",
        message: isDev ? err.message : "Ocorreu um erro interno. Nossa equipe já foi notificada.",
        code: "INTERNAL_ERROR",
        // Stack apenas em dev
        stack: isDev ? err.stack : undefined
    }, 500);
});

app.use('/*', cors({
    origin: (origin) => {
        const allowed = ['https://compia.tech', 'https://www.compia.tech', 'http://localhost:3000', 'http://localhost:5173', 'https://compia-06092520-aqb5140o0-tiagossms-projects.vercel.app'];
        // Allow Vercel preview URLs dynamically
        if (origin && (allowed.includes(origin) || origin.endsWith('.vercel.app'))) {
            return origin;
        }
        // SEGURANÇA: Não permitir origens desconhecidas (retorna null = bloqueio CORS)
        return null;
    },

    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
}))

// Middleware para injetar DB wrapper e User
app.use('*', async (c, next) => {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')
    // @ts-ignore
    c.env = c.env || {}

    if (dbUrl) {
        // @ts-ignore
        c.env.DB = createD1Wrapper(dbUrl)
    }

    // Inject OPENAI_API_KEY from Deno.env so routes can access it
    // @ts-ignore
    c.env.OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
    // @ts-ignore - Gemini API key for AI fallback
    c.env.GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
    // @ts-ignore
    c.env.SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    // @ts-ignore
    c.env.SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
    // @ts-ignore - Required for Supabase Storage uploads
    c.env.SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const path = c.req.path;
    console.log(`[AUTH-DEBUG] ===== Request: ${c.req.method} ${path} =====`);

    // Rotas públicas que não precisam de autenticação
    const publicPaths = ['/api/health', '/api/', '/api/shared', '/api/test-orgs/debug', '/test-orgs/debug', '/api/calendar/debug', '/api/debug-usage'];
    const isPublicRoute = publicPaths.some(p => path === p || path.startsWith(p + '/'));

    if (isPublicRoute) {
        console.log(`[AUTH-DEBUG] Public route, skipping auth: ${path}`);
        await next();
        return;
    }

    // Verificar se já tem user (algumas rotas públicas não precisam)
    if (!c.get('user')) {
        let user = null;

        // 1. Primeiro, tentar via Supabase Auth (para Google login)
        const authHeader = c.req.header('Authorization');
        console.log(`[AUTH-DEBUG] Authorization header: ${authHeader ? 'present (' + authHeader.substring(0, 30) + '...)' : 'absent'}`);

        if (authHeader) {
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            )
            const { data, error } = await supabaseClient.auth.getUser()
            user = data?.user;
            console.log(`[AUTH-DEBUG] Supabase Auth: ${user ? 'found user ' + user.email : 'no user'}, error: ${error?.message || 'none'}`);

            // AUTO-SYNC: If user from Supabase Auth doesn't exist in DB, create them
            if (user && user.email && c.env?.DB) {
                const existingDbUser = await c.env.DB.prepare("SELECT id, role FROM users WHERE id = ? OR email = ?").bind(user.id, user.email).first();
                if (!existingDbUser) {
                    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
                    console.log(`[AUTH-DEBUG] Creating new user in DB for Google user: ${user.email}`);
                    try {
                        await c.env.DB.prepare(`
                            INSERT INTO users (id, email, name, role, is_active, approval_status, created_at, updated_at)
                            VALUES (?, ?, ?, 'inspector', true, 'pending', NOW(), NOW())
                        `).bind(user.id, user.email, userName).run();
                        console.log(`[AUTH-DEBUG] Created new user: ${user.email} with pending approval`);
                    } catch (insertError) {
                        console.error('[AUTH-DEBUG] Error creating user:', insertError);
                    }
                } else {
                    // Enrich user object with DB role
                    (user as any).role = (existingDbUser as any).role;
                }
            }
        }


        if (!user) {
            const cookies = c.req.header('Cookie') || '';
            const sessionMatch = cookies.match(/mocha-session-token=([^;]+)/);
            console.log(`[AUTH-DEBUG] Cookie session: ${sessionMatch ? 'found token' : 'no token'}`);
            if (sessionMatch) {
                const sessionToken = sessionMatch[1];
                if (sessionToken && sessionToken.startsWith('dev-session-')) {
                    const userId = sessionToken.replace('dev-session-', '');
                    // Buscar usuário no DB
                    if (c.env?.DB) {
                        const dbUser = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
                        console.log(`[AUTH-DEBUG] Cookie user lookup: ${dbUser ? 'found ' + (dbUser as any).email : 'not found'}`);
                        if (dbUser) {
                            user = {
                                id: (dbUser as any).id,
                                email: (dbUser as any).email,
                                role: (dbUser as any).role,
                                user_metadata: { name: (dbUser as any).name }
                            };
                        }
                    }
                }
            }
        }

        console.log(`[AUTH-DEBUG] Final user: ${user ? (user as any).email + ' (role: ' + (user as any).role + ')' : 'NONE'}`);
        c.set('user', user)
    } else {
        console.log(`[AUTH-DEBUG] User already in context: ${(c.get('user') as any)?.email}`);
    }

    await next()
})

// Criar sub-app para as rotas da API
const apiRoutes = new Hono();

// Middleware para propagar contexto de autenticação do app pai para o sub-app
apiRoutes.use('*', async (c, next) => {
    // O contexto já foi preenchido pelo middleware do app principal
    // Mas precisamos garantir que o user está acessível
    console.log(`[SUBROUTES] Path: ${c.req.path}, User in context: ${c.get('user') ? (c.get('user') as any).email : 'NONE'}`);
    await next();
});

// Rotas básicas no sub-app
apiRoutes.get('/', (c) => {
    return c.text('COMPIA API running on Supabase Edge Functions with Postgres Wrapper! Status: Online v2')
})

apiRoutes.get('/health', async (c) => {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    let dbStatus = 'unknown';
    let dbError = null;
    let orgAddresses = null;

    if (c.env?.DB) {
        try {
            await c.env.DB.prepare('SELECT 1').bind().first();
            dbStatus = 'connected';

            // Debug: Check organization addresses
            const orgsResult = await c.env.DB.prepare(`
                SELECT id, name, nome_fantasia, address, contact_email 
                FROM organizations 
                LIMIT 5
            `).all();
            orgAddresses = orgsResult.results || [];
        } catch (e) {
            dbStatus = 'error';
            dbError = e instanceof Error ? e.message : String(e);
        }
    } else {
        dbStatus = 'not_configured';
        dbError = !dbUrl ? 'Missing SUPABASE_DB_URL env var' : 'DB wrapper failed to initialize';
    }

    return c.json({
        status: dbStatus === 'connected' ? 'online' : 'degraded',
        database: dbStatus,
        db_error: dbError,
        env_vars: {
            SUPABASE_DB_URL: dbUrl ? 'present' : 'missing',
        },
        debug_org_addresses: orgAddresses,
        timestamp: new Date().toISOString()
    }, dbStatus === 'connected' ? 200 : 503)
})

// Debug middleware for apiRoutes
apiRoutes.use('*', async (c, next) => {
    console.log('[API_ROUTER] Method:', c.req.method, 'Path:', c.req.path);
    await next();
});

// Registrar todas as rotas no sub-app (sem prefixos, pois serão montadas)
apiRoutes.route('/users', usersRoutes);
console.log('Registering /organizations route');
apiRoutes.route('/organizations', organizationsRoutes);
apiRoutes.route('/test-orgs', testOrgsRoutes);
apiRoutes.route('/inspections', inspectionRoutes);
apiRoutes.route('/checklist', checklistRoutes);
apiRoutes.route('/auth', authRoutes);
apiRoutes.route('/ai-assistants', aiAssistantsRoutes);
apiRoutes.route('/checklist', checklistFoldersRoutes);
apiRoutes.route('/dashboard', dashboardRoutes);
apiRoutes.route('/share', shareRoutes);
apiRoutes.route('/notifications', notificationsRoutes);
apiRoutes.route('/admin', adminApprovalRoutes);
apiRoutes.route('/user-assignments', userAssignmentRoutes);
apiRoutes.route('/multi-tenant', multiTenantRoutes);
apiRoutes.route('/ai-usage', aiUsageRoutes);
apiRoutes.route('/system-admin', systemAdminRoutes);
apiRoutes.route('/role-permissions', rolePermissionsRoutes);
apiRoutes.route('/cep', cepRoutes);
apiRoutes.route('/cnpj', cnpjRoutes);
// Mount routes
apiRoutes.route('/inspection-items', inspectionItemRoutes);
apiRoutes.route('/media', mediaRoutes);
apiRoutes.route('/gamification', gamificationRoutes);
apiRoutes.route('/action-plans', actionPlansRoutes);
apiRoutes.route('/action-items', actionPlansRoutes); // Alias
apiRoutes.route('/autosuggest', autosuggestRoutes);
apiRoutes.route('/ai-assistant', aiAssistantRoutes);

apiRoutes.route('/kanban', kanbanRoutes);
apiRoutes.route('/audit', auditRoutes);
apiRoutes.route('/audit', auditRoutes);
apiRoutes.route('/calendar', calendarRoutes);
apiRoutes.route('/calendar-settings', calendarSettingsRoutes);
apiRoutes.route('/calendar-upload', calendarUploadRoutes);
apiRoutes.route('/integrations', integrationsRoutes);
apiRoutes.route('/crm', crmRoutes);
apiRoutes.route('/financial', financialRoutes);
apiRoutes.route('/billing', financialRoutes); // Alias for easier frontend access
apiRoutes.route('/webhooks/asaas', asaasWebhookRoutes); // Asaas payment gateway webhooks
apiRoutes.route('/system-commerce', systemPlansRoutes); // Isolated Commerce Module


// TEMPORARY DEBUG ROUTE
apiRoutes.get('/debug-usage/:orgId', async (c) => {
    const orgId = c.req.param('orgId');
    try {
        // @ts-ignore
        const result = await c.env.DB.prepare('SELECT id, name, ai_usage_count FROM organizations WHERE id = ?').bind(orgId).first();
        return c.json(result || { error: 'Not found' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// App principal monta o sub-app em dois lugares:
// 1. Na raiz '/' (para chamadas diretas ou sem prefixo)
// 2. Em '/api' (para chamadas vindo do Vercel que faz rewrite mantendo o path)
app.route('/', apiRoutes);
app.route('/api', apiRoutes);

// CRITICAL FIX: Explicitly mount organizations route to ensure visibility
// This bypasses any nested routing issues in apiRoutes
console.log('Explicitly mounting /organizations on root app');
app.route('/organizations', organizationsRoutes);
app.route('/orgs', organizationsRoutes); // ALIAS for testing
app.route('/api/organizations', organizationsRoutes);

// CRITICAL FIX: Explicitly mount financial routes
console.log('Explicitly mounting /financial on root app');
app.route('/financial', financialRoutes);
app.route('/api/financial', financialRoutes);
app.route('/billing', financialRoutes);
app.route('/api/billing', financialRoutes);

Deno.serve(app.fetch)

