import { useState } from 'react';
import {
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Type,
  Star,
  Copy,
  Folder,
  GripVertical
} from 'lucide-react';
import { ChecklistTemplate, ChecklistField, ChecklistFieldType } from '@/shared/checklist-types';
import { Modal, ModalFooter } from './premium/Modal';
import { Card } from './premium/Card';
import { Button } from './premium/Button';

interface ChecklistPreviewProps {
  template: Partial<ChecklistTemplate>;
  fields: Partial<ChecklistField>[];
  onSave: (template: Partial<ChecklistTemplate>, fields: Partial<ChecklistField>[], folderId?: string | null) => void;
  onCancel: () => void;
  loading?: boolean;
  title: string;
  folders?: any[]; // Tree structure
  selectedFolderId?: string | null;
}

export default function ChecklistPreview({
  template,
  fields,
  onSave,
  onCancel,
  loading,
  title,
  folders,
  selectedFolderId: initialFolderId
}: ChecklistPreviewProps) {
  const [editedTemplate, setEditedTemplate] = useState<Partial<ChecklistTemplate>>(template);
  const [editedFields, setEditedFields] = useState<Partial<ChecklistField>[]>(fields);
  const [editingField, setEditingField] = useState<number | null>(null);
  const selectedFolderId = initialFolderId || null;

  // Helper to flatten tree for select
  const flattenFolders = (foldersList: any[], depth = 0): any[] => {
    return foldersList.reduce((acc, folder) => {
      acc.push({ ...folder, depth });
      if (folder.children) {
        acc.push(...flattenFolders(folder.children, depth + 1));
      }
      return acc;
    }, []);
  };

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
    { value: 'rating', label: 'Avaliação (1-5)' },
    { value: 'file', label: 'Upload de Arquivo/Foto' }
  ];

  const addField = () => {
    const newField: Partial<ChecklistField> = {
      field_name: 'Nova pergunta',
      field_type: 'text',
      is_required: false,
      options: '',
      order_index: editedFields.length
    };
    setEditedFields([...editedFields, newField]);
    setEditingField(editedFields.length);
  };

  const removeField = (index: number) => {
    const newFields = editedFields.filter((_, i) => i !== index);
    // Update order indices
    newFields.forEach((field, i) => {
      field.order_index = i;
    });
    setEditedFields(newFields);
    setEditingField(null);
  };

  const updateField = (index: number, updates: Partial<ChecklistField>) => {
    const newFields = [...editedFields];
    newFields[index] = { ...newFields[index], ...updates };
    setEditedFields(newFields);
  };

  const needsOptions = (fieldType: ChecklistFieldType) => {
    return ['select', 'multiselect', 'radio'].includes(fieldType);
  };

  const handleSave = () => {
    onSave(editedTemplate, editedFields, selectedFolderId);
  };

  const modalTitle = (
    <div className="flex flex-col">
      <span className="font-heading text-lg font-semibold text-slate-900 leading-tight">
        {title}
      </span>
      {selectedFolderId && folders && (
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-1">
          <Folder className="w-3 h-3" />
          <span>
            {flattenFolders(folders).find((f: any) => f.id === selectedFolderId)?.name || 'Pasta Desconhecida'}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={modalTitle}
      size="lg"
      className="h-[90vh] md:h-auto" // Force height on mobile for valid scrolling context
    >
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Document Title Section */}
        <Card variant="flat" className="p-4 md:p-6 bg-slate-50/50">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Nome do Template
          </label>
          <input
            type="text"
            required
            value={editedTemplate.name || ''}
            onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
            className="w-full text-xl md:text-2xl font-bold text-slate-900 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 transition-all placeholder-slate-300 bg-transparent"
            placeholder="Digite o nome do checklist..."
          />

          <input
            type="text"
            value={editedTemplate.description || ''}
            onChange={(e) => setEditedTemplate({ ...editedTemplate, description: e.target.value })}
            className="w-full text-sm text-slate-500 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 mt-2 transition-all placeholder-slate-400 bg-transparent"
            placeholder="Adicionar uma breve descrição (opcional)..."
          />
        </Card>

        {/* Fields Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-baseline gap-2">
              <h3 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Perguntas
              </h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                {editedFields.length} total
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {editedFields.map((field, index) => (
              <Card
                key={index}
                variant={editingField === index ? 'glass' : 'default'}
                className={`transition-all duration-300 ${editingField === index
                    ? 'ring-2 ring-blue-500 shadow-lg scale-[1.01]'
                    : 'hover:shadow-md hover:border-blue-200'
                  }`}
              >
                {editingField === index ? (
                  // Edit Mode
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="flex items-center text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        <Edit className="w-3 h-3 mr-1" />
                        Editando Item {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(index)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 h-8 w-8"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="h-4 w-px bg-slate-200 mx-1" />
                        <Button
                          size="sm"
                          onClick={() => setEditingField(null)}
                          className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-3"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          OK
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-8">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Pergunta / Item
                        </label>
                        <input
                          type="text"
                          value={field.field_name}
                          onChange={(e) => updateField(index, { field_name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                          placeholder="Digite a pergunta..."
                          autoFocus
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Tipo de Resposta
                        </label>
                        <div className="relative">
                          <select
                            value={field.field_type}
                            onChange={(e) => updateField(index, { field_type: e.target.value as ChecklistFieldType })}
                            className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white font-medium text-slate-700"
                          >
                            {fieldTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                            <Type className="w-3 h-3" />
                          </div>
                        </div>
                      </div>

                      {needsOptions(field.field_type as ChecklistFieldType) && (
                        <div className="md:col-span-12">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Opções (separadas por vírgula)
                          </label>
                          <input
                            type="text"
                            value={field.options || ''}
                            onChange={(e) => updateField(index, { options: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50"
                            placeholder="Opção 1, Opção 2, Opção 3"
                          />
                        </div>
                      )}

                      <div className="md:col-span-12 pt-1 border-t border-slate-100 mt-2">
                        <label className="inline-flex items-center cursor-pointer select-none group/toggle py-2">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={field.is_required}
                              onChange={(e) => updateField(index, { is_required: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </div>
                          <span className="ml-2 text-sm font-medium text-slate-600 group-hover/toggle:text-slate-900 transition-colors">
                            Resposta Obrigatória
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start gap-3 p-4 select-none cursor-pointer" onClick={() => setEditingField(index)}>
                    <div
                      className="flex-shrink-0 cursor-move text-slate-300 hover:text-slate-500 transition-colors p-1 -ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-600 rounded-full text-xs font-bold mt-0.5 font-mono">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-medium text-slate-900 text-sm leading-snug break-words">
                          {field.field_name}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide bg-slate-100 text-slate-500 border border-slate-200">
                          {fieldTypes.find(t => t.value === field.field_type)?.label}
                        </span>
                        {field.is_required && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide bg-red-50 text-red-600 border border-red-100">
                            <Star className="w-2.5 h-2.5 mr-1 fill-current" />
                            Obrigatório
                          </span>
                        )}
                      </div>

                      <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur shadow-sm rounded-lg p-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingField(index);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const duplicate = { ...field, order_index: editedFields.length };
                            setEditedFields([...editedFields, duplicate]);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Duplicar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(index);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                          disabled={editedFields.length === 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {field.options && (
                        <div className="mt-2 pl-2 border-l-2 border-slate-100">
                          <p className="text-xs text-slate-500 truncate max-w-lg">
                            <span className="font-semibold">Opções:</span> {field.options}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={addField}
              className="w-full border-dashed border-2 py-4 text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 justify-center h-auto flex-col gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span>Adicionar Nova Pergunta</span>
            </Button>
          </div>
        </div>

        {/* Modal Actions Fixed Bottom on Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 md:static md:hidden z-10 flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={loading}
            className="flex-1"
            icon={<Save className="w-4 h-4" />}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Desktop Footer - Using the ModalFooter component */}
      <div className="hidden md:block">
        <ModalFooter className="justify-end bg-white border-t-0 pt-0 pb-0">
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={loading}
            icon={<Save className="w-4 h-4" />}
          >
            {loading ? 'Salvando...' : 'Salvar Checklist'}
          </Button>
        </ModalFooter>
      </div>

    </Modal>
  );
}
