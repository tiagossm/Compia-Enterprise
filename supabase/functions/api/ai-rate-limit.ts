/**
 * AI Rate Limiting Middleware and Utility Functions
 * 
 * Responsável por:
 * - Verificar limite de uso de IA por organização
 * - Incrementar contador após uso
 * - Logar uso para auditoria e billing
 * - Resetar contador mensalmente
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Context, Next } from 'hono';

interface AIUsageResult {
    allowed: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    resetDate: string;
    percentUsed: number;
}

interface LogAIUsageParams {
    organizationId: string;
    userId: string;
    featureType: 'analysis' | 'action_plan' | 'transcription' | 'chat';
    modelUsed: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    responseTimeMs?: number;
    status?: 'success' | 'error' | 'timeout';
    errorMessage?: string;
    inspectionId?: string;
}

/**
 * Verifica se a organização ainda tem uso de IA disponível
 * Retorna informações sobre o uso atual
 */
export async function checkAIUsage(
    supabaseAdmin: ReturnType<typeof createClient>,
    organizationId: string
): Promise<AIUsageResult & {
    alert_50_sent: boolean;
    alert_80_sent: boolean;
    alert_100_sent: boolean;
}> {
    // Buscar dados da organização
    const { data: org, error } = await supabaseAdmin
        .from('organizations')
        .select('ai_usage_count, ai_limit, ai_reset_date, subscription_tier, alert_50_sent, alert_80_sent, alert_100_sent')
        .eq('id', organizationId)
        .single();

    if (error || !org) {
        console.error('Error fetching organization AI usage:', error);
        return {
            allowed: false,
            currentUsage: 0,
            limit: 0,
            remaining: 0,
            resetDate: '',
            percentUsed: 100,
            alert_50_sent: false,
            alert_80_sent: false,
            alert_100_sent: false
        };
    }

    // Verificar se precisa resetar (novo mês)
    const today = new Date();
    const resetDate = new Date(org.ai_reset_date);

    if (today >= resetDate) {
        // Resetar contador e atualizar data de reset
        const nextReset = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        await supabaseAdmin
            .from('organizations')
            .update({
                ai_usage_count: 0,
                ai_reset_date: nextReset.toISOString().split('T')[0],
                alert_50_sent: false, // Reset alerts
                alert_80_sent: false,
                alert_100_sent: false
            })
            .eq('id', organizationId);

        org.ai_usage_count = 0;
        org.ai_reset_date = nextReset.toISOString().split('T')[0];
        org.alert_50_sent = false;
        org.alert_80_sent = false;
        org.alert_100_sent = false;
    }

    const currentUsage = org.ai_usage_count || 0;
    const limit = org.ai_limit || 100;
    const remaining = Math.max(0, limit - currentUsage);
    const percentUsed = Math.round((currentUsage / limit) * 100);

    return {
        allowed: currentUsage < limit,
        currentUsage,
        limit,
        remaining,
        resetDate: org.ai_reset_date,
        percentUsed,
        alert_50_sent: org.alert_50_sent || false,
        alert_80_sent: org.alert_80_sent || false,
        alert_100_sent: org.alert_100_sent || false,
    };
}

/**
 * Incrementa o contador de uso de IA da organização
 * Deve ser chamado APÓS uso bem-sucedido da IA
 */
export async function incrementAIUsage(
    supabaseAdmin: ReturnType<typeof createClient>,
    organizationId: string
): Promise<boolean> {
    const { error } = await supabaseAdmin.rpc('increment_ai_usage', {
        org_id: organizationId,
    });

    // Se a função RPC não existir, fazer update direto
    if (error && error.code === 'PGRST202') {
        const { error: updateError } = await supabaseAdmin
            .from('organizations')
            .update({
                ai_usage_count: supabaseAdmin.rpc('coalesce', {
                    value1: 'ai_usage_count + 1',
                    value2: 1
                }),
            })
            .eq('id', organizationId);

        // Fallback: update direto com SQL
        if (updateError) {
            // Buscar valor atual e incrementar
            const { data: org } = await supabaseAdmin
                .from('organizations')
                .select('ai_usage_count')
                .eq('id', organizationId)
                .single();

            await supabaseAdmin
                .from('organizations')
                .update({ ai_usage_count: (org?.ai_usage_count || 0) + 1 })
                .eq('id', organizationId);
        }
    }

    return !error;
}

/**
 * Loga o uso de IA para auditoria e billing
 */
export async function logAIUsage(
    supabaseAdmin: ReturnType<typeof createClient>,
    params: LogAIUsageParams
): Promise<void> {
    try {
        await supabaseAdmin.from('ai_usage_log').insert({
            organization_id: params.organizationId,
            user_id: params.userId,
            inspection_id: params.inspectionId,
            feature_type: params.featureType,
            model_used: params.modelUsed,
            input_tokens: params.inputTokens || 0,
            output_tokens: params.outputTokens || 0,
            cost_usd: params.costUsd || 0,
            response_time_ms: params.responseTimeMs || 0,
            status: params.status || 'success',
            error_message: params.errorMessage,
        });
    } catch (error) {
        console.error('Error logging AI usage:', error);
        // Não falhar por causa do log
    }
}

/**
 * Verifica e incrementa uso de IA em uma única operação
 * Retorna se a operação é permitida
 */
export async function checkAndIncrementAIUsage(
    supabaseAdmin: ReturnType<typeof createClient>,
    organizationId: string,
    userId: string,
    featureType: LogAIUsageParams['featureType'] = 'analysis'
): Promise<{ allowed: boolean; usage: AIUsageResult }> {
    const usage = await checkAIUsage(supabaseAdmin, organizationId);

    if (!usage.allowed) {
        // Logar tentativa bloqueada
        await logAIUsage(supabaseAdmin, {
            organizationId,
            userId,
            featureType,
            modelUsed: 'blocked',
            status: 'error',
            errorMessage: 'Limite de uso de IA atingido',
        });
    }

    return { allowed: usage.allowed, usage };
}

/**
 * Busca configurações do sistema
 */
export async function getSystemSettings(
    supabaseAdmin: ReturnType<typeof createClient>
): Promise<{
    aiEnabled: boolean;
    aiPrimaryProvider: string;
    aiBackupProvider: string;
    aiFallbackEnabled: boolean;
    gamificationEnabled: boolean;
}> {
    const { data, error } = await supabaseAdmin
        .from('system_settings')
        .select('*')
        .eq('id', 'global')
        .single();

    if (error || !data) {
        // Retornar defaults
        return {
            aiEnabled: true,
            aiPrimaryProvider: 'gemini',
            aiBackupProvider: 'openai',
            aiFallbackEnabled: true,
            gamificationEnabled: true,
        };
    }

    return {
        aiEnabled: data.ai_enabled ?? true,
        aiPrimaryProvider: data.ai_primary_provider ?? 'gemini',
        aiBackupProvider: data.ai_backup_provider ?? 'openai',
        aiFallbackEnabled: data.ai_fallback_enabled ?? true,
        gamificationEnabled: data.gamification_enabled ?? true,
    };
}

/**
 * Middleware de rate limiting para rotas de IA
 * Adiciona informações de uso ao contexto
 */
export function aiRateLimitMiddleware(featureType: LogAIUsageParams['featureType'] = 'analysis') {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            return c.json({ error: 'Usuário não autenticado' }, 401);
        }

        const organizationId = user.organization_id;

        if (!organizationId) {
            return c.json({ error: 'Usuário não associado a uma organização' }, 400);
        }

        // Criar cliente Supabase admin
        const supabaseUrl = c.env?.SUPABASE_URL || Deno.env.get('SUPABASE_URL');
        const supabaseKey = c.env?.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase credentials not configured');
            return next(); // Continuar sem rate limiting se não configurado
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // Verificar configurações do sistema
        const settings = await getSystemSettings(supabaseAdmin);

        if (!settings.aiEnabled) {
            return c.json({
                error: 'Serviço de IA temporariamente desabilitado pelo administrador',
                code: 'AI_DISABLED'
            }, 503);
        }

        // Verificar uso
        const { allowed, usage } = await checkAndIncrementAIUsage(
            supabaseAdmin,
            organizationId,
            user.id,
            featureType
        );

        // Adicionar informações ao contexto
        c.set('aiUsage', usage);
        c.set('supabaseAdmin', supabaseAdmin);
        c.set('systemSettings', settings);

        if (!allowed) {
            return c.json({
                error: 'Limite de análises de IA atingido para este mês',
                code: 'AI_LIMIT_REACHED',
                usage: {
                    current: usage.currentUsage,
                    limit: usage.limit,
                    resetDate: usage.resetDate,
                },
                upgrade: {
                    message: 'Faça upgrade do seu plano para mais análises',
                    url: '/settings/subscription',
                }
            }, 429);
        }

        // Adicionar headers de rate limit na resposta
        await next();

        // Após a resposta, adicionar headers
        c.header('X-RateLimit-Limit', usage.limit.toString());
        c.header('X-RateLimit-Remaining', usage.remaining.toString());
        c.header('X-RateLimit-Reset', usage.resetDate);
    };
}

async function sendAlertEmail(
    organizationId: string,
    threshold: number,
    currentUsage: number,
    limit: number
) {
    console.log(`[ALERT] Organization ${organizationId} reached ${threshold}% usage (${currentUsage}/${limit})`);
    // TODO: Implement actual email sending via SendGrid/Resend
    // Example: fetch('https://api.resend.com/emails', ...)
}

/**
 * Após uso bem-sucedido de IA, finaliza o log e incrementa contador
 */
export async function finalizeAIUsage(
    supabaseAdmin: ReturnType<typeof createClient>,
    organizationId: string,
    params: Omit<LogAIUsageParams, 'organizationId'>
): Promise<void> {
    // Incrementar contador
    await incrementAIUsage(supabaseAdmin, organizationId);

    // Check for alerts
    try {
        const usageData = await checkAIUsage(supabaseAdmin, organizationId);
        const { percentUsed, alert_50_sent, alert_80_sent, alert_100_sent } = usageData;

        let alertToSend = 0;
        let startCondition = false;

        if (percentUsed >= 100 && !alert_100_sent) {
            alertToSend = 100;
        } else if (percentUsed >= 80 && !alert_80_sent) {
            alertToSend = 80;
        } else if (percentUsed >= 50 && !alert_50_sent) {
            alertToSend = 50;
        }

        if (alertToSend > 0) {
            await sendAlertEmail(organizationId, alertToSend, usageData.currentUsage, usageData.limit);

            // Update flag
            const updateData: any = {};
            if (alertToSend === 50) updateData.alert_50_sent = true;
            if (alertToSend === 80) updateData.alert_80_sent = true;
            if (alertToSend === 100) updateData.alert_100_sent = true;

            await supabaseAdmin
                .from('organizations')
                .update(updateData)
                .eq('id', organizationId);
        }
    } catch (e) {
        console.error('Error checking usage alerts:', e);
    }

    // Logar uso
    await logAIUsage(supabaseAdmin, {
        ...params,
        organizationId,
    });
}
