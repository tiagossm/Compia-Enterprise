import { useState } from 'react';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';

interface NewItemFormProps {
    onAddItem: (item: any) => Promise<boolean> | boolean | void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function NewItemForm({ onAddItem, onCancel, isSubmitting }: NewItemFormProps) {
    const [newItem, setNewItem] = useState({
        category: '',
        item_description: '',
        is_compliant: null as boolean | null,
        observations: ''
    });

    const handleSubmit = async () => {
        if (!newItem.category || !newItem.item_description) return;
        const success = await onAddItem(newItem);
        if (success !== false) { // Assuming void or true means success
            setNewItem({ category: '', item_description: '', is_compliant: null, observations: '' });
        }
    };

    return (
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
                    onClick={handleSubmit}
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
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
