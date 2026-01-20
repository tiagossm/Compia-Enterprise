import { Target, Brain } from 'lucide-react';
import { ActionItem } from '@/shared/types';

interface InspectionActionItemsProps {
    actionItems: ActionItem[];
}

export default function InspectionActionItems({ actionItems }: InspectionActionItemsProps) {
    if (actionItems.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-slate-600" />
                <h2 className="font-heading text-xl font-semibold text-slate-900">
                    Itens de Ação
                </h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {actionItems.length} {actionItems.length === 1 ? 'item' : 'itens'}
                </span>
            </div>

            <div className="space-y-4">
                {actionItems.map((action: ActionItem, index: number) => (
                    <div key={action.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-slate-900">
                                {index + 1}. {action.title}
                            </h4>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${action.priority === 'alta' || action.priority === 'critica' ? 'bg-red-100 text-red-800' :
                                    action.priority === 'media' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                    }`}>
                                    {action.priority}
                                </span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${action.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    action.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {action.status === 'pending' ? 'Pendente' :
                                        action.status === 'in_progress' ? 'Em Progresso' :
                                            action.status === 'completed' ? 'Concluído' : action.status}
                                </span>
                            </div>
                        </div>

                        {action.is_ai_generated && (
                            <div className="mb-3 flex items-center gap-1 text-xs text-purple-600">
                                <Brain className="w-3 h-3" />
                                <span>Gerado por IA</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {action.what_description && (
                                <div>
                                    <span className="font-medium text-red-600">O que:</span>
                                    <p className="text-slate-700 mt-1">{action.what_description}</p>
                                </div>
                            )}
                            {action.where_location && (
                                <div>
                                    <span className="font-medium text-green-600">Onde:</span>
                                    <p className="text-slate-700 mt-1">{action.where_location}</p>
                                </div>
                            )}
                            {action.why_reason && (
                                <div>
                                    <span className="font-medium text-blue-600">Por que:</span>
                                    <p className="text-slate-700 mt-1">{action.why_reason}</p>
                                </div>
                            )}
                            {action.how_method && (
                                <div>
                                    <span className="font-medium text-indigo-600">Como:</span>
                                    <p className="text-slate-700 mt-1">{action.how_method}</p>
                                </div>
                            )}
                            {action.who_responsible && (
                                <div>
                                    <span className="font-medium text-purple-600">Quem:</span>
                                    <p className="text-slate-700 mt-1">{action.who_responsible}</p>
                                </div>
                            )}
                            {action.when_deadline && (
                                <div>
                                    <span className="font-medium text-yellow-600">Quando:</span>
                                    <p className="text-slate-700 mt-1">
                                        {new Date(action.when_deadline).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            )}
                            {action.how_much_cost && (
                                <div className="md:col-span-2">
                                    <span className="font-medium text-orange-600">Quanto:</span>
                                    <p className="text-slate-700 mt-1">{action.how_much_cost}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
