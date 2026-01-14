import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface OptionsEditorProps {
  value: string; // JSON string or pipe-separated
  onChange: (value: string) => void;
  fieldType: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function OptionsEditor({ 
  value, 
  onChange, 
  fieldType, 
  disabled = false 
}: OptionsEditorProps) {
  const [options, setOptions] = useState<string[]>([]);

  // Parse initial value
  useEffect(() => {
    let parsedOptions: string[] = [];
    
    if (!value || value.trim() === '') {
      // Set default options based on field type
      parsedOptions = getDefaultOptions(fieldType);
    } else {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          parsedOptions = parsed.filter(opt => opt && typeof opt === 'string' && opt.trim() !== '');
        } else {
          throw new Error('Not an array');
        }
      } catch {
        // Try pipe-separated format
        const pipeSeparated = value.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);
        parsedOptions = pipeSeparated.length > 0 ? pipeSeparated : getDefaultOptions(fieldType);
      }
    }

    // Ensure at least one option
    if (parsedOptions.length === 0) {
      parsedOptions = getDefaultOptions(fieldType);
    }

    setOptions(parsedOptions);
    
    // Update parent if options changed
    const jsonValue = JSON.stringify(parsedOptions);
    if (jsonValue !== value) {
      onChange(jsonValue);
    }
  }, [value, fieldType]);

  const getDefaultOptions = (fieldType: string): string[] => {
    switch (fieldType) {
      case 'multiselect':
        return ['Adequado', 'Inadequado', 'Não Verificado', 'Não Aplicável'];
      case 'select':
      case 'radio':
        return ['Conforme', 'Não Conforme', 'Não Aplicável'];
      case 'checkbox':
        return ['Sim', 'Não'];
      default:
        return ['Opção 1', 'Opção 2'];
    }
  };

  const updateOptions = (newOptions: string[]) => {
    const filteredOptions = newOptions.filter(opt => opt && opt.trim() !== '');
    
    // Ensure at least one option or use defaults
    if (filteredOptions.length === 0) {
      const defaultOptions = getDefaultOptions(fieldType);
      setOptions(defaultOptions);
      onChange(JSON.stringify(defaultOptions));
      return;
    }
    
    setOptions(filteredOptions);
    onChange(JSON.stringify(filteredOptions));
  };

  const addOption = () => {
    const newOptions = [...options, ''];
    updateOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length <= 1) return; // Keep at least one option
    const newOptions = options.filter((_, i) => i !== index);
    updateOptions(newOptions);
  };

  const updateOption = (index: number, newValue: string) => {
    const newOptions = [...options];
    newOptions[index] = newValue;
    setOptions(newOptions);
    
    // Only update parent when user stops typing (debounced)
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      const filteredOptions = newOptions.filter(opt => opt.trim() !== '');
      // Ensure we always have valid JSON with at least default options
      const finalOptions = filteredOptions.length > 0 ? filteredOptions : getDefaultOptions(fieldType);
      onChange(JSON.stringify(finalOptions));
    }, 300);
  };

  let updateTimeout: NodeJS.Timeout;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
      
      // Focus the new input after a short delay
      setTimeout(() => {
        const nextInput = document.querySelector(`input[data-option-index="${options.length}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }, 50);
    }
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < options.length) {
      const newOptions = [...options];
      [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
      updateOptions(newOptions);
    }
  };

  const getFieldTypeLabel = (fieldType: string) => {
    switch (fieldType) {
      case 'multiselect': return 'múltipla escolha';
      case 'select': return 'lista suspensa';
      case 'radio': return 'escolha única';
      case 'checkbox': return 'caixa de seleção';
      default: return 'este campo';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          Opções para {getFieldTypeLabel(fieldType)} *
        </label>
        <button
          type="button"
          onClick={addOption}
          disabled={disabled}
          className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
            {/* Move buttons */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveOption(index, 'up')}
                disabled={index === 0 || disabled}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                title="Mover para cima"
              >
                <GripVertical className="w-3 h-3 rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => moveOption(index, 'down')}
                disabled={index === options.length - 1 || disabled}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                title="Mover para baixo"
              >
                <GripVertical className="w-3 h-3 -rotate-90" />
              </button>
            </div>

            {/* Option number */}
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center justify-center">
              {index + 1}
            </span>

            {/* Option input */}
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              placeholder={`Opção ${index + 1}`}
              disabled={disabled}
              data-option-index={index}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeOption(index)}
              disabled={options.length <= 1 || disabled}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Remover opção"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {options.length === 0 && (
        <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-300 rounded-lg">
          Nenhuma opção definida. Clique em "Adicionar" para começar.
        </div>
      )}

      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border">
        <div className="flex items-start gap-2">
          <span className="font-medium text-green-600">✓</span>
          <div>
            <p><strong>Pressione Enter</strong> no campo de texto para adicionar uma nova opção rapidamente.</p>
            <p className="mt-1">Campos de {getFieldTypeLabel(fieldType)} precisam de pelo menos uma opção válida.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
