import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";

const gamificationRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Helper to calculate level based on XP
// Level = floor(sqrt(XP / 50)) + 1
function calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 50)) + 1;
}

// Helper to add XP (internal use)
export async function addXP(userId: string, amount: number, db: any) {
    try {
        // Get current stats
        const current = await db.prepare("SELECT current_xp, level FROM user_gamification WHERE user_id = ?").bind(userId).first();

        if (!current) {
            // Should exist due to seed, but handle case
            await db.prepare("INSERT INTO user_gamification (user_id, current_xp, points_this_month) VALUES (?, ?, ?)")
                .bind(userId, amount, amount).run();
            return { leveledUp: false, newLevel: 1 };
        }

        const newXP = (current.current_xp || 0) + amount;
        const newLevel = calculateLevel(newXP);
        const leveledUp = newLevel > (current.level || 1);

        // Update DB
        await db.prepare(`
            UPDATE user_gamification 
            SET current_xp = ?, 
            level = ?, 
            points_this_month = points_this_month + ?,
            updated_at = NOW()
            WHERE user_id = ?
        `).bind(newXP, newLevel, amount, userId).run();

        return { leveledUp, newLevel, xpEarned: amount };
    } catch (e) {
        console.error("Failed to add XP", e);
        return null;
    }
}

// Get My Gamification Stats
gamificationRoutes.get("/me", authMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");

    try {
        const stats = await env.DB.prepare(`
            SELECT ug.*, 
                (SELECT count(*) FROM user_achievements WHERE user_id = ug.user_id) as achievements_count
            FROM user_gamification ug 
            WHERE ug.user_id = ?
        `).bind(user.id).first();

        if (!stats) {
            // Initialize if missing (e.g. new user)
            await env.DB.prepare("INSERT INTO user_gamification (user_id) VALUES (?)").bind(user.id).run();
            return c.json({ current_xp: 0, level: 1, points_this_month: 0, achievements_count: 0 });
        }

        // Calculate next level progress
        const currentLevel = stats.level;
        const nextLevelStart = 50 * Math.pow(currentLevel, 2); // Inverse of sqrt(xp/50) -> xp = 50 * (level-1)^2 ? No, level = sqrt(xp/50)+1 => level-1 = sqrt(xp/50) => (level-1)^2 = xp/50 => xp = 50*(level-1)^2
        // Wait, calculateLevel(xp) = floor(sqrt(xp/50)) + 1.
        // XP for Level L: 50 * (L-1)^2.
        // XP for Level L+1: 50 * (L)^2.

        const currentLevelXPStart = 50 * Math.pow(stats.level - 1, 2);
        const nextLevelXPStart = 50 * Math.pow(stats.level, 2);

        const progress = {
            current: stats.current_xp,
            min: currentLevelXPStart,
            max: nextLevelXPStart,
            percentage: Math.min(100, Math.max(0, ((stats.current_xp - currentLevelXPStart) / (nextLevelXPStart - currentLevelXPStart)) * 100))
        };

        return c.json({ ...stats, progress });
    } catch (error) {
        console.error("Error fetching gamification stats:", error);
        return c.json({ error: "Failed to fetch stats" }, 500);
    }
});

// Get Leaderboard (Top 10 by Organization)
gamificationRoutes.get("/leaderboard", authMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");

    try {
        // Get user's org
        const userProfile = await env.DB.prepare("SELECT organization_id FROM users WHERE id = ?").bind(user.id).first();
        const orgId = userProfile?.organization_id;

        if (!orgId) return c.json({ leaderboard: [] });

        const leaderboard = await env.DB.prepare(`
            SELECT ug.user_id, ug.current_xp, ug.level, u.name, u.google_user_data
            FROM user_gamification ug
            JOIN users u ON ug.user_id = u.id
            WHERE u.organization_id = ?
            ORDER BY ug.current_xp DESC
            LIMIT 10
        `).bind(orgId).all();

        // Process avatars
        const processed = (leaderboard.results || []).map((entry: any) => {
            let avatar = null;
            try {
                if (entry.google_user_data) {
                    const data = JSON.parse(entry.google_user_data);
                    avatar = data.picture;
                }
            } catch (e) { }
            return {
                user_id: entry.user_id,
                name: entry.name,
                current_xp: entry.current_xp,
                level: entry.level,
                avatar_url: avatar
            };
        });

        return c.json({ leaderboard: processed });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return c.json({ error: "Failed to fetch leaderboard" }, 500);
    }
});

export default gamificationRoutes;
