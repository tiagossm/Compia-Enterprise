import { Hono } from "hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const gamificationRoutes = new Hono().basePath('/api/gamification');

// Helper to calculate next level threshold
// If Level = floor(sqrt(XP / 100)) + 1
// Then Level - 1 = floor(sqrt(XP / 100))
// Threshold for Level L (where L is current level) to reach L+1:
// L+1 = floor(sqrt(XP/100)) + 1 => L = floor(sqrt(XP/100))
// Minimal XP for Level L+1:
// (L)^2 * 100
function getNextLevelMinXP(currentLevel: number): number {
    // Current Level is L. We want to reach L+1.
    // The formula for Level L is floor(sqrt(XP/100)) + 1.
    // So to reach Level L+1, we need sqrt(XP/100) >= L.
    // XP/100 >= L^2
    // XP >= 100 * L^2
    return 100 * Math.pow(currentLevel, 2);
}

function getCurrentLevelMinXP(currentLevel: number): number {
    // To reach current Level L, we needed:
    // XP >= 100 * (L-1)^2
    return 100 * Math.pow(currentLevel - 1, 2);
}

// Get My Gamification Stats
gamificationRoutes.get("/me", async (c) => {
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = c.req.header("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader || "" } },
    });

    // 2. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    try {
        // 3. Fetch User Stats
        const { data: stats, error } = await supabase
            .from("user_gamification")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) throw error;

        let userGamification = stats;

        if (!userGamification) {
            // Initialize if missing
            const { data: newStats, error: createError } = await supabase
                .from("user_gamification")
                .insert({ user_id: user.id, current_xp: 0, level: 1 })
                .select()
                .single();

            if (createError) throw createError;
            userGamification = newStats;
        }

        // 4. Calculate Progress
        // We use the DB level as truth, but we need to verify if it matches formula just in case
        const currentLevel = userGamification.level || 1;
        const currentXP = userGamification.current_xp || 0;

        const xpStart = getCurrentLevelMinXP(currentLevel);
        const xpNext = getNextLevelMinXP(currentLevel);

        // Progress percentage within the level
        const totalToNext = xpNext - xpStart;
        const earnedInLevel = currentXP - xpStart;

        const percentage = Math.min(100, Math.max(0, (earnedInLevel / totalToNext) * 100));

        // 5. Get Achievements Count
        const { count: achievementsCount } = await supabase
            .from("user_achievements")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

        return c.json({
            ...userGamification,
            achievements_count: achievementsCount || 0,
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
gamificationRoutes.get("/leaderboard", async (c) => {
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = c.req.header("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
        // Get user's org
        const { data: userProfile } = await supabase
            .from("users")
            .select("organization_id")
            .eq("id", user.id)
            .single();

        const orgId = userProfile?.organization_id;
        if (!orgId) return c.json({ leaderboard: [] });

        // Fetch Leaderboard
        const { data: leaderboard, error } = await supabase
            .from("user_gamification")
            .select("user_id, current_xp, level, users(name, google_user_data)")
            .eq("users.organization_id", orgId) // We need a join logic or ensuring relation exists
            // Since Supabase join syntax depends on FK, assuming user_gamification.user_id -> users.id is valid
            // Explicit filter might be tricky if not set up, but let's try direct relation
            .order("current_xp", { ascending: false })
            .limit(10);

        if (error) {
            // If join fails (FK issue), simplistic approach:
            // 1. Get all users in org
            // 2. Get gamification for those users
            // But let's assume standard relation works if defined
            throw error;
        }

        // Need to filter by org manually if the join doesn't work perfectly in one go or
        // Use RPC if standard select is limited.
        // Safer approach with Supabase JS:
        // 1. Get users from org
        const { data: users } = await supabase
            .from("users")
            .select("id, name, google_user_data")
            .eq("organization_id", orgId);

        if (!users?.length) return c.json({ leaderboard: [] });

        const userIds = users.map(u => u.id);

        const { data: gamification } = await supabase
            .from("user_gamification")
            .select("user_id, current_xp, level")
            .in("user_id", userIds)
            .order("current_xp", { ascending: false })
            .limit(10);

        // Merge results
        const processed = (gamification || []).map((entry: any) => {
            const u = users.find(x => x.id === entry.user_id);
            let avatar = null;
            try {
                if (u?.google_user_data) {
                    const data = typeof u.google_user_data === 'string'
                        ? JSON.parse(u.google_user_data)
                        : u.google_user_data;
                    avatar = data.picture;
                }
            } catch (e) { }
            return {
                user_id: entry.user_id,
                name: u?.name || 'Unknown',
                current_xp: entry.current_xp,
                level: entry.level,
                avatar_url: avatar
            };
        });

        return c.json({ leaderboard: processed });

    } catch (error: any) {
        console.error("Error fetching leaderboard:", error);
        return c.json({ error: "Failed to fetch leaderboard", details: error.message }, 500);
    }
});

export default gamificationRoutes;
