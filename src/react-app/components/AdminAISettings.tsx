import React, { useState, useEffect } from 'react';
import {
    Settings,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Power,
    Server,
    Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemSettings {
    ai_enabled: boolean;
    ai_primary_provider: string;
    ai_backup_provider: string;
    ai_fallback_enabled: boolean;
    gamification_enabled: boolean;
    updated_at: string;
}

interface AIProviderStatus {
    name: string;
    status: 'online' | 'offline' | 'checking';
    latency?: number;
}

/**
 * Componente de configurações de IA para o painel de administração
 * Permite ativar/desativar IA, escolher provedores e ver status
 */
export const AdminAISettings: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [providers, setProviders] = useState<AIProviderStatus[]>([
        { name: 'Gemini Flash', status: 'checking' },
        { name: 'OpenAI GPT-4o-mini', status: 'checking' },
    ]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Buscar configurações atuais
    useEffect(() => {
        fetchSettings();
        checkProviderStatus();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .eq('id', 'global')
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Não foi possível carregar as configurações');
        } finally {
            setLoading(false);
        }
    };

    // Verificar status dos provedores
    const checkProviderStatus = async () => {
        // Simular verificação de status (em produção, fazer ping real)
        setProviders([
            { name: 'Gemini Flash', status: 'checking' },
            { name: 'OpenAI GPT-4o-mini', status: 'checking' },
        ]);

        // Simular delay de verificação
        setTimeout(() => {
            setProviders([
                { name: 'Gemini Flash', status: 'online', latency: 230 },
                { name: 'OpenAI GPT-4o-mini', status: 'online', latency: 180 },
            ]);
        }, 1500);
    };

    // Salvar configurações
    const saveSettings = async (updates: Partial<SystemSettings>) => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const { error } = await supabase
                .from('system_settings')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', 'global');

            if (error) throw error;

            setSettings(prev => prev ? { ...prev, ...updates } : null);
            setSuccess('Configurações salvas com sucesso');

            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            setError('Não foi possível salvar as configurações');
        } finally {
            setSaving(false);
        }
    };

    // Toggle IA on/off
    const toggleAI = () => {
        if (!settings) return;
        saveSettings({ ai_enabled: !settings.ai_enabled });
    };

    // Toggle fallback
    const toggleFallback = () => {
        if (!settings) return;
        saveSettings({ ai_fallback_enabled: !settings.ai_fallback_enabled });
    };

    // Toggle gamificação
    const toggleGamification = () => {
        if (!settings) return;
        saveSettings({ gamification_enabled: !settings.gamification_enabled });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Settings className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Configurações de IA</h2>
                        <p className="text-sm text-slate-500">Gerenciar provedores e limites</p>
                    </div>
                </div>
                <button
                    onClick={checkProviderStatus}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                    <RefreshCw className="w-4 h-4" />
                    Verificar Status
                </button>
            </div>

            {/* Alertas */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-green-700">{success}</p>
                </div>
            )}

            {/* Toggle Principal de IA */}
            <div className={`p-6 rounded-xl border-2 ${settings?.ai_enabled ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${settings?.ai_enabled ? 'bg-green-200' : 'bg-red-200'}`}>
                            <Power className={`w-6 h-6 ${settings?.ai_enabled ? 'text-green-700' : 'text-red-700'}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Serviço de IA
                            </h3>
                            <p className={`text-sm ${settings?.ai_enabled ? 'text-green-700' : 'text-red-700'}`}>
                                {settings?.ai_enabled ? '✅ Ativo e funcionando' : '❌ Desativado pelo administrador'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleAI}
                        disabled={saving}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${settings?.ai_enabled
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                            } disabled:opacity-50`}
                    >
                        {saving ? 'Salvando...' : settings?.ai_enabled ? 'Desativar IA' : 'Ativar IA'}
                    </button>
                </div>

                {!settings?.ai_enabled && (
                    <p className="mt-4 text-sm text-red-600">
                        ⚠️ Enquanto a IA estiver desativada, os usuários não poderão gerar checklists automáticos ou obter análises de IA.
                    </p>
                )}
            </div>

            {/* Status dos Provedores */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-slate-600" />
                    Provedores de IA
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                    {providers.map((provider) => {
                        const isPrimary = settings?.ai_primary_provider === (provider.name.includes('GPT') ? 'openai' : 'gemini');

                        return (
                            <div
                                key={provider.name}
                                onClick={() => {
                                    if (!settings) return;
                                    const newProvider = provider.name.includes('GPT') ? 'openai' : 'gemini';
                                    saveSettings({ ai_primary_provider: newProvider });
                                }}
                                className={`cursor-pointer relative p-4 rounded-lg border-2 transition-all ${isPrimary
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-offset-2'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                            >
                                {isPrimary && (
                                    <div className="absolute -top-3 -right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                                        PRINCIPAL
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${provider.status === 'online'
                                            ? 'bg-green-500 animate-pulse'
                                            : provider.status === 'checking'
                                                ? 'bg-slate-400 animate-pulse'
                                                : 'bg-red-500'
                                            }`} />
                                        <div>
                                            <p className="font-medium text-slate-900">{provider.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {isPrimary ? 'Definido como prioridade' : 'Usado apenas como backup'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {provider.status === 'checking' ? (
                                            <span className="text-sm text-slate-500">...</span>
                                        ) : provider.status === 'online' ? (
                                            <p className="text-xs text-slate-500">{provider.latency}ms</p>
                                        ) : (
                                            <span className="text-sm font-medium text-red-600">Offline</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-4 text-xs text-slate-500">
                    * Clique em um provedor para defini-lo como principal. O outro será usado automaticamente como backup se o fallback estiver ativado.
                </p>
            </div>

            {/* Opções Adicionais */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-600" />
                    Opções Adicionais
                </h3>

                <div className="space-y-4">
                    {/* Fallback automático */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900">Fallback Automático</p>
                            <p className="text-sm text-slate-500">
                                Se o provedor principal falhar, usar o backup automaticamente
                            </p>
                        </div>
                        <button
                            onClick={toggleFallback}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.ai_fallback_enabled ? 'bg-blue-500' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.ai_fallback_enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Gamificação */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900">Sistema de Gamificação</p>
                            <p className="text-sm text-slate-500">
                                Pontos, níveis e streaks para engajamento
                            </p>
                        </div>
                        <button
                            onClick={toggleGamification}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.gamification_enabled ? 'bg-blue-500' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.gamification_enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Última atualização */}
            {
                settings?.updated_at && (
                    <p className="text-xs text-slate-400 text-center">
                        Última atualização: {new Date(settings.updated_at).toLocaleString('pt-BR')}
                    </p>
                )
            }
        </div >
    );
};

export default AdminAISettings;
