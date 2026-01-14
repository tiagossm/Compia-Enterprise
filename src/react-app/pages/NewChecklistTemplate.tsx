import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import TemplateSuggestions from '@/react-app/components/TemplateSuggestions';
import OptionsEditor from '@/react-app/components/OptionsEditor';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical
} from 'lucide-react';
import { ChecklistTemplate, ChecklistField, ChecklistFieldType } from '@/shared/checklist-types';

export default function NewChecklistTemplate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [template, setTemplate] = useState<Partial<ChecklistTemplate>>({
    name: '',
    description: '',
    category: '',
    is_public: false
  });
  
  const [fields, setFields] = useState<Partial<ChecklistField>[]>([
    {
      field_name: '',
      field_type: 'text',
      is_required: false,
      options: '',
      order_index: 0
    }
  ]);

  const fieldTypes: { value: ChecklistFieldType; label: string }[] = [
    { value: 'text', label: 'Texto Curto' },
    { value: 'textarea', label: 'Texto Longo' },
    { value: 'select', label: 'Lista Suspensa' },
    { value: 'multiselect', label: 'Múltipla Escolha' },
    { value: 'radio', label: 'Escolha Única' },
    { value: 'checkbox', label: 'Caixa de Seleção' },
    { value: 'boolean', label: 'Conforme/Não Conforme' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
    { value: 'time', label: 'Hora' },
    { value: 'rating', label: 'Avaliação (1-5)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // VALIDAÇÃO CRÍTICA: Verificar se todos os campos que precisam de opções têm opções válidas
    const fieldsRequiringOptions = ['select', 'multiselect', 'radio'];
    const invalidFields: number[] = [];
    
    fields.forEach((field, index) => {
      if (field.field_type && fieldsRequiringOptions.includes(field.field_type)) {
        let hasValidOptions = false;
        
        try {
          if (field.options) {
            const parsed = JSON.parse(field.options);
            hasValidOptions = Array.isArray(parsed) && parsed.length > 0 && parsed.some(opt => opt && opt.trim() !== '');
          }
        } catch {
          hasValidOptions = field.options ? field.options.trim().length > 0 : false;
        }
        
        if (!hasValidOptions) {
          invalidFields.push(index + 1);
        }
      }
    });
    
    if (invalidFields.length > 0) {
      alert(`Os seguintes campos precisam ter opções configuradas: Campo(s) ${invalidFields.join(', ')}. Por favor, adicione as opções necessárias antes de salvar.`);
      setLoading(false);
      return;
    }

    try {
      // Create template
      const templateResponse = await fetch('/api/checklist/checklist-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (!templateResponse.ok) throw new Error('Erro ao criar template');
      
      const templateResult = await templateResponse.json();
      const templateId = templateResult.id;

      // Create fields
      for (const field of fields) {
        if (field.field_name) {
          await fetch('/api/checklist/checklist-fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...field,
              template_id: templateId
            })
          });
        }
      }

      navigate('/checklists');
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar template. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    setFields([...fields, {
      field_name: '',
      field_type: 'text',
      is_required: false,
      options: '',
      order_index: fields.length
    }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<ChecklistField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    
    // Se o tipo de campo mudou para um que precisa de opções e não há opções, fornecer padrões
    if (updates.field_type && needsOptions(updates.field_type)) {
      const currentField = newFields[index];
      let hasValidOptions = false;
      
      try {
        if (currentField.options) {
          const parsed = JSON.parse(currentField.options);
          hasValidOptions = Array.isArray(parsed) && parsed.length > 0;
        }
      } catch {
        hasValidOptions = currentField.options ? currentField.options.trim().length > 0 : false;
      }
      
      if (!hasValidOptions) {
        const defaultOptions = updates.field_type === 'multiselect' 
          ? ['Adequado', 'Inadequado', 'Não Verificado', 'Não Aplicável']
          : ['Conforme', 'Não Conforme', 'Não Aplicável'];
        newFields[index].options = JSON.stringify(defaultOptions);
      }
    }
    
    setFields(newFields);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < fields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      
      // Update order indices
      newFields.forEach((field, i) => {
        field.order_index = i;
      });
      
      setFields(newFields);
    }
  };

  const needsOptions = (fieldType: ChecklistFieldType) => {
    return ['select', 'multiselect', 'radio'].includes(fieldType);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/checklists')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Novo Template de Checklist
            </h1>
            <p className="text-slate-600 mt-1">
              Crie um template personalizado para suas inspeções
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
              Informações do Template
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TemplateSuggestions
                label="Nome do Template"
                name="name"
                value={template.name || ''}
                onChange={(value) => setTemplate({ ...template, name: value })}
                placeholder="Ex: Checklist de EPIs"
                required={true}
                type="name"
              />

              <TemplateSuggestions
                label="Categoria"
                name="category"
                value={template.category || ''}
                onChange={(value) => setTemplate({ ...template, category: value })}
                placeholder="Ex: Segurança do Trabalho"
                required={true}
                type="category"
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={template.description}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descreva o objetivo e uso deste template..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={template.is_public}
                    onChange={(e) => setTemplate({ ...template, is_public: e.target.checked })}
                    className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">
                    Tornar este template público (outros usuários poderão visualizar e usar)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-semibold text-slate-900">
                Campos do Checklist
              </h2>
              <button
                type="button"
                onClick={addField}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Campo
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      Campo {index + 1}
                    </span>
                    <div className="flex-1"></div>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nome do Campo
                      </label>
                      <input
                        type="text"
                        value={field.field_name}
                        onChange={(e) => updateField(index, { field_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Estado dos EPIs"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tipo do Campo
                      </label>
                      <select
                        value={field.field_type}
                        onChange={(e) => updateField(index, { field_type: e.target.value as ChecklistFieldType })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(e) => updateField(index, { is_required: e.target.checked })}
                          className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Obrigatório</span>
                      </label>
                    </div>
                  </div>

                  {needsOptions(field.field_type!) && (
                    <div className="mt-4">
                      <OptionsEditor
                        value={field.options || ''}
                        onChange={(value) => updateField(index, { options: value })}
                        fieldType={field.field_type!}
                        placeholder={field.field_type === 'multiselect' 
                          ? "Adequado, Inadequado, Não Verificado, Não Aplicável"
                          : "Conforme, Não Conforme, Não Aplicável"
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/checklists')}
              className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Criando...' : 'Criar Template'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
