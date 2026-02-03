import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createLogger } from './shared/logger.ts'
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
const log = createLogger('api')

// GLOBAL ERROR HANDLER (Sentinela Security Pattern)
app.onError((err, c) => {
    log.error('GLOBAL-ERROR Uncaught exception', err);

    // Fail Secure: Não vazar stack trace em produção
    const isDev = Deno.env.get('ENVIRONMENT') === 'development';

    const response: Record<string, unknown> = {
        error: "Internal Server Error",
        message: isDev ? (err.message || "Ocorreu um erro interno (DEBUG MODE).") : "Internal Server Error",
        code: "INTERNAL_ERROR",
        env_check: {
            is_dev: isDev,
            has_db: !!c.env?.DB
        }
    };

    if (isDev) {
        response.stack = err.stack;
    }

    return c.json(response, 500);
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
        const allowedFromEnv = (Deno.env.get('ALLOWED_ORIGINS') || '')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
        const allowedOrigins = [...allowed, ...allowedFromEnv];

        if (origin && allowedOrigins.includes(origin)) {
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
        try {
            // Lazy load D1 Wrapper (Postgres driver) to reduce boot time
            // console.log('[DB-DEBUG] Lazy loading d1-wrapper...');
            const { createD1Wrapper } = await import('./d1-wrapper.ts');
            // @ts-ignore
            c.env.DB = createD1Wrapper(dbUrl)
            // console.log('[DB-DEBUG] DB Wrapper initialized');
        } catch (dbErr: any) {
            log.error('DB-DEBUG Failed to lazy load DB wrapper', dbErr);
        }
    } else {
        log.warn('DB-DEBUG No SUPABASE_DB_URL found');
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

    // Normalização robusta do path para Supabase Edge Functions
    const url = new URL(c.req.url);
    const rawPath = url.pathname;
    const path = rawPath.replace('/functions/v1', ''); // Remove prefixo padrão do Supabase se existir

    log.debug(`AUTH-DEBUG Request: ${c.req.method} ${path} (raw: ${rawPath})`);

    // Rotas públicas que não precisam de autenticação
    const publicPaths = [
        '/api/health',
        '/api/',
        '/api/shared',
        '/api/public-plans', // CORREÇÃO: Adicionada rota de planos públicos
        '/api/auth/callback' // Garantir callback
    ];

    // Verificação flexível (exact match ou prefixo)
    const isPublicRoute = publicPaths.some(p => path === p || path.startsWith(p + '/'));

    // --- RATE LIMIT GLOBAL ---
    // Aplica rate limit O MAIS CEDO POSSÍVEL (antes de rotas públicas)
    // Usa env.DB (d1-wrapper)
    if (c.env.DB) {
        try {
            const { rateLimitMiddleware } = await import('./rate-limit-middleware.ts');

            // Re-instantiate middleware function
            const limiter = rateLimitMiddleware(60); // 60 req/min base

            let passed = false;
            const mockNext = async () => { passed = true; };

            const response = await limiter(c, mockNext);

            // If limiter returned a response (429), return it and stop chain
            if (response instanceof Response) {
                return response;
            }
        } catch (rlError) {
            log.error('RATE-LIMIT Failed to load/exec middleware', rlError);
        }
    }
    // -------------------------

    if (isPublicRoute) {
        log.debug(`AUTH-DEBUG Public route, skipping auth: ${path}`);
        await next();
        return;
    }

    // Verificar se já tem user (algumas rotas públicas não precisam)
    if (!c.get('user')) {
        let user = null;

        // 1. Primeiro, tentar via Supabase Auth (para Google login)
        const authHeader = c.req.header('Authorization');
        log.debug(`AUTH-DEBUG Authorization header: ${authHeader ? 'present (' + authHeader.substring(0, 30) + '...)' : 'absent'}`);

        if (authHeader) {
            log.debug('AUTH-DEBUG Lazy loading Supabase Client...');
            try {
                // Lazy load Supabase Client to reduce boot time
                const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
                log.debug('AUTH-DEBUG Supabase Client loaded');

                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                    { global: { headers: { Authorization: authHeader } } }
                )
                const { data, error } = await supabaseClient.auth.getUser()
                user = data?.user;
                log.debug(`AUTH-DEBUG Supabase Auth: ${user ? 'found user ' + user.email : 'no user'}, error: ${error?.message || 'none'}`);
            } catch (err: any) {
                log.error('AUTH-DEBUG Error loading/using Supabase Client', err);
            }

            // AUTO-SYNC: If user from Supabase Auth doesn't exist in DB, create them
            if (user && user.email && c.env?.DB) {
                const existingDbUser = await c.env.DB.prepare("SELECT id, role FROM users WHERE id = ? OR email = ?").bind(user.id, user.email).first();
                if (!existingDbUser) {
                    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
                    log.info(`AUTH-DEBUG Creating new user in DB for Google user: ${user.email}`);
                    try {
                        await c.env.DB.prepare(`
                            INSERT INTO users (id, email, name, role, is_active, approval_status, created_at, updated_at)
                            VALUES (?, ?, ?, 'inspector', true, 'pending', NOW(), NOW())
                        `).bind(user.id, user.email, userName).run();
                        log.info(`AUTH-DEBUG Created new user: ${user.email} with pending approval`);
                    } catch (insertError) {
                        log.error('AUTH-DEBUG Error creating user', insertError);
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
            log.debug(`AUTH-DEBUG Cookie session: ${sessionMatch ? 'found token' : 'no token'}`);
            if (sessionMatch) {
                const sessionToken = sessionMatch[1];
                const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
                if (sessionToken && sessionToken.startsWith('dev-session-') && isDevelopment) {
                    const userId = sessionToken.replace('dev-session-', '');
                    // Buscar usuário no DB
                    if (c.env?.DB) {
                        const dbUser = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
                        log.debug(`AUTH-DEBUG Cookie user lookup: ${dbUser ? 'found ' + (dbUser as any).email : 'not found'}`);
                        if (dbUser) {
                            user = {
                                id: (dbUser as any).id,
                                email: (dbUser as any).email,
                                role: (dbUser as any).role,
                                user_metadata: { name: (dbUser as any).name }
                            };
                        }
                    }
                } else if (sessionToken && sessionToken.startsWith('dev-session-') && !isDevelopment) {
                    log.warn('AUTH-DEBUG BLOQUEADO: Tentativa de usar dev-session em produção');
                }
            }
        }

        log.debug(`[AUTH-DEBUG] Final user: ${user ? (user as any).email + ' (role: ' + (user as any).role + ')' : 'NONE'}`);
        c.set('user', user)
    } else {
        log.debug(`[AUTH-DEBUG] User already in context: ${(c.get('user') as any)?.email}`);
    }

    await next()
})

// Criar sub-app para as rotas da API
const apiRoutes = new Hono<{ Bindings: Env }>();

// Middleware para propagar contexto de autenticação do app pai para o sub-app
apiRoutes.use('*', async (c, next) => {
    // O contexto já foi preenchido pelo middleware do app principal
    // Mas precisamos garantir que o user está acessível
    log.debug(`[SUBROUTES] Path: ${c.req.path}, User in context: ${c.get('user') ? (c.get('user') as any).email : 'NONE'}`);
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

// SMOKE TEST ROUTE
apiRoutes.get('/smoke-test', (c) => {
    return c.json({
        status: 'alive',
        message: 'Routing is working',
        timestamp: new Date().toISOString()
    });
});

// --- SCALABLE LAZY LOADING ARCHITECTURE ---
const lazy = (importer: () => Promise<any>) => async (c: any) => {
    try {
        const { default: router } = await importer();
        // SAFE ACCESS: c.executionCtx throws if undefined in Hono
        let executionCtx = undefined;
        try {
            executionCtx = c.executionCtx;
        } catch { }

        return router.fetch(c.req.raw, c.env, executionCtx);
    } catch (e: any) {
        log.error(`Lazy Load Error (${c.req.path})`, e);
        return c.json({
            error: 'Lazy Load Crash',
            details: e.message,
            path: c.req.path,
            ...(isDev ? { stack: e.stack } : {})
        }, 500);
    }
};

// CHECKLIST ROUTING (Advanced Dispatch)
apiRoutes.all('/checklist/*', async (c) => {
    try {
        // Safe access to executionCtx (may not exist in Supabase Edge)
        let executionCtx = undefined;
        try {
            executionCtx = c.executionCtx;
        } catch { }

        if (c.req.path.includes('/checklist/folders') || c.req.path.includes('/checklist/migrate-categories') || c.req.path.includes('/checklist/tree')) {
            const { default: router } = await import('./checklist-folders-routes.ts');
            return router.fetch(c.req.raw, c.env, executionCtx);
        }
        const { default: router } = await import('./checklist-routes.ts');
        return router.fetch(c.req.raw, c.env, executionCtx);
    } catch (e: any) {
        log.error('LazyLoad Checklist Route Error', e);
        return c.json({ error: 'Lazy Load Error', details: e.message, ...(isDev ? { stack: e.stack } : {}) }, 500);
    }
});

const isDev = Deno.env.get('ENVIRONMENT') === 'development';

// DEBUG ROUTES (temporary for troubleshooting)
if (isDev) {
    apiRoutes.all('/debug/*', lazy(() => import('./debug-checklist.ts')));
}

// Explicit Lazy Routes
apiRoutes.all('/users', lazy(() => import('./users-routes.ts')));
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
        // Safe access to executionCtx
        let executionCtx = undefined;
        try {
            executionCtx = c.executionCtx;
        } catch { }

        const { default: router } = await import('./action-plans-routes.ts');
        const newUrl = c.req.url.replace('/action-items', '/action-plans');
        const newReq = new Request(newUrl, c.req.raw);
        return router.fetch(newReq, c.env, executionCtx);
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
apiRoutes.all('/test/*', lazy(() => import('./test-rls-routes.ts'))); // RLS Testing Routes

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


// TEMPORARY DEBUG ROUTE
if (isDev) {
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
}

// App principal monta o sub-app em dois lugares:
app.route('/', apiRoutes);
app.route('/api', apiRoutes);

// Explicit mounts for critical routes to ensure they work at root level if needed
// Or simply rely on the default route. 
// Given the user wants "Conserte", cleaner is better.
// The /financial, /organizations explicit mounts are redundant if apiRoutes handles them.

Deno.serve(app.fetch)

