import { FileText } from 'lucide-react';

interface InspectionActionPlanLegacyProps {
    actionPlan: any;
}

export default function InspectionActionPlanLegacy({ actionPlan }: InspectionActionPlanLegacyProps) {
    if (!actionPlan) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-slate-600" />
                <h2 className="font-heading text-xl font-semibold text-slate-900">
                    Plano de Ação 5W2H
                </h2>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${actionPlan.priority_level === 'alta' ? 'bg-red-100 text-red-800' :
                    actionPlan.priority_level === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                    Prioridade {actionPlan.priority_level}
                </span>
            </div>

            {actionPlan.summary && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">Resumo Executivo</h3>
                    <p className="text-blue-800 text-sm">{actionPlan.summary}</p>
                    {actionPlan.estimated_completion && (
                        <p className="text-blue-700 text-sm mt-2">
                            <strong>Conclusão Estimada:</strong> {actionPlan.estimated_completion}
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {actionPlan.actions && actionPlan.actions.map((action: any, index: number) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <h4 className="font-medium text-slate-900 mb-3">
                            {index + 1}. {action.item}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm font-medium text-red-600">O que (What):</span>
                                <p className="text-sm text-slate-700 mt-1">{action.what}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-blue-600">Por que (Why):</span>
                                <p className="text-sm text-slate-700 mt-1">{action.why}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-green-600">Onde (Where):</span>
                                <p className="text-sm text-slate-700 mt-1">{action.where}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-yellow-600">Quando (When):</span>
                                <p className="text-sm text-slate-700 mt-1">{action.when}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-purple-600">Quem (Who):</span>
                                <p className="text-sm text-slate-700 mt-1">{action.who}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-indigo-600">Como (How):</span>
                                <p className="text-sm text-slate-700 mt-1">{action.how}</p>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-sm font-medium text-orange-600">Quanto (How Much):</span>
                                <p className="text-sm text-slate-700 mt-1">{action.how_much}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
