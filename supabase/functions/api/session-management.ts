/**
 * Session Management Middleware
 * 
 * Responsável por:
 * - Rastrear sessão ativa do usuário
 * - Invalidar sessões anteriores ao fazer novo login
 * - Detectar tentativas de login simultâneo
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@10.0.0';

/**
 * Gera um novo session_id único
 */
export function generateSessionId(): string {
    return uuidv4();
}

/**
 * Registra uma nova sessão para o usuário
 * Invalida todas as sessões anteriores
 */
export async function registerSession(
    supabaseAdmin: ReturnType<typeof createClient>,
    userId: string,
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
): Promise<boolean> {
    try {
        // Atualizar usuário com nova sessão
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                current_session_id: sessionId,
                last_login_at: new Date().toISOString(),
                last_login_ip: ipAddress,
                last_login_device: userAgent?.substring(0, 255), // Limitar tamanho
            })
            .eq('id', userId);

        if (error) {
            console.error('Error registering session:', error);
            return false;
        }

        // Logar a sessão para auditoria (opcional)
        await supabaseAdmin.from('session_log').insert({
            user_id: userId,
            session_id: sessionId,
            ip_address: ipAddress,
            user_agent: userAgent?.substring(0, 500),
            created_at: new Date().toISOString(),
        }).catch(() => {
            // Ignorar erro se tabela não existir
        });

        return true;
    } catch (error) {
        console.error('Error in registerSession:', error);
        return false;
    }
}

/**
 * Valida se a sessão atual ainda é válida
 * Retorna false se outra sessão foi iniciada
 */
export async function validateSession(
    supabaseAdmin: ReturnType<typeof createClient>,
    userId: string,
    currentSessionId: string
): Promise<{ valid: boolean; conflictDevice?: string }> {
    try {
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('current_session_id, last_login_device, last_login_at')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return { valid: true }; // Em caso de erro, permitir
        }

        // Se não tem sessão registrada ou é a sessão atual, é válida
        if (!user.current_session_id || user.current_session_id === currentSessionId) {
            return { valid: true };
        }

        // Sessão foi substituída por outra
        return {
            valid: false,
            conflictDevice: user.last_login_device || 'Outro dispositivo',
        };
    } catch (error) {
        console.error('Error validating session:', error);
        return { valid: true }; // Em caso de erro, permitir
    }
}

/**
 * Invalida a sessão atual (logout)
 */
export async function invalidateSession(
    supabaseAdmin: ReturnType<typeof createClient>,
    userId: string
): Promise<boolean> {
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                current_session_id: null,
            })
            .eq('id', userId);

        return !error;
    } catch (error) {
        console.error('Error invalidating session:', error);
        return false;
    }
}

/**
 * Middleware para validar sessão em cada requisição
 * Adiciona informações de validação ao contexto
 */
export function sessionValidationMiddleware() {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user?.id) {
            return next();
        }

        // Buscar session_id do header ou cookie
        const currentSessionId = c.req.header('X-Session-Id') ||
            c.req.cookie?.('session_id');

        if (!currentSessionId) {
            // Sem session_id, continuar sem validação
            // (será registrado no login)
            return next();
        }

        // Criar cliente Supabase admin
        const supabaseUrl = c.env?.SUPABASE_URL || Deno.env.get('SUPABASE_URL');
        const supabaseKey = c.env?.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            return next();
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        const validation = await validateSession(supabaseAdmin, user.id, currentSessionId);

        if (!validation.valid) {
            return c.json({
                error: 'Sessão inválida',
                code: 'SESSION_CONFLICT',
                message: `Outra sessão foi iniciada em: ${validation.conflictDevice}`,
                conflictDevice: validation.conflictDevice,
            }, 401);
        }

        c.set('sessionValid', true);
        await next();
    };
}

/**
 * Endpoint handler para registrar nova sessão após login
 */
export async function handleLoginSession(
    supabaseAdmin: ReturnType<typeof createClient>,
    userId: string,
    c: Context
): Promise<string> {
    const sessionId = generateSessionId();
    const userAgent = c.req.header('User-Agent');
    const ipAddress = c.req.header('X-Forwarded-For') ||
        c.req.header('X-Real-IP') ||
        'unknown';

    await registerSession(supabaseAdmin, userId, sessionId, userAgent, ipAddress);

    return sessionId;
}
