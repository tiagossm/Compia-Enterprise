
import { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

import {
    Users,
    ClipboardCheck,
    AlertTriangle,
    TrendingUp,
    CheckCircle2
} from 'lucide-react';

import { useOrganization } from '@/react-app/context/OrganizationContext';

interface OrgAnalytics {
    productivity: { inspector_name: string; total_inspections: number }[];
    bottlenecks: { priority: string; count: number }[];
    quality: { avg_actions: number };
}

export default function OrgAdminDashboard() {
    const { selectedOrganization } = useOrganization();
    const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchAnalytics();
    }, [selectedOrganization?.id]); // Re-fetch when organization changes

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/dashboard/org-admin-analytics');
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching Org Admin analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Performance da Equipe (30 dias)
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Produtividade por Inspetor */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Inspeções Realizadas por Inspetor
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={analytics.productivity}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="inspector_name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f0f9ff' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="total_inspections" fill="#4F46E5" radius={[0, 4, 4, 0]}>
                                    {analytics.productivity.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4F46E5' : '#818CF8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {analytics.productivity.length === 0 && (
                        <p className="text-center text-slate-400 text-sm mt-[-150px]">Nenhuma inspeção recente da equipe.</p>
                    )}
                </div>

                {/* 2. Métricas de Qualidade & Gargalos */}
                <div className="space-y-6">
                    {/* Card Qualidade */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">Média de Ações por Inspeção</p>
                            <h4 className="text-3xl font-bold text-slate-800">{analytics.quality.avg_actions}</h4>
                            <p className="text-xs text-slate-400 mt-1">Indicador de profundidade da auditoria</p>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-full">
                            <ClipboardCheck className="w-8 h-8 text-indigo-600" />
                        </div>
                    </div>

                    {/* Card Gargalos */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
                        <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Gargalos Operacionais (Pendências)
                        </h3>
                        <div className="space-y-3">
                            {analytics.bottlenecks.map((b) => (
                                <div key={b.priority} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${b.priority === 'alta' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                                        <span className="text-sm font-medium text-slate-700 capitalize">Prioridade {b.priority}</span>
                                    </div>
                                    <span className="font-bold text-slate-800">{b.count}</span>
                                </div>
                            ))}
                            {analytics.bottlenecks.length === 0 && (
                                <div className="text-center py-6 text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Tudo em dia!</p>
                                    <p className="text-xs opacity-80">Nenhuma ação crítica pendente.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
