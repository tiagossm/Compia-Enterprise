import { useState } from 'react';
import { Save, X } from 'lucide-react';

interface ActionItem {
  id?: number;
  inspection_id: number;
  inspection_item_id?: number;
  title: string;
  what_description?: string;
  where_location?: string;
  why_reason?: string;
  how_method?: string;
  who_responsible?: string;
  when_deadline?: string;
  how_much_cost?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'baixa' | 'media' | 'alta';
  is_ai_generated: boolean;
}

interface Inspection {
  action_plan_type: '5w2h' | 'simple';
}

interface ActionItemFormProps {
  action: Partial<ActionItem>;
  inspection: Inspection | null;
  onSave: (action: Partial<ActionItem>) => void;
  onCancel: () => void;
}

export default function ActionItemForm({ action, inspection, onSave, onCancel }: ActionItemFormProps) {
  const [formData, setFormData] = useState({ ...action });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Título da Ação *
          </label>
          <input
            type="text"
            required
            value={formData.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Instalar equipamento de proteção"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <span className="text-red-600">O que?</span> (Descrição)
          </label>
          <textarea
            value={formData.what_description || ''}
            onChange={(e) => updateField('what_description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="O que precisa ser feito..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <span className="text-green-600">Onde?</span> (Local)
          </label>
          <input
            type="text"
            value={formData.where_location || ''}
            onChange={(e) => updateField('where_location', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Local específico..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <span className="text-blue-600">Por que?</span> (Justificativa)
          </label>
          <textarea
            value={formData.why_reason || ''}
            onChange={(e) => updateField('why_reason', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Justificativa da ação..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <span className="text-indigo-600">Como?</span> (Método)
          </label>
          <textarea
            value={formData.how_method || ''}
            onChange={(e) => updateField('how_method', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Como será executado..."
          />
        </div>

        {inspection?.action_plan_type === '5w2h' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <span className="text-purple-600">Quem?</span> (Responsável)
              </label>
              <input
                type="text"
                value={formData.who_responsible || ''}
                onChange={(e) => updateField('who_responsible', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Responsável pela execução..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <span className="text-yellow-600">Quando?</span> (Prazo)
              </label>
              <input
                type="date"
                value={formData.when_deadline || ''}
                onChange={(e) => updateField('when_deadline', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <span className="text-orange-600">Quanto?</span> (Custo)
              </label>
              <input
                type="text"
                value={formData.how_much_cost || ''}
                onChange={(e) => updateField('how_much_cost', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Estimativa de custo..."
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
          <select
            value={formData.status || 'pending'}
            onChange={(e) => updateField('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluída</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Prioridade</label>
          <select
            value={formData.priority || 'media'}
            onChange={(e) => updateField('priority', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </button>
      </div>
    </form>
  );
}
