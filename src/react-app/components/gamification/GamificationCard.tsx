import { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, Medal } from 'lucide-react';

interface GamificationStats {
    level: number;
    current_xp: number;
    points_this_month: number;
    achievements_count: number;
    progress: {
        current: number;
        min: number;
        max: number;
        percentage: number;
    };
}

export default function GamificationCard() {
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/gamification/me');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch gamification stats', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-slate-100 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
            </div>
        );
    }

    if (!stats) return null;

    // Level Names Mapping (Example)
    const getLevelTitle = (level: number) => {
        if (level >= 20) return 'Lenda da Inspeção';
        if (level >= 10) return 'Auditor Mestre';
        if (level >= 5) return 'Auditor Pleno';
        if (level >= 2) return 'Auditor Júnior';
        return 'Iniciante';
    };

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                <Trophy size={140} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                {/* Level Badge Area */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                            <span className="text-3xl font-bold">{stats.level}</span>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full border border-white shadow-sm">
                            LVL
                        </div>
                    </div>

                    <div>
                        <h3 className="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-0.5">Nível Atual</h3>
                        <h2 className="text-2xl font-bold">{getLevelTitle(stats.level)}</h2>
                    </div>
                </div>

                {/* Progress Stats */}
                <div className="flex-1 w-full md:w-auto md:max-w-md">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="flex items-center gap-1.5 text-indigo-100">
                            <Star size={14} className="fill-amber-400 text-amber-400" />
                            {stats.current_xp} XP
                        </span>
                        <span className="text-indigo-200">
                            Próximo nível: {stats.progress.max} XP
                        </span>
                    </div>

                    <div className="h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                        <div
                            className="h-full bg-gradient-to-r from-amber-300 to-orange-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-1000 ease-out relative"
                            style={{ width: `${stats.progress.percentage}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>

                    <p className="text-xs text-indigo-200 mt-2 text-right">
                        Faltam <strong>{stats.progress.max - stats.current_xp} XP</strong> para subir de nível
                    </p>
                </div>

                {/* Mini Stats */}
                <div className="hidden lg:flex gap-6 border-l border-white/10 pl-6">
                    <div className="text-center">
                        <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-1">
                            <TrendingUp size={20} className="text-emerald-300" />
                        </div>
                        <div className="text-xl font-bold">{stats.points_this_month}</div>
                        <div className="text-[10px] text-indigo-200 uppercase">Mês</div>
                    </div>

                    <div className="text-center">
                        <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-1">
                            <Medal size={20} className="text-amber-300" />
                        </div>
                        <div className="text-xl font-bold">{stats.achievements_count}</div>
                        <div className="text-[10px] text-indigo-200 uppercase">Conquistas</div>
                    </div>
                </div>

            </div>
        </div>
    );
}
