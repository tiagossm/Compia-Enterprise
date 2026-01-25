import { createClient } from '@supabase/supabase-js';

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

        // Initialize Supabase Client
        // Ensure env contains necessary keys
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[AUDIT-LOG] Missing Supabase credentials in env');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase.from('activity_log').insert({
            user_id: params.userId,
            organization_id: params.orgId,
            action_type: params.actionType,
            action_description: params.actionDescription,
            target_type: params.targetType,
            target_id: String(params.targetId),
            metadata: metadataStr,
            ip_address: ip,
            user_agent: ua
            // created_at is handled by DB default
        });

        if (error) {
            console.error('[AUDIT-LOG] Insert error:', error);
        } else {
            console.log(`[AUDIT-LOG] Logged ${params.actionType} for ${params.targetType}:${params.targetId}`);
        }

    } catch (e) {
        console.error('[AUDIT-LOG] Failed to log activity:', e);
    }
}
