import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import { useToast } from "@/react-app/hooks/useToast";
import { Loader2, CheckCircle2, XCircle, Mail, Video, Calendar as CalendarIcon, Link as LinkIcon } from 'lucide-react';

interface IntegrationStatus {
    google: boolean;
    outlook?: boolean;
}

export default function IntegrationsPage() {
    // const { user } = useAuth(); // user unused
    const toast = useToast();
    const [status, setStatus] = useState<IntegrationStatus>({ google: false });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchStatus();

        // Check for callback code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            handleCallback(code);
        }
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/integrations');
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch integrations status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCallback = async (code: string) => {
        setActionLoading('google');
        // Remove code from URL without reload
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
            const response = await fetch('/api/integrations/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (response.ok) {
                toast.success("Integração Conectada", "Sua conta Google foi vinculada com sucesso.");
                fetchStatus();
            } else {
                throw new Error('Falha na troca de token');
            }
        } catch (error) {
            toast.error("Erro na Integração", "Não foi possível conectar ao Google. Tente novamente.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleConnect = async (provider: 'google') => {
        setActionLoading(provider);
        try {
            const response = await fetch(`/api/integrations/${provider}/authorize-url`, { method: 'POST' });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('URL de autorização não recebida');
            }
        } catch (error) {
            toast.error("Erro ao Iniciar", "Não foi possível iniciar o processo de login.");
            setActionLoading(null);
        }
    };

    const handleDisconnect = async (provider: 'google') => {
        setActionLoading(provider);
        try {
            const response = await fetch(`/api/integrations/${provider}`, { method: 'DELETE' });
            if (response.ok) {
                setStatus(prev => ({ ...prev, [provider]: false }));
                toast.success("Desconectado", "A integração foi removida.");
            }
        } catch (error) {
            toast.error("Erro ao Desconectar", "Tente novamente.");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integrações</h1>
                    <p className="text-slate-500">Gerencie as conexões com ferramentas externas</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                    {/* Google Integration Card */}
                    <div className={`bg-white rounded-xl border ${status.google ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-l-4 border-l-gray-300 border-gray-200'} shadow-sm transition-all hover:shadow-md`}>
                        <div className="p-6 pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                    {/* Google Icon SVG */}
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-800">Google Workspace</h3>
                                        <p className="text-sm text-slate-500">Gmail, Calendar, Meet</p>
                                    </div>
                                </div>
                                {status.google ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                        <CheckCircle2 className="mr-1 h-3 w-3" /> Conectado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                        Desconectado
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-2">
                            <div className="space-y-3 text-sm text-gray-600">
                                <p>Conecte sua conta Google para habilitar:</p>
                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-blue-500" />
                                        <span>Sincronia de Agenda</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Video className="h-4 w-4 text-green-500" />
                                        <span>Links Google Meet automáticos</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-red-500" />
                                        <span>Envio de convites por E-mail</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 mt-2 bg-gray-50 border-t border-gray-100 rounded-b-xl">
                            {status.google ? (
                                <button
                                    onClick={() => handleDisconnect('google')}
                                    disabled={actionLoading === 'google'}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                                >
                                    {actionLoading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                    Desconectar Conta
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleConnect('google')}
                                    disabled={actionLoading === 'google'}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                >
                                    {actionLoading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                                    Conectar com Google
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Planned Integrations (Disabled) */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm opacity-60 grayscale">
                        <div className="p-6 pb-3">
                            <div className="flex items-center space-x-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-slate-800">Outlook / Teams</h3>
                                    <p className="text-sm text-slate-500">Microsoft 365</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 mt-2">
                            <button disabled className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed">
                                Em Breve
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
}
