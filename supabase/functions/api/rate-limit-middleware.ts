import { Context, Next } from 'hono';

/**
 * Rate Limit Middleware
 * Uses Postgres table `rate_limits` to track request counts using a sliding window strategy (simplified fixed window by expiry).
 * 
 * Strategy:
 * - Key: "user:{uuid}" or "ip:{ip_address}"
 * - Window: 60 seconds
 * - Fail-Open: If DB fails, allow request.
 */
export const rateLimitMiddleware = (reqPerMinute: number = 60) => {
    return async (c: Context, next: Next) => {
        const env = c.env as any;
        const db = env.DB;

        // Bypass checks if:
        // 1. DB not ready
        // 2. Request is OPTIONS (CORS preflight)
        if (!db || c.req.method === 'OPTIONS') {
            return next();
        }

        // 1. Identify Client
        const user = c.get('user');
        const ip = c.req.header('x-forwarded-for') || 'unknown';

        // Prioritize User ID, fallback to IP
        const key = user ? `user:${user.id}` : `ip:${ip}`;

        // Authenticated users get higher limit (5x base limit)
        // Public API (IP based): 60/min
        // User API (Token based): 300/min
        const effectiveLimit = user ? reqPerMinute * 5 : reqPerMinute;

        try {
            // 2. Upsert bucket in DB
            // Logic:
            // - If key exists and NOT expired: increment points
            // - If key exists and IS expired: reset points to 1, reset expiry
            // - If key does not exist: insert with points=1

            const now = new Date();
            const windowEnd = new Date(now.getTime() + 60000); // 1 minute window

            const query = `
                INSERT INTO rate_limits (key, points, expire_at)
                VALUES ($1, 1, $2)
                ON CONFLICT (key) DO UPDATE
                SET
                    points = CASE
                        WHEN rate_limits.expire_at < NOW() THEN 1
                        ELSE rate_limits.points + 1
                    END,
                    expire_at = CASE
                        WHEN rate_limits.expire_at < NOW() THEN $2
                        ELSE rate_limits.expire_at
                    END
                RETURNING points, expire_at;
            `;

            // Execute via D1 Wrapper
            const result = await db.prepare(query)
                .bind(key, windowEnd.toISOString())
                .first();

            if (result) {
                const points = result.points;
                const remaining = Math.max(0, effectiveLimit - points);

                // Set standard headers
                c.header('X-RateLimit-Limit', effectiveLimit.toString());
                c.header('X-RateLimit-Remaining', remaining.toString());
                c.header('X-RateLimit-Reset', result.expire_at);

                if (points > effectiveLimit) {
                    console.warn(`[RATE-LIMIT] Blocked ${key} (Points: ${points}/${effectiveLimit})`);
                    return c.json({
                        error: 'Too Many Requests',
                        message: 'Você excedeu o limite de requisições. O sistema possui proteção contra sobrecarga. Tente novamente em 1 minuto.'
                    }, 429);
                }
            }

        } catch (e) {
            console.error('[RATE-LIMIT] Error checking limits:', e);
            // Fail open: If rate limit DB fails, allow request to proceed to avoid downtime
        }

        await next();
    };
};
