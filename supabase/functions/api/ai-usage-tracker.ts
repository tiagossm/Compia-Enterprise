
/**
 * Shared helper for AI Usage Increment across all routes.
 * Centralizes logic for updating organization usage counts and logging events.
 */
export async function incrementAiUsage(
    db: any,
    userId: string,
    featureType: string,
    modelUsed: string,
    tokenCount: number = 0 // Default to 0 if not provided
): Promise<{ success: boolean; debug_org_id?: number | null; error?: string }> {
    try {
        // Safe userId extraction
        if (!userId) {
            console.error('[AI-USAGE-HELPER] No userId provided');
            return { success: false, error: 'no_user_id' };
        }

        console.log(`[AI-USAGE-HELPER] Incrementing for user: ${userId}, Feature: ${featureType}, Tokens: ${tokenCount}`);

        // Get User's Organization
        const userProfile = await db.prepare(
            "SELECT organization_id FROM users WHERE id = ?"
        ).bind(userId).first() as { organization_id?: number };

        if (!userProfile?.organization_id) {
            console.error('[AI-USAGE-HELPER] Organization ID not found for user:', userId);
            return { success: false, debug_org_id: null, error: 'org_not_found' };
        }

        const orgId = userProfile.organization_id;

        // Update Counter
        await db.prepare(
            "UPDATE organizations SET ai_usage_count = COALESCE(ai_usage_count, 0) + 1 WHERE id = ?"
        ).bind(orgId).run();

        // Insert Log
        try {
            await db.prepare(`
                INSERT INTO ai_usage_logs (organization_id, user_id, feature_type, model_used, total_tokens, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'success', ?)
            `).bind(orgId, userId, featureType, modelUsed, tokenCount, new Date().toISOString()).run();
        } catch (logErr) {
            console.warn('[AI-USAGE-HELPER] Log insertion failed (non-critical):', logErr);
            // Non-critical, but we log it.
        }

        return { success: true, debug_org_id: orgId, _trace: 'fixed-syntax' };

    } catch (err: any) {
        console.error('[AI-USAGE-HELPER] Critical failure:', err);
        return { success: false, error: err.message };
    }
}
