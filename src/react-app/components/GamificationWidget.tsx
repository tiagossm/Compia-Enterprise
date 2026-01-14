import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Award } from 'lucide-react';

interface GamificationStats {
    current_xp: number;
    level: number;
    points_this_month: number;
    achievements_count: number;
    progress: {
        current: number;
        min: number;
        max: number;
        percentage: number;
    };
}

interface LeaderboardEntry {
    user_id: string;
    name: string;
    current_xp: number;
    level: number;
    avatar_url?: string;
}

export default function GamificationWidget() {
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'me' | 'ranking'>('me');

    useEffect(() => {
        fetchStats();
        fetchLeaderboard();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/gamification/me');
            if (res.ok) setStats(await res.json());
        } catch (e) {
            console.error("Error fetching gamification stats", e);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/gamification/leaderboard');
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data.leaderboard || []);
            }
        } catch (e) {
            console.error("Error fetching leaderboard", e);
        }
    };

    const getLevelTitle = (level: number) => {
        if (level <= 10) return "Observador";
        if (level <= 30) return "Inspetor";
        if (level <= 60) return "Especialista";
        return "Guardião";
    };

    if (!stats) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Trophy size={20} className="text-yellow-300" />
                        Engajamento
                    </h3>
                    <div className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                        Nível {stats.level}
                    </div>
                </div>

                <div className="flex items-end justify-between mb-1">
                    <p className="text-sm font-medium text-white/90">{getLevelTitle(stats.level)}</p>
                    <p className="text-xs text-white/80">{stats.current_xp} XP</p>
                </div>

                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${stats.progress?.percentage ?? 0}%` }}
                    />
                </div>
                <p className="text-[10px] text-right mt-1 text-white/70">
                    Próximo nível: {(stats.progress?.max ?? 0) - (stats.progress?.current ?? 0)} XP
                </p>
            </div>

            <div className="flex border-b border-slate-100 shrink-0">
                <button
                    onClick={() => setActiveTab('me')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'me' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Meu Progresso
                </button>
                <button
                    onClick={() => setActiveTab('ranking')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'ranking' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Ranking Mensal
                </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
                {activeTab === 'me' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="bg-green-100 p-2 rounded-full text-green-600">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Pontos este mês</p>
                                <p className="font-bold text-slate-800">{stats.points_this_month}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                                <Award size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Conquistas</p>
                                <p className="font-bold text-slate-800">{stats.achievements_count}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leaderboard.map((entry, index) => (
                            <div key={entry.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}
                                `}>
                                        {index + 1}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {entry.avatar_url ? (
                                            <img src={entry.avatar_url} className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {entry.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">{entry.name}</p>
                                            <p className="text-[10px] text-slate-500">Nível {entry.level}</p>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-indigo-600">{entry.current_xp} XP</span>
                            </div>
                        ))}
                        {leaderboard.length === 0 && (
                            <p className="text-center text-sm text-slate-500 py-4">Nenhum dado ainda.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
