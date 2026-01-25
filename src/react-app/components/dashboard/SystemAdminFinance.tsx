import { useState, useEffect } from 'react';
import {
    AlertTriangle,
    ArrowUpRight,
    DollarSign,
    CreditCard,
    PieChart,
    Wallet
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';

interface BIAnalytics {
    churn_risk: { id: number; name: string; last_activity: string; mrr: number }[];
    upsell_opportunity: { id: number; name: string; current_users: number; max_users: number }[];
    financials: {
        mrr: number;
        arpu: number;
    };
}

export default function SystemAdminFinance() {
    const [biAnalytics, setBiAnalytics] = useState<BIAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBiAnalytics();
    }, []);

    const fetchBiAnalytics = async () => {
        try {
            const res = await fetch('/api/system-admin/bi-analytics');
            if (res.ok) {
                const data = await res.json();
                setBiAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching BI analytics:', error);
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Cores
    const COLORS = {
        primary: '#4F46E5',
        success: '#10B981',
        warning: '#F59E0B',
        slate: '#64748B'
    };

    // Trend Data (Example logic, ideally API would return trend)
    const currentMrr = biAnalytics?.financials?.mrr || 0;
    const trendData = [
        { name: 'Jul', revenue: 4000 },
        { name: 'Ago', revenue: 4500 },
        { name: 'Set', revenue: 5100 },
        { name: 'Out', revenue: 5800 },
        { name: 'Nov', revenue: 6500 },
        { name: 'Dez', revenue: 7200 },
        { name: 'Atual', revenue: currentMrr }
    ];

    return (
        <div className="space-y-6">
            {/* Header Section - Premium SaaS Style */}
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                <Wallet className="w-6 h-6 text-emerald-400" />
                                Financeiro & Receita
                            </h1>
                            <p className="text-indigo-200 text-sm">Gestão global de MRR, Inadimplência e Health Score.</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
                                <CreditCard className="w-4 h-4" />
                                Gerenciar Planos
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats in Header */}
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-semibold text-indigo-100 uppercase">MRR Atual</span>
                            </div>
                            <div className="text-2xl font-bold">
                                R$ {(biAnalytics?.financials?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <PieChart className="w-4 h-4 text-violet-300" />
                                <span className="text-xs font-semibold text-indigo-100 uppercase">ARPU (Ticket Médio)</span>
                            </div>
                            <div className="text-2xl font-bold">
                                R$ {(biAnalytics?.financials?.arpu || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-semibold text-indigo-100 uppercase">Risco de Churn</span>
                            </div>
                            <div className="text-2xl font-bold">
                                {biAnalytics?.churn_risk?.length || 0}
                                <span className="text-sm font-normal opacity-75 ml-1">clientes</span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-semibold text-indigo-100 uppercase">Upsell</span>
                            </div>
                            <div className="text-2xl font-bold">
                                {biAnalytics?.upsell_opportunity?.length || 0}
                                <span className="text-sm font-normal opacity-75 ml-1">leads</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Evolução de Receita (MRR)</h3>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
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
                                formatter={(value) => [`R$ ${value}`, 'Receita']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
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

            {/* Recent Transactions / Details (Placeholder for Future Transaction Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">🔍 Clientes em Risco (Detalhado)</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {biAnalytics?.churn_risk && biAnalytics.churn_risk.length > 0 ? (
                            biAnalytics.churn_risk.map(client => (
                                <div key={client.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="font-medium text-slate-800">{client.name}</div>
                                        <div className="text-xs text-slate-500">Última atividade: {new Date(client.last_activity).toLocaleDateString()}</div>
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

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">🚀 Potencial de Expansão</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {biAnalytics?.upsell_opportunity && biAnalytics.upsell_opportunity.length > 0 ? (
                            biAnalytics.upsell_opportunity.map(client => (
                                <div key={client.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="font-medium text-slate-800">{client.name}</div>
                                        <div className="w-24 bg-emerald-100 h-1.5 rounded-full mt-2">
                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(client.current_users / client.max_users) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-700">{client.current_users}/{client.max_users} users</div>
                                        <button className="text-xs text-indigo-600 hover:underline mt-1">Oferecer Upgrade</button>
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
    );
}
