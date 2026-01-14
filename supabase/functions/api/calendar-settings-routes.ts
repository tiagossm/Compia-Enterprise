import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { ExtendedMochaUser, USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
};

const getDatabase = (env: any) => env.DB;

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Ensure table exists helper
async function ensureTableExists(db: any) {
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS calendar_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL UNIQUE,
        business_hours TEXT DEFAULT '{"start": "08:00", "end": "18:00", "days": [1,2,3,4,5]}',
        holidays TEXT DEFAULT '[]',
        timezone TEXT DEFAULT 'America/Sao_Paulo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

    // Index on organization_id for performance
    try {
        await db.prepare(`CREATE INDEX IF NOT EXISTS idx_calendar_settings_org ON calendar_settings(organization_id)`).run();
    } catch (e) {
        // Ignore if index creation fails (might be duplicate name error but IF NOT EXISTS handles most)
    }
}

// Get Settings
app.get('/', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);

        // Ensure table exists on first access
        await ensureTableExists(db);

        // Get user profile
        const userProfile = await db.prepare("SELECT organization_id, managed_organization_id FROM users WHERE id = ?").bind(user.id).first() as any;
        if (!userProfile) return c.json({ error: "User not found" }, 404);

        const orgId = userProfile.managed_organization_id || userProfile.organization_id;

        const settings = await db.prepare("SELECT * FROM calendar_settings WHERE organization_id = ?").bind(orgId).first() as any;

        if (!settings) {
            // Return defaults if no settings exist
            return c.json({
                organization_id: orgId,
                business_hours: { start: "08:00", end: "18:00", days: [1, 2, 3, 4, 5] },
                holidays: [],
                timezone: 'America/Sao_Paulo'
            });
        }

        return c.json({
            ...settings,
            business_hours: JSON.parse(settings.business_hours || '{}'),
            holidays: JSON.parse(settings.holidays || '[]')
        });

    } catch (error) {
        console.error('Error fetching calendar settings:', error);
        return c.json({ error: 'Erro ao buscar configurações' }, 500);
    }
});

// Update Settings
app.put('/', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);

        // Ensure table permissions
        // Only Org Admin or System Admin should update settings
        const userProfile = await db.prepare("SELECT organization_id, managed_organization_id, role FROM users WHERE id = ?").bind(user.id).first() as any;

        if (!userProfile) return c.json({ error: "User not found" }, 404);

        const orgId = userProfile.managed_organization_id || userProfile.organization_id;

        if (userProfile.role !== USER_ROLES.ORG_ADMIN && userProfile.role !== USER_ROLES.SYSTEM_ADMIN && userProfile.role !== 'sys_admin') {
            // Allow update if user manages this org
            if (!userProfile.managed_organization_id || userProfile.managed_organization_id !== orgId) {
                return c.json({ error: "Permissão negada. Apenas administradores podem alterar configurações." }, 403);
            }
        }

        await ensureTableExists(db);

        const body = await c.req.json();
        const { business_hours, holidays, timezone } = body;

        // Upsert logic
        const existing = await db.prepare("SELECT id FROM calendar_settings WHERE organization_id = ?").bind(orgId).first();

        if (existing) {
            await db.prepare(`
                UPDATE calendar_settings 
                SET business_hours = ?, holidays = ?, timezone = ?, updated_at = datetime('now')
                WHERE organization_id = ?
            `).bind(
                JSON.stringify(business_hours),
                JSON.stringify(holidays),
                timezone,
                orgId
            ).run();
        } else {
            await db.prepare(`
                INSERT INTO calendar_settings (organization_id, business_hours, holidays, timezone)
                VALUES (?, ?, ?, ?)
            `).bind(
                orgId,
                JSON.stringify(business_hours),
                JSON.stringify(holidays),
                timezone
            ).run();
        }

        return c.json({ message: "Configurações atualizadas com sucesso" });

    } catch (error) {
        console.error('Error updating calendar settings:', error);
        return c.json({ error: 'Erro ao atualizar configurações' }, 500);
    }
});

export default app;
