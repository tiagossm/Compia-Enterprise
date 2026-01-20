
import { useState, useEffect } from 'react';
import {
    Trophy,
    Target,
    Calendar,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface InspectorStats {
    my_stats: {
        total: number;
        this_month: number;
        completed: number;
        pending_actions: number;
    };
    feedback_message: string;
}

export default function InspectorStatsWidget() {
    const [stats, setStats] = useState<InspectorStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard/inspector-analytics');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching inspector stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse min-h-[140px]">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="flex gap-4">
                <div className="h-16 bg-slate-100 rounded flex-1"></div>
                <div className="h-16 bg-slate-100 rounded flex-1"></div>
            </div>
        </div>
    );

    if (!stats) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-bl-full -mr-16 -mt-16 opacity-50 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Minha Performance
                        </h2>
                        <p className="text-slate-600 text-sm mt-1">
                            {stats.feedback_message}
                        </p>
                    </div>
                    <Link
                        to="/inspections/new"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors self-start md:self-auto"
                    >
                        Nova Inspeção
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-semibold text-slate-500 uppercase">Este Mês</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.my_stats.this_month}</p>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-600/70 uppercase">Total Feito</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{stats.my_stats.completed}</p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-600/70 uppercase">Pendências</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-700">{stats.my_stats.pending_actions}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
