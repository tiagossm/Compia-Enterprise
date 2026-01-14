import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { ExtendedMochaUser } from "./user-types.ts";

type Env = {
    DB: any;
};

const getDatabase = (env: any) => env.DB;

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /: List integrations status for the user/organization
app.get('/', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);

        const integrations = await db.prepare(`
            SELECT provider, created_at, expires_at 
            FROM integrations 
            WHERE user_id = ?
        `).bind(user.id).all();

        return c.json({
            google: integrations.results?.find((i: any) => i.provider === 'google') ? true : false,
            // outlook: ... later
        });
    } catch (error) {
        console.error('Error fetching integrations:', error);
        return c.json({ error: 'Erro ao buscar integrações' }, 500);
    }
});

// POST /google/authorize-url: Generate Google OAuth URL
app.post('/google/authorize-url', tenantAuthMiddleware, async (c) => {
    const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI'); // e.g. https://<project>.functions.supabase.co/api/integrations/google/callback OR frontend URL?
    // Usually frontend handles the redirect, but better to keep secrets on server. 
    // Flow: Frontend -> API (get URL) -> Frontend Redirects -> Google -> Frontend (Callback Page) -> API (Exchange Code)

    if (!CLIENT_ID || !REDIRECT_URI) {
        return c.json({ error: "Google Client ID/Redirect URI not configured" }, 500);
    }

    const SCOPES = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent`;

    return c.json({ url });
});

// POST /google/callback: Exchange code for token
app.post('/google/callback', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);
        const { code } = await c.req.json();

        const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
        const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI');

        if (!code || !CLIENT_ID || !CLIENT_SECRET) {
            return c.json({ error: "Missing code or config" }, 400);
        }

        // Exchange code
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            console.error('Google Token Error:', tokens);
            return c.json({ error: "Failed to exchange token", details: tokens }, 400);
        }

        // Get user profile for organization_id
        const userProfile = await db.prepare("SELECT organization_id FROM users WHERE id = ?").bind(user.id).first() as any;
        const orgId = userProfile?.organization_id;

        if (!orgId) return c.json({ error: "No organization" }, 400);

        // Calculate expiry
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Upsert integration
        await db.prepare(`
            INSERT INTO integrations (organization_id, user_id, provider, access_token, refresh_token, expires_at, scope, updated_at)
            VALUES (?, ?, 'google', ?, ?, ?, ?, NOW())
            ON CONFLICT(user_id, provider) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = COALESCE(excluded.refresh_token, integrations.refresh_token), -- Keep old refresh if new one not provided
                expires_at = excluded.expires_at,
                updated_at = NOW()
        `).bind(
            orgId, user.id,
            tokens.access_token,
            tokens.refresh_token || null,
            expiresAt.toISOString(),
            tokens.scope
        ).run();

        return c.json({ success: true });

    } catch (error) {
        console.error('Callback error:', error);
        return c.json({ error: "Internal error during callback" }, 500);
    }
});

// DELETE /google: Disconnect
app.delete('/google', tenantAuthMiddleware, async (c) => {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);

    await db.prepare("DELETE FROM integrations WHERE user_id = ? AND provider = 'google'").bind(user.id).run();

    return c.json({ success: true });
});

export default app;
