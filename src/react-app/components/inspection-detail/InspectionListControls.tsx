import { Link } from 'react-router-dom';
import { Target, Sparkles, Plus } from 'lucide-react';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';

interface InspectionListControlsProps {
    inspectionId: number;
    aiAnalyzing: boolean;
    isSubmitting: boolean;
    generateAIAnalysis: () => void;
    onShowNewAction: () => void;
    onShowAddItem: () => void;
}

export default function InspectionListControls({
    inspectionId,
    aiAnalyzing,
    isSubmitting,
    generateAIAnalysis,
    onShowNewAction,
    onShowAddItem
}: InspectionListControlsProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-semibold text-slate-900">
                Checklist de Inspeção
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* Grupo: Plano de Ação */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link
                        to={`/inspections/${inspectionId}/action-plan`}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white text-purple-700 border border-purple-200 text-sm font-medium rounded-lg hover:bg-purple-50 transition-colors shadow-sm"
                        title="Visualizar todas as ações geradas ou criadas manualmente"
                    >
                        <Target className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Ver Plano de Ação</span>
                        <span className="sm:hidden">Ação</span>
                    </Link>
                    <button
                        onClick={generateAIAnalysis}
                        disabled={aiAnalyzing || isSubmitting}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        title="Gera análise automática (5W2H) para todos os itens não conformes"
                    >
                        {aiAnalyzing ? (
                            <LoadingSpinner size="sm" />
                        ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {aiAnalyzing ? 'Analisando...' : (
                            <>
                                <span className="hidden sm:inline">Gerar Análises (IA)</span>
                                <span className="sm:hidden">IA</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                {/* Grupo: Adicionar */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={onShowNewAction}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                        title="Criar uma ação manual"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Nova Ação</span>
                        <span className="sm:hidden">Ação</span>
                    </button>
                    <button
                        onClick={onShowAddItem}
                        className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
                        title="Adicionar Item ao Checklist"
                    >
                        <Plus className="w-4 h-4 mr-2 sm:mr-0" />
                        <span className="sm:hidden">Add Item</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
