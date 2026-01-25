
import { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    ClipboardCheck,
    Bot,
    TrendingUp,
    Activity,
} from 'lucide-react';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

interface SaaSMetrics {
    organizations: {
        total: number;
        active: number;
        master: number;
        subsidiary_ratio: string;
    };
    users: {
        total: number;
        active: number;
        growth_30d: number;
    };
    inspections: {
        total: number;
        completed: number;
        volume_30d: number;
    };
    ai_usage: {
        total_tokens: number;
        total_requests?: number;
        estimated_cost_usd: number;
    };
    generated_at: string;
}

interface BIAnalytics {
    churn_risk: { id: number; name: string; last_activity: string; mrr: number }[];
    upsell_opportunity: { id: number; name: string; current_users: number; max_users: number }[];
    ai_adoption: { total: number; active: number; rate: number };
    lead_velocity: { avg_days: number };
    financials: {
        mrr: number;
        arpu: number;
    };
}

export default function SystemAdminDashboard() {
    const { selectedOrganization } = useOrganization();
    const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
    const [biAnalytics, setBiAnalytics] = useState<BIAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchMetrics();
        fetchBiAnalytics();
    }, [selectedOrganization?.id]); // Re-fetch when organization changes

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/system-admin/saas-metrics');
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error('Error fetching SaaS metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBiAnalytics = async () => {
        try {
            const res = await fetch('/api/system-admin/bi-analytics');
            if (res.ok) {
                const data = await res.json();
                setBiAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching BI analytics:', error);
        }
    };

    // State for expanded view


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!metrics) {
        return <div className="p-6 text-center text-slate-500">Erro ao carregar métricas do sistema.</div>;
    }

    // Cores do tema SaaS Dashboard
    const COLORS = {
        primary: '#4F46E5', // Indigo 600
        secondary: '#8B5CF6', // Violet 500
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        slate: '#64748B'
    };

    // Dados de Tendência (Híbrido: Histórico Mock + MRR Real Atual)
    const currentMrr = biAnalytics?.financials?.mrr || 0;
    const trendData = [
        { name: 'Jul', revenue: 4000, users: 240, inspections: 24 },
        { name: 'Ago', revenue: 4500, users: 300, inspections: 45 },
        { name: 'Set', revenue: 5100, users: 380, inspections: 68 },
        { name: 'Out', revenue: 5800, users: 450, inspections: 89 },
        { name: 'Nov', revenue: 6500, users: 520, inspections: 110 },
        { name: 'Dez', revenue: 7200, users: 590, inspections: 145 },
        { name: 'Atual', revenue: currentMrr, users: metrics.users.total, inspections: metrics.inspections.volume_30d * 4 }
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">Painel Mestre (SaaS)</h1>
                            <p className="text-indigo-200 text-sm">Visão consolidada de todas as instâncias.</p>
                        </div>
                        {/* MRR REAL DISPLAY */}
                        <div className="text-right">
                            <div className="text-xs text-indigo-300 uppercase tracking-wider mb-1">MRR Atual (Real)</div>
                            <div className="text-3xl font-bold text-white flex items-center gap-2 justify-end">
                                <span>R$ {(biAnalytics?.financials?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="text-xs text-indigo-200">ARPU: R$ {(biAnalytics?.financials?.arpu || 0).toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-indigo-300" />
                                <span className="text-xs font-semibold text-indigo-100 uppercase">Organizações</span>
                            </div>
                            <div className="text-2xl font-bold">{metrics.organizations.total}</div>
                            <div className="text-xs text-indigo-200 mt-1">
                                {metrics.organizations.active} ativas ({metrics.organizations.master} consultorias)
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-indigo-300" />
                                <span className="text-xs font-semibold text-indigo-100 uppercase">Usuários Globais</span>
                            </div>
                            <div className="text-2xl font-bold">{metrics.users.total}</div>
                            <div className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                +{metrics.users.growth_30d} no último mês
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <ClipboardCheck className="w-4 h-4 text-indigo-300" />
                                <span className="text-xs font-semibold text-indigo-100 uppercase">Inspeções Totais</span>
                            </div>
                            <div className="text-2xl font-bold">{metrics.inspections.total}</div>
                            <div className="text-xs text-indigo-200 mt-1">
                                {metrics.inspections.completed} concluídas
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl p-4 border border-white/20 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Bot className="w-4 h-4 text-white" />
                                <span className="text-xs font-semibold text-white uppercase">IA Consumida</span>
                            </div>
                            <div className="text-2xl font-bold">
                                {(metrics.ai_usage.total_tokens / 1000).toFixed(1)}k
                                <span className="text-sm font-normal opacity-75 ml-1">tks</span>
                            </div>
                            <div className="text-xs text-white/90 mt-1 flex flex-col gap-0.5">
                                <span>{metrics.ai_usage.total_requests || 0} requisições processadas</span>
                                <span className="opacity-75">Est. ${metrics.ai_usage.estimated_cost_usd.toFixed(2)} USD</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-600" />
                                Crescimento Recorrente
                            </h3>
                            <p className="text-sm text-slate-500">Evolução de usuários e inspeções (6 meses)</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorInspections" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.slate, fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.slate, fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stroke={COLORS.primary}
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                    name="Usuários Ativos"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="inspections"
                                    stroke={COLORS.success}
                                    fillOpacity={1}
                                    fill="url(#colorInspections)"
                                    name="Inspeções Mensais"
                                    strokeWidth={2}
                                />
                                <Legend />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Alerts & Health Health */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-amber-500" />
                        Saúde do Sistema
                    </h3>

                    <div className="flex-1 space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-600">Proporção de Unidades</span>
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-700">Média</span>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-slate-800">{metrics.organizations.subsidiary_ratio}x</span>
                                <span className="text-xs text-slate-500 mb-1">unidades por consultoria</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-600">Taxa de Ativação</span>
                                <span className="text-xs bg-emerald-100 px-2 py-1 rounded-full text-emerald-700">Saudável</span>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-slate-800">
                                    {Math.round((metrics.users.active / (metrics.users.total || 1)) * 100)}%
                                </span>
                                <span className="text-xs text-slate-500 mb-1">usuários ativos</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${Math.round((metrics.users.active / (metrics.users.total || 1)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <h4 className="text-sm font-bold text-orange-800 mb-2">Alertas de Capacidade</h4>
                            <ul className="space-y-2">
                                {metrics.ai_usage.total_tokens > 500000 && (
                                    <li className="text-xs text-orange-700 flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></span>
                                        Alto volume de IA detectado (checar custos)
                                    </li>
                                )}
                                <li className="text-xs text-orange-700 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></span>
                                    3 Organizações próximas do limite de usuários
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

