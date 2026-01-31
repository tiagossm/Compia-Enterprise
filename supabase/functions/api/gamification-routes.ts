import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";

/**
 * GAMIFICATION ROUTES
 * 
 * Refactored to use D1 Wrapper (postgres) and shared Auth Context.
 * Eliminates "401 Unauthorized" by trusting the tenantAuthMiddleware.
 */

// Exported function for other modules to add XP
export async function addXP(userId: string, xpAmount: number, db: any): Promise<void> {
    try {
        // Get current XP
        const current = await db.prepare(
            "SELECT current_xp, level FROM user_gamification WHERE user_id = ?"
        ).bind(userId).first();

        // If no gamification record, insert one
        if (!current) {
            await db.prepare(
                "INSERT INTO user_gamification (user_id, current_xp, level, points_this_month, created_at, updated_at) VALUES (?, ?, 1, 0, NOW(), NOW())"
            ).bind(userId, xpAmount).run();
            console.log(`[GAMIFICATION] Created profile for ${userId} with ${xpAmount}XP`);
            return;
        }

        const newXP = (current.current_xp || 0) + xpAmount;
        // Level formula: floor(sqrt(XP / 100)) + 1
        const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

        await db.prepare(
            "UPDATE user_gamification SET current_xp = ?, level = ?, updated_at = NOW() WHERE user_id = ?"
        ).bind(newXP, newLevel, userId).run();

        // Also update total_points in users table if needed (redundant but kept for legacy sync)
        await db.prepare(
            "UPDATE users SET total_points = COALESCE(total_points, 0) + ? WHERE id = ?"
        ).bind(xpAmount, userId).run();

        console.log(`[GAMIFICATION] User ${userId}: +${xpAmount}XP (total: ${newXP}, level: ${newLevel})`);
    } catch (error) {
        console.error('[GAMIFICATION] Error adding XP:', error);
    }
}

const gamificationRoutes = new Hono<{ Bindings: { DB: any }; Variables: { user: any } }>().basePath('/api/gamification');

// Helper to calculate next level threshold
function getNextLevelMinXP(currentLevel: number): number {
    // Threshold for Level L+1: 100 * L^2
    return 100 * Math.pow(currentLevel, 2);
}

function getCurrentLevelMinXP(currentLevel: number): number {
    // Threshold for current Level L: 100 * (L-1)^2
    return 100 * Math.pow(currentLevel - 1, 2);
}

// Get My Gamification Stats
gamificationRoutes.get("/me", tenantAuthMiddleware, async (c) => {
    const user = c.get("user") as any;
    const env = c.env;

    if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    try {
        // 1. Fetch User Stats from DB
        let userGamification = await env.DB.prepare(
            "SELECT * FROM user_gamification WHERE user_id = ?"
        ).bind(user.id).first();

        if (!userGamification) {
            // Initialize if missing
            await env.DB.prepare(
                "INSERT INTO user_gamification (user_id, current_xp, level, points_this_month, created_at, updated_at) VALUES (?, 0, 1, 0, NOW(), NOW())"
            ).bind(user.id).run();

            userGamification = { user_id: user.id, current_xp: 0, level: 1 };
        }

        // 2. Calculate Progress
        const currentLevel = userGamification.level || 1;
        const currentXP = userGamification.current_xp || 0;

        const xpStart = getCurrentLevelMinXP(currentLevel);
        const xpNext = getNextLevelMinXP(currentLevel);

        // Progress percentage within the level
        const totalToNext = xpNext - xpStart;
        const earnedInLevel = currentXP - xpStart;

        const percentage = totalToNext > 0
            ? Math.min(100, Math.max(0, (earnedInLevel / totalToNext) * 100))
            : 100;

        // 3. Get Achievements Count
        const achievementsResult = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?"
        ).bind(user.id).first();

        return c.json({
            ...userGamification,
            achievements_count: Number(achievementsResult?.count || 0),
            progress: {
                current: currentXP,
                min: xpStart,
                max: xpNext,
                percentage: Math.round(percentage)
            }
        });

    } catch (error: any) {
        console.error("Error fetching gamification stats:", error);
        return c.json({ error: "Failed to fetch stats", details: error.message }, 500);
    }
});

// Get Leaderboard (Top 10 by Organization)
gamificationRoutes.get("/leaderboard", tenantAuthMiddleware, async (c) => {
    const user = c.get("user") as any;
    const env = c.env;

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
        const orgId = user.organization_id; // Injected by tenantAuthMiddleware (confirmed logic)

        if (!orgId) return c.json({ leaderboard: [] });

        // Fetch Leaderboard with Join
        // Using direct SQL for efficiency
        const leaderboard = await env.DB.prepare(`
            SELECT 
                ug.user_id, 
                ug.current_xp, 
                ug.level, 
                u.name, 
                u.avatar_url
            FROM user_gamification ug
            JOIN users u ON ug.user_id = u.id
            WHERE u.organization_id = ?
            ORDER BY ug.current_xp DESC
            LIMIT 10
        `).bind(orgId).all();

        // Process results to format avatar
        const processed = (leaderboard.results || []).map((entry: any) => {
            return {
                user_id: entry.user_id,
                name: entry.name || 'Unknown',
                current_xp: entry.current_xp,
                level: entry.level,
                avatar_url: entry.avatar_url
            };
        });

        return c.json({ leaderboard: processed });

    } catch (error: any) {
        console.error("Error fetching leaderboard:", error);
        return c.json({ error: "Failed to fetch leaderboard", details: error.message }, 500);
    }
});

export default gamificationRoutes;
