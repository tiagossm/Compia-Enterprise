
export async function logActivity(env: any, params: {
    userId: string | number,
    orgId: string | number | null,
    actionType: string,
    actionDescription: string,
    targetType: string,
    targetId: string | number | null,
    metadata?: any,
    req?: any
}) {
    try {
        const ip = params.req?.header('cf-connecting-ip') || params.req?.header('x-forwarded-for') || 'unknown';
        const ua = params.req?.header('user-agent') || 'unknown';

        // Ensure metadata is stringified if object
        const metadataStr = params.metadata ?
            (typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata))
            : null;

        await env.DB.prepare(`
        INSERT INTO activity_log (
            user_id, organization_id, action_type, action_description, 
            target_type, target_id, metadata, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `).bind(
            params.userId,
            params.orgId,
            params.actionType,
            params.actionDescription,
            params.targetType,
            params.targetId,
            metadataStr,
            ip,
            ua
        ).run();

        console.log(`[AUDIT-LOG] Logged ${params.actionType} for ${params.targetType}:${params.targetId}`);
    } catch (e) {
        console.error('[AUDIT-LOG] Failed to log activity:', e);
    }
}
