
import { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    ClipboardCheck,
    Bot,
    TrendingUp,
    Activity,
    LayoutDashboard,
    Contact,
    AlertTriangle,
    Zap,
    Briefcase,
    Clock,
    ArrowRight
} from 'lucide-react';
import SystemAdminCRM from './SystemAdminCRM';
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
    churn_risk: { id: number; name: string; last_activity: string }[];
    upsell_opportunity: { id: number; name: string; current_users: number; max_users: number }[];
    ai_adoption: { total: number; active: number; rate: number };
    lead_velocity: { avg_days: number };
}

export default function SystemAdminDashboard() {
    const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
    const [biAnalytics, setBiAnalytics] = useState<BIAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'crm'>('overview');

    useEffect(() => {
        fetchMetrics();
        fetchBiAnalytics();
    }, []);

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
            const res = await fetch('/api/dashboard/bi-analytics');
            if (res.ok) {
                const data = await res.json();
                setBiAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching BI analytics:', error);
        }
    };

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

    // Mock data para gráfico de tendência
    const trendData = [
        { name: 'Jul', revenue: 4000, users: 240, inspections: 24 },
        { name: 'Ago', revenue: 4500, users: 300, inspections: 45 },
        { name: 'Set', revenue: 5100, users: 380, inspections: 68 },
        { name: 'Out', revenue: 5800, users: 450, inspections: 89 },
        { name: 'Nov', revenue: 6500, users: 520, inspections: 110 },
        { name: 'Dez', revenue: 7200, users: 590, inspections: 145 },
        { name: 'Jan', revenue: 8100, users: metrics.users.total, inspections: metrics.inspections.volume_30d * 4 } // Estimativa simples
    ];

    // State for expanded view
    const [expandedCard, setExpandedCard] = useState<'churn' | 'upsell' | 'ai' | 'velocity' | null>(null);

    const closeModal = () => setExpandedCard(null);

    return (
        <div className="space-y-6">
            {/* ... Modal Overlay ... */}
            {expandedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {expandedCard === 'churn' && <><AlertTriangle className="w-5 h-5 text-red-500" /> Detalhes: Risco de Churn</>}
                                {expandedCard === 'upsell' && <><TrendingUp className="w-5 h-5 text-emerald-500" /> Detalhes: Potencial Upsell</>}
                                {expandedCard === 'ai' && <><Zap className="w-5 h-5 text-violet-500" /> Detalhes: Adoção de IA</>}
                                {expandedCard === 'velocity' && <><Clock className="w-5 h-5 text-blue-500" /> Detalhes: Lead Velocity</>}
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {expandedCard === 'churn' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">Lista completa de organizações ativas sem inspeções há mais de 30 dias.</p>
                                    <div className="grid gap-2">
                                        {biAnalytics?.churn_risk.map(org => (
                                            <div key={org.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-red-900">{org.name}</span>
                                                    <span className="text-xs text-red-600">ID: {org.id}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs font-bold text-red-800">Inativo desde</span>
                                                    <span className="font-mono text-sm text-red-700">{new Date(org.last_activity).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {biAnalytics?.churn_risk.length === 0 && <p className="text-center text-slate-400 py-4">Nenhum registro encontrado.</p>}
                                    </div>
                                </div>
                            )}

                            {expandedCard === 'upsell' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">Organizações próximas do limite de usuários (&gt;80%).</p>
                                    <div className="grid gap-2">
                                        {biAnalytics?.upsell_opportunity.map(org => (
                                            <div key={org.id} className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-emerald-900">{org.name}</span>
                                                    <div className="w-32 bg-emerald-200 h-2 rounded-full mt-2 overflow-hidden">
                                                        <div className="bg-emerald-500 h-full" style={{ width: `${(org.current_users / org.max_users) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-2xl font-bold text-emerald-700">{org.current_users}<span className="text-sm text-emerald-500">/{org.max_users}</span></span>
                                                    <span className="text-xs text-emerald-600">usuários</span>
                                                </div>
                                            </div>
                                        ))}
                                        {biAnalytics?.upsell_opportunity.length === 0 && <p className="text-center text-slate-400 py-4">Nenhum registro encontrado.</p>}
                                    </div>
                                </div>
                            )}

                            {expandedCard === 'ai' && (
                                <div className="space-y-6 text-center">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-violet-50 rounded-xl">
                                            <div className="text-3xl font-bold text-violet-700">{biAnalytics?.ai_adoption.active}</div>
                                            <div className="text-sm text-violet-600">Inspeções com IA</div>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <div className="text-3xl font-bold text-slate-700">{biAnalytics?.ai_adoption.total}</div>
                                            <div className="text-sm text-slate-600">Total Inspeções (30d)</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500">A métrica considera todas as inspeções iniciadas nos últimos 30 dias que geraram pelo menos um item de ação via IA.</p>
                                </div>
                            )}

                            {expandedCard === 'velocity' && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-blue-50 rounded-xl text-center">
                                        <div className="text-4xl font-bold text-blue-700 mb-2">{biAnalytics?.lead_velocity.avg_days} dias</div>
                                        <p className="text-blue-600 font-medium">Ciclo Médio de Vendas</p>
                                    </div>
                                    <p className="text-sm text-slate-500 text-center">Calculado com base na média de tempo entre a criação do Lead e a mudança de status para "Won" (Ganho) nos últimos 60 dias.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                            <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Header Section */}
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold mb-1">Painel Mestre (SaaS)</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white/20 text-white' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Visão Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('crm')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'crm' ? 'bg-white/20 text-white' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}
                        >
                            <Contact className="w-4 h-4" />
                            CRM / Leads
                        </button>
                    </div>

                    {activeTab === 'overview' && (
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
                    )}
                </div>
            </div>

            {activeTab === 'crm' ? (
                <SystemAdminCRM />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* BI ANALYTICS (PROACTIVE INSIGHTS) */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* 1. Risco de Churn */}
                        <div
                            className="bg-white rounded-xl border border-l-4 border-l-red-500 border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => setExpandedCard('churn')}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Risco de Churn (30d)
                                    </h3>
                                    <div className="text-2xl font-bold text-slate-800 mt-1">
                                        {biAnalytics?.churn_risk.length || 0}
                                        <span className="text-sm font-normal text-slate-500 ml-1">clientes</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Ver todos</div>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">
                                Clientes ativos mas sem inspeções há mais de 30 dias.
                            </p>
                            {biAnalytics?.churn_risk.length ? (
                                <div className="space-y-1">
                                    {biAnalytics.churn_risk.slice(0, 2).map(org => (
                                        <div key={org.id} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded flex justify-between">
                                            <span className="truncate max-w-[120px]">{org.name}</span>
                                            <span className="font-mono text-[10px] opacity-75">{new Date(org.last_activity).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                    {biAnalytics.churn_risk.length > 2 && (
                                        <div className="text-[10px] text-center text-slate-400">e mais {biAnalytics.churn_risk.length - 2}...</div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Nenhum risco detectado! 🎉</div>
                            )}
                        </div>

                        {/* 2. Oportunidade Upsell */}
                        <div
                            className="bg-white rounded-xl border border-l-4 border-l-emerald-500 border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => setExpandedCard('upsell')}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> Potencial Upsell
                                    </h3>
                                    <div className="text-2xl font-bold text-slate-800 mt-1">
                                        {biAnalytics?.upsell_opportunity.length || 0}
                                        <span className="text-sm font-normal text-slate-500 ml-1">clientes</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Ver todos</div>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">
                                Clientes utilizando &gt;80% da capacidade do plano.
                            </p>
                            {biAnalytics?.upsell_opportunity.length ? (
                                <div className="space-y-1">
                                    {biAnalytics.upsell_opportunity.slice(0, 2).map(org => (
                                        <div key={org.id} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded flex justify-between">
                                            <span className="truncate max-w-[120px]">{org.name}</span>
                                            <span className="font-mono text-[10px] opacity-75">{org.current_users}/{org.max_users} users</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">Nenhuma oportunidade crítica.</div>
                            )}
                        </div>

                        {/* 3. Adoção de IA */}
                        <div
                            className="bg-white rounded-xl border border-l-4 border-l-violet-500 border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => setExpandedCard('ai')}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Adoção de IA
                                    </h3>
                                    <div className="text-2xl font-bold text-slate-800 mt-1">
                                        {Math.round((biAnalytics?.ai_adoption.rate || 0) * 100)}%
                                        <span className="text-sm font-normal text-slate-500 ml-1">conversão</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Detalhes</div>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">
                                Inspeções criadas nos últimos 30 dias que utilizaram IA.
                            </p>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                    className="bg-violet-500 h-full rounded-full"
                                    style={{ width: `${(biAnalytics?.ai_adoption.rate || 0) * 100}%` }}
                                ></div>
                            </div>
                            <div className="mt-2 text-xs text-violet-700 bg-violet-50 p-2 rounded">
                                {((biAnalytics?.ai_adoption.rate || 0) < 0.2) ?
                                    "⚠️ Baixa adesão. Ofereça treinamentos." :
                                    "✅ Ótima adesão ao diferencial!"}
                            </div>
                        </div>

                        {/* 4. Lead Velocity */}
                        <div
                            className="bg-white rounded-xl border border-l-4 border-l-blue-500 border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => setExpandedCard('velocity')}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Lead Velocity
                                    </h3>
                                    <div className="text-2xl font-bold text-slate-800 mt-1">
                                        {biAnalytics?.lead_velocity.avg_days || 0}
                                        <span className="text-sm font-normal text-slate-500 ml-1">dias</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Detalhes</div>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">
                                Tempo médio do ciclo de vendas (Lead → Cliente Ganho).
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    <span>Eficiência Comercial</span>
                                </div>
                                <ArrowRight className="w-3 h-3 text-slate-300" />
                            </div>
                        </div>

                    </div>

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
            )}
        </div>
    );
}

