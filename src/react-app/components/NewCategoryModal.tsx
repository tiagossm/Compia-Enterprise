import { useState } from 'react';
import { 
  X, 
  Folder, 
  Shield, 
  BookOpen, 
  Settings, 
  Leaf, 
  Award, 
  Cog, 
  HardHat, 
  Mountain, 
  ShieldCheck, 
  UserCheck,
  FileText,
  Save
} from 'lucide-react';

interface NewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: any) => void;
  parentFolder?: any;
  loading?: boolean;
}

const ICON_OPTIONS = [
  { name: 'folder', icon: Folder, label: 'Pasta' },
  { name: 'shield', icon: Shield, label: 'Segurança' },
  { name: 'book-open', icon: BookOpen, label: 'Normas' },
  { name: 'settings', icon: Settings, label: 'Equipamentos' },
  { name: 'leaf', icon: Leaf, label: 'Meio Ambiente' },
  { name: 'award', icon: Award, label: 'Qualidade' },
  { name: 'cog', icon: Cog, label: 'Máquinas' },
  { name: 'hard-hat', icon: HardHat, label: 'Construção' },
  { name: 'mountain', icon: Mountain, label: 'Altura' },
  { name: 'shield-check', icon: ShieldCheck, label: 'EPIs' },
  { name: 'user-check', icon: UserCheck, label: 'Ergonomia' },
  { name: 'file-text', icon: FileText, label: 'Documentos' }
];

const COLOR_OPTIONS = [
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
  '#059669', // Emerald
  '#DC2626', // Dark Red
  '#7C3AED'  // Violet
];

export default function NewCategoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  parentFolder, 
  loading = false 
}: NewCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    folder_icon: 'folder',
    folder_color: '#3B82F6',
    is_public: false,
    parent_category_id: parentFolder?.id || null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave({
        ...formData,
        category: formData.category || formData.name
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      folder_icon: 'folder',
      folder_color: '#3B82F6',
      is_public: false,
      parent_category_id: parentFolder?.id || null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" role="dialog" aria-labelledby="category-modal-title" aria-describedby="category-modal-description">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${formData.folder_color}20` }}
            >
              <div style={{ color: formData.folder_color }}>
                {(() => {
                  const selectedIcon = ICON_OPTIONS.find(opt => opt.name === formData.folder_icon);
                  const IconComponent = selectedIcon ? selectedIcon.icon : Folder;
                  return <IconComponent className="w-6 h-6" />;
                })()}
              </div>
            </div>
            <div>
              <h3 id="category-modal-title" className="text-lg font-semibold text-slate-900">
                {parentFolder ? `Nova Subcategoria em ${parentFolder.name}` : 'Nova Categoria Principal'}
              </h3>
              <p id="category-modal-description" className="text-sm text-slate-600">
                Organize seus templates em pastas hierárquicas
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome da Categoria *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: NR-12, Equipamentos de Proteção, etc."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descreva o tipo de templates que esta categoria irá conter..."
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Ícone da Categoria
            </label>
            <div className="grid grid-cols-6 gap-3">
              {ICON_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, folder_icon: option.name })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.folder_icon === option.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    title={option.label}
                  >
                    <IconComponent 
                      className="w-5 h-5" 
                      style={{ color: formData.folder_icon === option.name ? formData.folder_color : '#64748b' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Cor da Categoria
            </label>
            <div className="grid grid-cols-6 gap-3">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, folder_color: color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.folder_color === color
                      ? 'border-slate-900 scale-110'
                      : 'border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Public Option */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">
                Tornar esta categoria pública (outros usuários poderão ver)
              </span>
            </label>
          </div>

          {/* Preview */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Preview da Categoria</h4>
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${formData.folder_color}20` }}
              >
                <div style={{ color: formData.folder_color }}>
                  {(() => {
                    const selectedIcon = ICON_OPTIONS.find(opt => opt.name === formData.folder_icon);
                    const IconComponent = selectedIcon ? selectedIcon.icon : Folder;
                    return <IconComponent className="w-5 h-5" />;
                  })()}
                </div>
              </div>
              <div>
                <h5 className="font-medium text-slate-900">
                  {formData.name || 'Nome da Categoria'}
                </h5>
                {formData.description && (
                  <p className="text-sm text-slate-600 mt-1">
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Criando...' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
