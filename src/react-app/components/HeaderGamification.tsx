import { useEffect, useState } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import { fetchWithAuth } from '@/react-app/utils/auth';
import GamificationModal from '@/react-app/components/GamificationModal';

interface GamificationStats {
    level: number;
    current_xp: number;
    progress: {
        percentage: number;
        current: number;
        max: number;
    };
}

export default function HeaderGamification() {
    const { user } = useAuth();
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const response = await fetchWithAuth('/api/gamification/me');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (e) {
            console.error('Failed to fetch header gamification', e);
        }
    };

    if (!stats) return null;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="mt-1 flex items-center gap-2 hover:opacity-80 transition-opacity w-full text-left group"
                title="Ver detalhes de engajamento"
            >
                <div className="flex-1 w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 group-hover:border-indigo-200 transition-colors">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                        style={{ width: `${stats.progress.percentage}%` }}
                    />
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 px-1.5 py-0.5 rounded-full whitespace-nowrap transition-colors">
                    Lvl {stats.level}
                </span>
            </button>

            <GamificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
