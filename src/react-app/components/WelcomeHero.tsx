import { ClipboardList, Clock, CheckCircle2, Target, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WelcomeHeroProps {
    stats: {
        total: number;
        pending: number;
        completed: number;
    } | null;
    completionRate: number;
    showOrgSelector?: boolean;
    orgSelectorSlot?: React.ReactNode;
}

export default function WelcomeHero({
    stats,
    completionRate,
    showOrgSelector,
    orgSelectorSlot
}: WelcomeHeroProps) {

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
            {/* Compact Stats Row + Action */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Mini Stats - Inline */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        <ClipboardList className="w-4 h-4 text-blue-600" />
                        <span className="text-lg font-bold text-slate-800">{stats?.total || 0}</span>
                        <span className="text-xs text-slate-500">Total</span>
                    </div>

                    <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-lg font-bold text-amber-700">{stats?.pending || 0}</span>
                        <span className="text-xs text-amber-600">Pendentes</span>
                    </div>

                    <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-lg font-bold text-emerald-700">{stats?.completed || 0}</span>
                        <span className="text-xs text-emerald-600">Concluídas</span>
                    </div>

                    <div className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2 border border-violet-100">
                        <Target className="w-4 h-4 text-violet-600" />
                        <span className="text-lg font-bold text-violet-700">{completionRate}%</span>
                        <span className="text-xs text-violet-600">Eficiência</span>
                    </div>
                </div>

                {/* Org Selector + Action Button */}
                <div className="flex items-center gap-3 sm:ml-auto">
                    {showOrgSelector && orgSelectorSlot && (
                        <div className="w-full sm:w-auto">
                            {orgSelectorSlot}
                        </div>
                    )}
                    <Link
                        to="/inspections/new"
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm shadow-md transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Nova Inspeção
                    </Link>
                </div>
            </div>
        </div>
    );
}
