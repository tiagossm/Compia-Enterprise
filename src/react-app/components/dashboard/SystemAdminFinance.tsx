import { useState, useEffect } from 'react';
import {
    Users,
    AlertTriangle,
    CreditCard,
    DollarSign,
    PieChart,
    ArrowUpRight,
    Target,
    Info,
    X,
    Save,
    Wallet,
    Layers,
    Activity
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';

interface BIAnalytics {
    goals?: Record<string, number>;
    churn_risk: any[];
    upsell_opportunity: any[];
    financials: {
        mrr: number;
        arpu: number;
    };
    chart_data?: any[];
    plan_distribution?: { name: string; value: number }[];
    customer_status?: { active: number; inactive: number };
    revenue_concentration?: any[];
}

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1">
        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-indigo-500 transition-colors" />
        <div className="invisible group-hover:visible absolute z-50 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 bottom-full left-1/2 -translate-x-1/2 mb-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {text}
            <div className="absolute top-100% left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

export default function SystemAdminFinance() {
    const navigate = useNavigate();
    const [biAnalytics, setBiAnalytics] = useState<BIAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [showGoalsModal, setShowGoalsModal] = useState(false);

    // Goals State
    const [goalsForm, setGoalsForm] = useState({
        mrr: 0,
        arpu: 0,
        churn_rate: 0,
        upsell_leads: 0,
        active_clients: 0
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/system-admin/bi-analytics');
            if (res.ok) {
                const data = await res.json();
                setBiAnalytics(data);
                if (data.goals) {
                    setGoalsForm({
                        mrr: data.goals.mrr || 0,
                        arpu: data.goals.arpu || 0,
                        churn_rate: data.goals.churn_rate || 5,
                        upsell_leads: data.goals.upsell_leads || 0,
                        active_clients: data.goals.active_clients || 0
                    });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGoals = async () => {
        try {
            const promises = Object.entries(goalsForm).map(([key, value]) =>
                fetch('/api/system-admin/goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ metric_key: key, target_value: value })
                })
            );

            await Promise.all(promises);
            fetchAnalytics(); // Refresh
            setShowGoalsModal(false);
            alert('Metas atualizadas com sucesso!');
        } catch (e) {
            alert('Erro ao salvar metas.');
        }
    };

    const COLORS = {
        primary: '#4F46E5', // Indigo 600
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        danger: '#EF4444', // Red 500
        slate: '#64748B',    // Slate 500
        pie: ['#4F46E5', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6']
    };

    // Prepare Chart Data
    const chartData = (biAnalytics?.chart_data && biAnalytics.chart_data.length > 0)
        ? biAnalytics.chart_data
        : [
            { name: 'Start', revenue: 0 },
            { name: 'Current', revenue: biAnalytics?.financials?.mrr || 0 }
        ];

    const currentMrr = biAnalytics?.financials?.mrr || 0;
    const mrrGoal = biAnalytics?.goals?.mrr || 10000;
    const mrrProgress = Math.min((currentMrr / (mrrGoal || 1)) * 100, 100);

    // Pie Chart Data
    const pieData = biAnalytics?.plan_distribution || [];

    // Active Status Data
    const statusData = [
        { name: 'Ativos', value: biAnalytics?.customer_status?.active || 0, fill: '#10B981' },
        { name: 'Inativos', value: biAnalytics?.customer_status?.inactive || 0, fill: '#94A3B8' }
    ];

    if (loading) return <div className="p-8 text-center flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                    <Wallet className="w-6 h-6 text-emerald-400" />
                                    Financeiro & Receita
                                </h1>
                                <p className="text-indigo-200 text-sm">Gestão global de MRR, Inadimplência e Indicadores.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/crm/run-intelligence-sync', { method: 'POST' });
                                            const data = await res.json();
                                            if (res.ok) {
                                                alert(data.message);
                                                window.location.reload();
                                            } else {
                                                alert('Erro: ' + data.error);
                                            }
                                        } catch (e) {
                                            alert('Erro ao conectar com servidor');
                                        }
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    Rodar Análise IA
                                </button>
                                <button
                                    onClick={() => setShowGoalsModal(true)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 backdrop-blur-sm cursor-pointer"
                                >
                                    <Target className="w-4 h-4" />
                                    Definir Metas
                                </button>
                                <button
                                    onClick={() => navigate('/billing')}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 backdrop-blur-sm cursor-pointer"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Gerenciar Planos
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats in Header */}
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* MRR CARD */}
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 relative overflow-hidden group">
                                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-1000" style={{ width: `${mrrProgress}%` }}></div>
                                <div className="flex items-center gap-1 mb-2">
                                    <DollarSign className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-semibold text-indigo-100 uppercase">MRR Atual</span>
                                    <InfoTooltip text="Receita Mensal Recorrente: Soma de todas as assinaturas ativas." />
                                </div>
                                <div className="text-2xl font-bold">
                                    R$ {(biAnalytics?.financials?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-indigo-200 mt-1 flex justify-between">
                                    <span>Meta: R$ {mrrGoal.toLocaleString('pt-BR')}</span>
                                    <span>{mrrProgress.toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* ARPU CARD */}
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-1 mb-2">
                                    <PieChart className="w-4 h-4 text-violet-300" />
                                    <span className="text-xs font-semibold text-indigo-100 uppercase">Ticket Médio</span>
                                    <InfoTooltip text="Receita Média por Usuário/Cliente Pagante." />
                                </div>
                                <div className="text-2xl font-bold">
                                    R$ {(biAnalytics?.financials?.arpu || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-indigo-200 mt-1">
                                    Meta: R$ {(biAnalytics?.goals?.arpu || 0).toLocaleString('pt-BR')}
                                </div>
                            </div>

                            {/* CHURN CARD */}
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-1 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs font-semibold text-indigo-100 uppercase">Risco Churn</span>
                                    <InfoTooltip text="Clientes com risco de cancelamento." />
                                </div>
                                <div className="text-2xl font-bold leading-none">
                                    {biAnalytics?.churn_risk?.length || 0}
                                    <span className="text-sm font-normal opacity-75 ml-1">clientes</span>
                                </div>
                                <div className="text-xs text-indigo-200 mt-2">
                                    Meta: {biAnalytics?.goals?.churn_rate || 5}%
                                </div>
                            </div>

                            {/* ACTIVE CLIENTS */}
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-1 mb-2">
                                    <Users className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-semibold text-indigo-100 uppercase">Clientes Ativos</span>
                                    <InfoTooltip text="Total de organizações com status Ativo." />
                                </div>
                                <div className="text-2xl font-bold leading-none">
                                    {biAnalytics?.customer_status?.active || 0}
                                    <span className="text-sm font-normal opacity-75 ml-1">orgs</span>
                                </div>
                                <div className="text-xs text-indigo-200 mt-2">
                                    Inativos: {biAnalytics?.customer_status?.inactive || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DISTRIBUTION CHARTS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* PLAN DISTRIBUTION */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            Distribuição de Planos
                            <InfoTooltip text="Quantidade de clientes por tipo de plano." />
                        </h3>
                        <div className="h-[200px] w-full">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados de planos</div>
                            )}
                        </div>
                    </div>

                    {/* CLIENT STATUS (New) */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Status da Base
                            <InfoTooltip text="Clientes Ativos vs Inativos/Cancelados." />
                        </h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {statusData.map((entry, index) => (
                                            <Cell key={`bar-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* REVENUE CONCENTRATION */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            Top 5 (Receita)
                            <InfoTooltip text="Maiores clientes por impacto no MRR." />
                        </h3>
                        <div className="space-y-4 h-[200px] overflow-y-auto">
                            {biAnalytics?.revenue_concentration && biAnalytics.revenue_concentration.length > 0 ? (
                                biAnalytics.revenue_concentration.map((client, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-slate-800 truncate w-24" title={client.name}>{client.name}</div>
                                                <div className="w-20 bg-slate-100 h-1 rounded-full mt-1">
                                                    <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${client.percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-900">R$ {(client.mrr / 100).toFixed(0)}</div>
                                            <div className="text-[10px] text-slate-500">{client.percentage.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-400 py-8 text-sm">Insuficiente.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MAIN CHART (MRR EVOLUTION) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                Evolução de Receita (MRR)
                                <InfoTooltip text="Histórico mensal baseado em faturas pagas." />
                            </h3>
                        </div>
                        {chartData.length === 0 && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Sem dados históricos suficientes</span>
                        )}
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
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
                                    tickFormatter={(value) => `R$${value}`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`R$ ${value}`, 'Receita']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                {mrrGoal > 0 && (
                                    <ReferenceLine y={mrrGoal} label="Meta" stroke="red" strokeDasharray="3 3" />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke={COLORS.primary}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Details Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Churn Risk Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-red-50 flex justify-between items-center">
                            <h3 className="font-bold text-red-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Clientes em Risco
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100 h-64 overflow-y-auto">
                            {biAnalytics?.churn_risk && biAnalytics.churn_risk.length > 0 ? (
                                biAnalytics.churn_risk.map(client => (
                                    <div key={client.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-medium text-slate-800">{client.name}</div>
                                            <div className="text-xs text-slate-500">Score: {client.health_score}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-red-600">R$ {(client.mrr / 100).toFixed(2)}</div>
                                            <button className="text-xs text-indigo-600 hover:underline mt-1">Ver Cliente</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400">Tudo limpo! Nenhum risco detectado.</div>
                            )}
                        </div>
                    </div>

                    {/* Upsell Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
                            <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4" />
                                Potencial de Expansão
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100 h-64 overflow-y-auto">
                            {biAnalytics?.upsell_opportunity && biAnalytics.upsell_opportunity.length > 0 ? (
                                biAnalytics.upsell_opportunity.map(client => (
                                    <div key={client.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-medium text-slate-800">{client.name}</div>
                                            <div className="w-24 bg-emerald-100 h-1.5 rounded-full mt-2">
                                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(client.current_users / (client.max_users || 1)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-emerald-700">{client.current_users}/{client.max_users} users</div>
                                            <button className="text-xs text-indigo-600 hover:underline mt-1">Ofertar Upgrade</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400">Nenhuma oportunidade iminente.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Goals Modal */}
            {showGoalsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-600" />
                                Definir Metas do Sistema
                            </h3>
                            <button onClick={() => setShowGoalsModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Meta de Receita Mensal (MRR) - R$
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={goalsForm.mrr}
                                    onChange={e => setGoalsForm({ ...goalsForm, mrr: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Meta de ARPU (Ticket Médio) - R$
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={goalsForm.arpu}
                                    onChange={e => setGoalsForm({ ...goalsForm, arpu: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Meta: Clientes Ativos (Qtd)
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={goalsForm.active_clients}
                                    onChange={e => setGoalsForm({ ...goalsForm, active_clients: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Teto de Churn (%)
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={goalsForm.churn_rate}
                                    onChange={e => setGoalsForm({ ...goalsForm, churn_rate: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setShowGoalsModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveGoals}
                                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Salvar Metas
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
