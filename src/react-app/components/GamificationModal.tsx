
import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Award, X } from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/auth';

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

interface GamificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GamificationModal({ isOpen, onClose }: GamificationModalProps) {
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'me' | 'ranking'>('me');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, leaderRes] = await Promise.all([
                fetchWithAuth('/api/gamification/me'),
                fetchWithAuth('/api/gamification/leaderboard')
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (leaderRes.ok) {
                const data = await leaderRes.json();
                setLeaderboard(data.leaderboard || []);
            }
        } catch (e) {
            console.error("Error fetching gamification data", e);
        } finally {
            setLoading(false);
        }
    };

    const getLevelTitle = (level: number) => {
        if (level <= 10) return "Observador";
        if (level <= 30) return "Inspetor";
        if (level <= 60) return "Especialista";
        return "Guardião";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200 relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-white/80 hover:text-white z-10 p-1 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header Section */}
                <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xl flex items-center gap-2">
                            <Trophy size={24} className="text-yellow-300" />
                            Minha Conquista
                        </h3>
                        {stats && (
                            <div className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full border border-white/10">
                                Nível {stats.level}
                            </div>
                        )}
                    </div>

                    {stats ? (
                        <>
                            <div className="flex items-end justify-between mb-2">
                                <p className="text-lg font-medium text-white/90">{getLevelTitle(stats.level)}</p>
                                <p className="text-sm font-mono text-white/80">{stats.current_xp} XP</p>
                            </div>

                            <div className="h-3 bg-black/20 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${stats.progress?.percentage ?? 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-right mt-2 text-white/60">
                                Falta {(stats.progress?.max ?? 0) - (stats.progress?.current ?? 0)} XP para o próximo nível
                            </p>
                        </>
                    ) : (
                        <div className="h-24 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('me')}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'me' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Meu Progresso
                    </button>
                    <button
                        onClick={() => setActiveTab('ranking')}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'ranking' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Ranking da Empresa
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
                    {loading && !stats ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'me' && stats ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:shadow-sm transition-shadow">
                                            <div className="bg-green-100 p-3 rounded-full text-green-600 mb-2">
                                                <TrendingUp size={24} />
                                            </div>
                                            <p className="text-2xl font-bold text-slate-800">{stats.points_this_month}</p>
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pontos Mês</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center hover:shadow-sm transition-shadow">
                                            <div className="bg-orange-100 p-3 rounded-full text-orange-600 mb-2">
                                                <Award size={24} />
                                            </div>
                                            <p className="text-2xl font-bold text-slate-800">{stats.achievements_count}</p>
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Conquistas</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                        <h4 className="font-bold text-slate-800 mb-2 text-sm">Dicas para subir de nível</h4>
                                        <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                                            <li>Complete inspeções com 100% de conformidade.</li>
                                            <li>Crie Planos de Ação detalhados.</li>
                                            <li>Realize checklists diários sem atraso.</li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {leaderboard.map((entry, index) => (
                                        <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shadow-sm
                                                    ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white' :
                                                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                                            index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                                                                'bg-slate-100 text-slate-500'}
                                                `}>
                                                    {index + 1}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {entry.avatar_url ? (
                                                        <img src={entry.avatar_url} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border-2 border-white shadow-sm">
                                                            {entry.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{entry.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded  w-fit">Lvl {entry.level}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600 font-mono">{entry.current_xp} XP</span>
                                        </div>
                                    ))}
                                    {leaderboard.length === 0 && (
                                        <div className="text-center py-10 text-slate-400">
                                            <Trophy size={48} className="mx-auto mb-2 opacity-20" />
                                            <p>Ranking ainda não disponível</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
