import { useState } from 'react';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';

interface NewActionFormProps {
    onCreateAction: (action: any) => Promise<boolean> | boolean | void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function NewActionForm({ onCreateAction, onCancel, isSubmitting }: NewActionFormProps) {
    const [newAction, setNewAction] = useState({
        title: '',
        what_description: '',
        where_location: '',
        why_reason: '',
        how_method: '',
        who_responsible: '',
        when_deadline: '',
        how_much_cost: '',
        status: 'pending' as const,
        priority: 'media' as 'baixa' | 'media' | 'alta'
    });

    const handleSubmit = async () => {
        if (!newAction.title) return;
        const success = await onCreateAction(newAction);
        if (success !== false) {
            setNewAction({
                title: '', what_description: '', where_location: '', why_reason: '',
                how_method: '', who_responsible: '', when_deadline: '', how_much_cost: '',
                status: 'pending', priority: 'media'
            });
        }
    };

    return (
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
                        placeholder="Local específico..."
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
                        placeholder="Justificativa da ação..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        <span className="text-indigo-600">Como?</span> (Método)
                    </label>
                    <textarea
                        value={newAction.how_method}
                        onChange={(e) => setNewAction({ ...newAction, how_method: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Como será executado..."
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
                        <option value="media">Média</option>
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
                    onClick={handleSubmit}
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
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
