import { Trash2, AlertTriangle, AlertCircle, CheckCircle2, Check, X } from 'lucide-react';
import { InspectionItemType } from '@/shared/types';

interface ManualItemsListProps {
    items: InspectionItemType[];
    hasTemplateItems: boolean;
    updateItemCompliance: (itemId: number, item: InspectionItemType, isCompliant: boolean) => Promise<boolean> | Promise<void> | void;
    handleDeleteItem: (itemId: number) => Promise<boolean> | Promise<void> | void;
}

export default function ManualItemsList({
    items,
    hasTemplateItems,
    updateItemCompliance,
    handleDeleteItem
}: ManualItemsListProps) {
    return (
        <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-slate-900">
                Itens Manuais
            </h3>

            {items.length === 0 && !hasTemplateItems ? (
                <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhum item de checklist adicionado</p>
                    <p className="text-slate-400 text-sm mt-1">
                        Adicione itens para começar a inspeção
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
    );
}
