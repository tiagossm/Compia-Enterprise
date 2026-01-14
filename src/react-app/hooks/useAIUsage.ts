import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AIUsage {
    currentUsage: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    resetDate: string;
    subscriptionTier: string;
    isAtLimit: boolean;
    isNearLimit: boolean;
}

interface UseAIUsageReturn {
    usage: AIUsage | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Hook para buscar e monitorar o uso de IA da organização
 * Retorna informações sobre uso atual, limite e status
 */
export function useAIUsage(): UseAIUsageReturn {
    const { user } = useAuth();
    const [usage, setUsage] = useState<AIUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get organization_id from user profile (cast to any since type may vary)
    const organizationId = (user as any)?.organization_id || (user as any)?.profile?.organization_id;

    const fetchUsage = useCallback(async () => {
        if (!organizationId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('organizations')
                .select('ai_usage_count, ai_limit, ai_reset_date, subscription_tier')
                .eq('id', organizationId)
                .single();

            if (fetchError) {
                throw fetchError;
            }

            if (data) {
                const currentUsage = data.ai_usage_count || 0;
                const limit = data.ai_limit || 100;
                const remaining = Math.max(0, limit - currentUsage);
                const percentUsed = Math.round((currentUsage / limit) * 100);

                setUsage({
                    currentUsage,
                    limit,
                    remaining,
                    percentUsed,
                    resetDate: data.ai_reset_date,
                    subscriptionTier: data.subscription_tier || 'starter',
                    isAtLimit: currentUsage >= limit,
                    isNearLimit: percentUsed >= 80 && percentUsed < 100,
                });
            }
        } catch (err) {
            console.error('Error fetching AI usage:', err);
            setError('Não foi possível carregar informações de uso');
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);

    // Atualizar quando organização mudar
    useEffect(() => {
        if (organizationId) {
            fetchUsage();
        }
    }, [organizationId, fetchUsage]);

    return {
        usage,
        loading,
        error,
        refresh: fetchUsage,
    };
}

/**
 * Hook para verificar configurações globais do sistema
 */
export function useSystemSettings() {
    const [settings, setSettings] = useState<{
        aiEnabled: boolean;
        gamificationEnabled: boolean;
        aiPrimaryProvider: string;
        aiFallbackEnabled: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('*')
                    .eq('id', 'global')
                    .single();

                if (error) throw error;

                if (data) {
                    setSettings({
                        aiEnabled: data.ai_enabled ?? true,
                        gamificationEnabled: data.gamification_enabled ?? true,
                        aiPrimaryProvider: data.ai_primary_provider ?? 'gemini',
                        aiFallbackEnabled: data.ai_fallback_enabled ?? true,
                    });
                }
            } catch (err) {
                console.error('Error fetching system settings:', err);
                // Usar defaults em caso de erro
                setSettings({
                    aiEnabled: true,
                    gamificationEnabled: true,
                    aiPrimaryProvider: 'gemini',
                    aiFallbackEnabled: true,
                });
            } finally {
                setLoading(false);
            }
        }

        fetchSettings();
    }, []);

    return { settings, loading };
}

export default useAIUsage;
