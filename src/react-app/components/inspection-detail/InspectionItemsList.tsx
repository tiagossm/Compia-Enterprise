import { Link } from 'react-router-dom';
import { Target, Sparkles, Plus, AlertTriangle, Check, X, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import ChecklistForm from '@/react-app/components/ChecklistForm';
import { InspectionType, InspectionItemType } from '@/shared/types';

interface InspectionItemsListProps {
    inspection: InspectionType;
    items: InspectionItemType[];
    templateItems: any[]; // Using any to handle extra fields like field_responses not in base type
    responses: Record<number, any>;
    media: any[];
    aiAnalyzing: boolean;
    isSubmitting: boolean;
    showNewAction: boolean;
    setShowNewAction: (show: boolean) => void;
    showAddItem: boolean;
    setShowAddItem: (show: boolean) => void;
    newItem: any;
    setNewItem: (item: any) => void;
    newAction: any;
    setNewAction: (action: any) => void;
    onAddItemClick: () => void;
    onCreateActionClick: () => void;
    generateAIAnalysis: () => void;
    updateItemAnalysis: (itemId: number, analysis: string | null) => Promise<void> | void;
    handleFormSubmit: (responses: any[]) => Promise<void> | void;
    handleDeleteItem: (itemId: number) => Promise<boolean> | Promise<void> | void;
    updateItemCompliance: (itemId: number, item: InspectionItemType, isCompliant: boolean) => Promise<boolean> | Promise<void> | void;
    // ChecklistForm requires strict Promise<void> for await compatibility
    handleAutoSave: (responses: Record<string, any>, comments: Record<string, any>, complianceStatuses?: Record<string, any>) => Promise<void>;
}

export default function InspectionItemsList({
    inspection,
    items,
    templateItems,
    responses,
    media,
    aiAnalyzing,
    isSubmitting,
    showNewAction,
    setShowNewAction,
    showAddItem,
    setShowAddItem,
    newItem,
    setNewItem,
    newAction,
    setNewAction,
    onAddItemClick,
    onCreateActionClick,
    generateAIAnalysis,
    updateItemAnalysis,
    handleFormSubmit,
    handleDeleteItem,
    updateItemCompliance,
    handleAutoSave
}: InspectionItemsListProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-semibold text-slate-900">
                    Checklist de Inspeção
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {/* Grupo: Plano de Ação */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Link
                            to={`/inspections/${inspection.id}/action-plan`}
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
                            onClick={() => setShowNewAction(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                            title="Criar uma ação manual"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Nova Ação</span>
                            <span className="sm:hidden">Ação</span>
                        </button>
                        <button
                            onClick={() => setShowAddItem(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
                            title="Adicionar Item ao Checklist"
                        >
                            <Plus className="w-4 h-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Add Item</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* New Action Form */}
            {showNewAction && (
                <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-heading text-lg font-semibold text-slate-900 mb-4">
                        Nova Ação Manual
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Título da Ação *
                            </label>
                            <input
                                type="text"
                                required
                                value={newAction.title}
                                onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Ex: Instalar equipamento de proteção"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="text-red-600">O que?</span> (Descrição)
                            </label>
                            <textarea
                                value={newAction.what_description}
                                onChange={(e) => setNewAction({ ...newAction, what_description: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="O que precisa ser feito..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="text-green-600">Onde?</span> (Local)
                            </label>
                            <input
                                type="text"
                                value={newAction.where_location}
                                onChange={(e) => setNewAction({ ...newAction, where_location: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Local especÃ­fico..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="text-blue-600">Por que?</span> (Justificativa)
                            </label>
                            <textarea
                                value={newAction.why_reason}
                                onChange={(e) => setNewAction({ ...newAction, why_reason: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Justificativa da aÃ§Ã£o..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="text-indigo-600">Como?</span> (MÃ©todo)
                            </label>
                            <textarea
                                value={newAction.how_method}
                                onChange={(e) => setNewAction({ ...newAction, how_method: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Como serÃ¡ executado..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="text-purple-600">Quem?</span> (Responsável)
                            </label>
                            <input
                                type="text"
                                value={newAction.who_responsible}
                                onChange={(e) => setNewAction({ ...newAction, who_responsible: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Responsável pela execução..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="text-yellow-600">Quando?</span> (Prazo)
                            </label>
                            <input
                                type="date"
                                value={newAction.when_deadline}
                                onChange={(e) => setNewAction({ ...newAction, when_deadline: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Prioridade</label>
                            <select
                                value={newAction.priority}
                                onChange={(e) => setNewAction({ ...newAction, priority: e.target.value as 'baixa' | 'media' | 'alta' })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                                <option value="baixa">Baixa</option>
                                <option value="media">MÃ©dia</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="text-orange-600">Quanto?</span> (Custo estimado)
                            </label>
                            <input
                                type="text"
                                value={newAction.how_much_cost}
                                onChange={(e) => setNewAction({ ...newAction, how_much_cost: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Estimativa de custo..."
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <button
                            onClick={onCreateActionClick}
                            disabled={!newAction.title || isSubmitting}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <LoadingSpinner size="sm" />
                                    Criando...
                                </div>
                            ) : (
                                'Criar Ação'
                            )}
                        </button>
                        <button
                            onClick={() => setShowNewAction(false)}
                            className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Add Item Form */}
            {showAddItem && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Categoria (ex: EPIs, Equipamentos)"
                            value={newItem.category}
                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                            type="text"
                            placeholder="Descrição do item"
                            value={newItem.item_description}
                            onChange={(e) => setNewItem({ ...newItem, item_description: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <textarea
                        placeholder="Observações (opcional)"
                        value={newItem.observations}
                        onChange={(e) => setNewItem({ ...newItem, observations: e.target.value })}
                        className="w-full mt-4 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                    />
                    <div className="flex items-center gap-2 mt-4">
                        <button
                            onClick={onAddItemClick}
                            disabled={!newItem.category || !newItem.item_description || isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <LoadingSpinner size="sm" />
                                    Adicionando...
                                </div>
                            ) : (
                                'Adicionar'
                            )}
                        </button>
                        <button
                            onClick={() => setShowAddItem(false)}
                            className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Template Checklist */}
            {templateItems.length > 0 && (
                <div className="mb-8">
                    {/* Banner de aviso para inspeção finalizada */}
                    {inspection.status === 'concluida' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-amber-800">Inspeção Finalizada</p>
                                <p className="text-xs text-amber-700">Esta inspeção está concluída. Para fazer alterações, reabra a inspeção usando o botão "Reabrir".</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <ChecklistForm
                            key={`${inspection.id}-${inspection.status}`}
                            fields={templateItems.map((item, index) => {
                                const fieldData = JSON.parse(item.field_responses || '{}');
                                return {
                                    // Use item.id (inspection_item.id) as the field ID for proper backend mapping
                                    id: parseInt(item.id!),
                                    field_id: fieldData.field_id, // Keep original field_id for reference
                                    // Prioritize item_description from DB column over JSON which might be stale/corrupt
                                    field_name: item.item_description || fieldData.field_name,
                                    field_type: fieldData.field_type,
                                    is_required: fieldData.is_required || false,
                                    options: fieldData.options || null,
                                    order_index: index,
                                    template_id: item.template_id,
                                    compliance_enabled: fieldData.compliance_enabled ?? true,
                                    compliance_mode: fieldData.compliance_mode ?? 'auto',
                                    compliance_config: fieldData.compliance_config,
                                    // Pass initial values
                                    initial_value: fieldData.response_value,
                                    initial_comment: fieldData.comment,
                                    initial_compliance_status: fieldData.compliance_status,
                                    initial_ai_analysis: item.ai_pre_analysis
                                };
                            })}
                            onUpdateAiAnalysis={updateItemAnalysis as any} // Cast safely after checking usage
                            onSubmit={handleFormSubmit}
                            initialValues={responses}
                            readonly={inspection.status === 'concluida'}
                            inspectionId={inspection.id!}
                            inspectionItems={templateItems}
                            initialMedia={media.reduce((acc, m) => {
                                // Group media by inspection_item_id (which matches field.id in ChecklistForm)
                                const itemId = m.inspection_item_id;
                                if (itemId) {
                                    if (!acc[itemId]) acc[itemId] = [];
                                    acc[itemId].push(m);
                                }
                                return acc;
                            }, {} as Record<number, any[]>)}
                            showComplianceSelector={inspection?.compliance_enabled !== false}
                            onAutoSave={handleAutoSave}
                        />
                    </div>
                </div>
            )}

            {/* Manual Items */}
            <div className="space-y-4">
                <h3 className="font-heading text-lg font-semibold text-slate-900">
                    Itens Manuais
                </h3>

                {items.length === 0 && templateItems.length === 0 ? (
                    <div className="text-center py-8">
                        <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Nenhum item de checklist adicionado</p>
                        <p className="text-slate-400 text-sm mt-1">
                            Adicione itens para comeÃ§ar a inspeÃ§Ã£o
                        </p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-slate-500 text-sm">Nenhum item manual adicionado</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                                        {item.category}
                                    </span>
                                </div>
                                <p className="font-medium text-slate-900 mb-1">{item.item_description}</p>
                                {item.observations && (
                                    <p className="text-sm text-slate-600">{item.observations}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {item.is_compliant === null ? (
                                    <>
                                        <button
                                            onClick={() => updateItemCompliance(item.id!, item, true)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Marcar como conforme"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => updateItemCompliance(item.id!, item, false)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Marcar como não conforme"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => item.id && handleDeleteItem(item.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${item.is_compliant
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {item.is_compliant ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4" />
                                        )}
                                        <span className="text-sm font-medium">
                                            {item.is_compliant ? 'Conforme' : 'Não Conforme'}
                                        </span>
                                    </div>
                                )
                                }
                            </div >
                        </div >
                    ))
                )}
            </div >
        </div>
    );
}
