import { Hono } from 'hono'
import { cors } from 'hono/cors'
// Imports removidos para Lazy Loading (d1-wrapper, supabase-js)


// Types
type Env = {
    DB: any;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    OPENAI_API_KEY: string;
    GEMINI_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>()

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
        const allowed = [
            'https://compia.tech',
            'https://www.compia.tech',
            'http://localhost:3000',
            'http://localhost:5173',
            'https://compia-06092520-aqb5140o0-tiagossms-projects.vercel.app'
        ];
        // Allow Vercel preview URLs dynamically
        if (origin && (allowed.includes(origin) || origin.endsWith('.vercel.app'))) {
            return origin;
        }
        // SEGURANÇA: Não permitir origens desconhecidas (retorna null = bloqueio CORS)
        return null;
    },

    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
}))

// Middleware para injetar DB wrapper e User
app.use('*', async (c, next) => {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')
    // @ts-ignore
    c.env = c.env || {}

    if (dbUrl) {
        console.warn('[DB-DEBUG] DB Wrapper loading DISABLED for debugging 500 error.');
        // try {
        //     // Lazy load D1 Wrapper (Postgres driver) to reduce boot time
        //     // console.log('[DB-DEBUG] Lazy loading d1-wrapper...');
        //     const { createD1Wrapper } = await import('./d1-wrapper.ts');
        //     // @ts-ignore
        //     c.env.DB = createD1Wrapper(dbUrl)
        //     // console.log('[DB-DEBUG] DB Wrapper initialized');
        // } catch (dbErr: any) {
        //     console.error('[DB-DEBUG] Failed to lazy load DB wrapper:', dbErr);
        // }
    } else {
        console.warn('[DB-DEBUG] No SUPABASE_DB_URL found');
    }

    // Inject keys from Deno.env
    // @ts-ignore
    c.env.OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
    // @ts-ignore
    c.env.GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
    // @ts-ignore
    c.env.SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    // @ts-ignore
    c.env.SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
    // @ts-ignore
    c.env.SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const path = c.req.path;
    console.log(`[AUTH-DEBUG] ===== Request: ${c.req.method} ${path} =====`);

    // Rotas públicas que não precisam de autenticação
    // [SEC-006/007/008] Removidas rotas de debug da lista pública - Gatekeeper 30/01/2026
    const publicPaths = ['/api/health', '/api/', '/api/shared'];
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
            console.log('[AUTH-DEBUG] Auth Header present but Supabase Client loading DISABLED for debugging 500 error.');
            // try {
            //    // Lazy load Supabase Client to reduce boot time
            //    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
            //    console.log('[AUTH-DEBUG] Supabase Client loaded');

            //    const supabaseClient = createClient(
            //        Deno.env.get('SUPABASE_URL') ?? '',
            //        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            //        { global: { headers: { Authorization: authHeader } } }
            //    )
            //    const { data, error } = await supabaseClient.auth.getUser()
            //    user = data?.user;
            //    console.log(`[AUTH-DEBUG] Supabase Auth: ${user ? 'found user ' + user.email : 'no user'}, error: ${error?.message || 'none'}`);
            // } catch (err: any) {
            //    console.error('[AUTH-DEBUG] Error loading/using Supabase Client:', err);
            // }

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
const apiRoutes = new Hono<{ Bindings: Env }>();

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
        timestamp: new Date().toISOString()
    }, dbStatus === 'connected' ? 200 : 503)
})

// --- SCALABLE LAZY LOADING ARCHITECTURE ---
const lazy = (importer: () => Promise<any>) => async (c: any) => {
    try {
        const { default: router } = await importer();
        return router.fetch(c.req.raw, c.env, c.executionCtx);
    } catch (e: any) {
        console.error(`Lazy Load Error (${c.req.path}):`, e);
        return c.json({
            error: 'Lazy Load Crash',
            details: e.message,
            stack: e.stack,
            path: c.req.path
        }, 500);
    }
};

// CHECKLIST ROUTING (Advanced Dispatch)
apiRoutes.all('/checklist/*', async (c) => {
    try {
        if (c.req.path.includes('/checklist/folders') || c.req.path.includes('/checklist/migrate-categories')) {
            const { default: router } = await import('./checklist-folders-routes.ts');
            return router.fetch(c.req.raw, c.env, c.executionCtx);
        }
        const { default: router } = await import('./checklist-routes.ts');
        return router.fetch(c.req.raw, c.env, c.executionCtx);
    } catch (e: any) {
        return c.json({ error: 'Lazy Load Error', details: e.message }, 500);
    }
});

// Explicit Lazy Routes
apiRoutes.all('/users/*', lazy(() => import('./users-routes.ts')));
apiRoutes.all('/organizations/*', lazy(() => import('./organizations-routes.ts')));
apiRoutes.all('/inspections/*', lazy(() => import('./inspection-routes.ts')));
apiRoutes.all('/dashboard/*', lazy(() => import('./dashboard-routes.ts')));
apiRoutes.all('/auth/*', lazy(() => import('./auth-routes.ts')));
apiRoutes.all('/ai-assistants/*', lazy(() => import('./ai-assistants-routes.ts')));
apiRoutes.all('/share/*', lazy(() => import('./share-routes.ts')));
apiRoutes.all('/notifications/*', lazy(() => import('./notifications-routes.ts')));
apiRoutes.all('/admin/*', lazy(() => import('./admin-approval-routes.ts')));
apiRoutes.all('/user-assignments/*', lazy(() => import('./user-assignment-routes.ts')));
apiRoutes.all('/multi-tenant/*', lazy(() => import('./multi-tenant-routes.ts')));
apiRoutes.all('/ai-usage/*', lazy(() => import('./ai-usage-routes.ts')));
apiRoutes.all('/system-admin/*', lazy(() => import('./system-admin-routes.ts')));
apiRoutes.all('/role-permissions/*', lazy(() => import('./role-permissions-routes.ts')));
apiRoutes.all('/cep/*', lazy(() => import('./cep-routes.ts')));
apiRoutes.all('/cnpj/*', lazy(() => import('./cnpj-routes.ts')));
apiRoutes.all('/inspection-items/*', lazy(() => import('./inspection-item-routes.ts')));
apiRoutes.all('/media/*', lazy(() => import('./media-routes.ts')));
apiRoutes.all('/gamification/*', lazy(() => import('./gamification-routes.ts')));
apiRoutes.all('/action-plans/*', lazy(() => import('./action-plans-routes.ts')));

// Alias action-items -> action-plans
apiRoutes.all('/action-items/*', async (c) => {
    try {
        const { default: router } = await import('./action-plans-routes.ts');
        const newUrl = c.req.url.replace('/action-items', '/action-plans');
        const newReq = new Request(newUrl, c.req.raw);
        return router.fetch(newReq, c.env, c.executionCtx);
    } catch (e: any) {
        return c.json({ error: 'Lazy Load Error', details: e.message }, 500);
    }
});

apiRoutes.all('/autosuggest/*', lazy(() => import('./autosuggest-routes.ts')));
apiRoutes.all('/ai-assistant/*', lazy(() => import('./ai-assistant-routes.ts')));
apiRoutes.all('/kanban/*', lazy(() => import('./kanban-routes.ts')));
apiRoutes.all('/audit/*', lazy(() => import('./audit-routes.ts')));
apiRoutes.all('/calendar/*', lazy(() => import('./calendar-routes.ts')));
apiRoutes.all('/calendar-settings/*', lazy(() => import('./calendar-settings-routes.ts')));
apiRoutes.all('/calendar-upload/*', lazy(() => import('./calendar-upload-routes.ts')));
apiRoutes.all('/integrations/*', lazy(() => import('./integrations-routes.ts')));
apiRoutes.all('/crm/*', lazy(() => import('./crm-routes.ts')));
apiRoutes.all('/financial/*', lazy(() => import('./financial-routes.ts')));
apiRoutes.all('/billing/*', lazy(() => import('./financial-routes.ts'))); // Alias
apiRoutes.all('/webhooks/asaas/*', lazy(() => import('./asaas-webhook.ts')));
apiRoutes.all('/commerce/*', lazy(() => import('./checkout-flow-v2.ts')));
apiRoutes.all('/system-commerce/*', lazy(() => import('./system-plans-routes.ts')));
apiRoutes.all('/leads/*', lazy(() => import('./lead-capture.ts')));
apiRoutes.all('/test-orgs/*', lazy(() => import('./test-orgs.ts')));

// PUBLIC ROUTES (Landing Page)
apiRoutes.get('/public-plans', async (c) => {
    try {
        const { results } = await c.env.DB.prepare("SELECT * FROM plans WHERE is_active = true AND is_public = true ORDER BY price_cents ASC").all();

        const plans = (results || []).map((p: any) => ({
            ...p,
            limits: typeof p.limits === 'string' ? JSON.parse(p.limits) : p.limits,
            features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
            addon_config: typeof p.addon_config === 'string' ? JSON.parse(p.addon_config) : p.addon_config,
            is_active: Boolean(p.is_active),
            is_public: Boolean(p.is_public)
        }));

        return c.json({ plans });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});


// [SEC-006] DEBUG ROUTE REMOVIDA - Gatekeeper 30/01/2026
// Endpoint expunha dados de uso de IA sem autenticação

// App principal monta o sub-app em dois lugares:
app.route('/', apiRoutes);
app.route('/api', apiRoutes);

// Explicit mounts for critical routes to ensure they work at root level if needed
// Or simply rely on the default route. 
// Given the user wants "Conserte", cleaner is better.
// The /financial, /organizations explicit mounts are redundant if apiRoutes handles them.

Deno.serve(app.fetch)

