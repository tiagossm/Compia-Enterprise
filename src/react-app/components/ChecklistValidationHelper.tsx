import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ChecklistField } from '@/shared/checklist-types';

interface ChecklistValidationHelperProps {
  fields: Partial<ChecklistField>[];
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  fieldIndex: number;
  message: string;
  suggestion?: string;
}

export default function ChecklistValidationHelper({ fields }: ChecklistValidationHelperProps) {
  const validateFields = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const fieldsRequiringOptions = ['select', 'multiselect', 'radio'];
    
    fields.forEach((field, index) => {
      // Nome do campo obrigatório
      if (!field.field_name || field.field_name.trim() === '') {
        issues.push({
          type: 'error',
          fieldIndex: index,
          message: `Campo ${index + 1}: Nome é obrigatório`,
          suggestion: 'Adicione um nome descritivo para este campo'
        });
      }
      
      // Verificar se campos que precisam de opções têm opções válidas
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
          const fieldTypeLabel = field.field_type === 'select' ? 'Lista Suspensa' 
            : field.field_type === 'multiselect' ? 'Múltipla Escolha' 
            : 'Escolha Única';
          
          issues.push({
            type: 'error',
            fieldIndex: index,
            message: `Campo ${index + 1}: Tipo "${fieldTypeLabel}" requer opções`,
            suggestion: 'Adicione pelo menos uma opção válida para este campo'
          });
        }
      }
      
      // Avisos sobre nomes de campos muito longos
      if (field.field_name && field.field_name.length > 200) {
        issues.push({
          type: 'warning',
          fieldIndex: index,
          message: `Campo ${index + 1}: Nome muito longo (${field.field_name.length} caracteres)`,
          suggestion: 'Considere um nome mais conciso para melhor usabilidade'
        });
      }
      
      // Informações sobre campos obrigatórios
      if (field.is_required && (!field.field_name || field.field_name.trim() === '')) {
        issues.push({
          type: 'info',
          fieldIndex: index,
          message: `Campo ${index + 1}: Marcado como obrigatório`,
          suggestion: 'Campos obrigatórios devem ser preenchidos pelos usuários'
        });
      }
    });
    
    return issues;
  };

  const issues = validateFields();
  const errors = issues.filter(issue => issue.type === 'error');
  const warnings = issues.filter(issue => issue.type === 'warning');
  const infos = issues.filter(issue => issue.type === 'info');

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-green-800">Template válido</h3>
            <p className="text-sm text-green-600 mt-1">
              Todos os campos estão configurados corretamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Erros encontrados ({errors.length})
              </h3>
              <div className="mt-2 space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600">
                    <p className="font-medium">{error.message}</p>
                    {error.suggestion && (
                      <p className="text-red-500 ml-4">💡 {error.suggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Avisos ({warnings.length})
              </h3>
              <div className="mt-2 space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-600">
                    <p className="font-medium">{warning.message}</p>
                    {warning.suggestion && (
                      <p className="text-yellow-500 ml-4">💡 {warning.suggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {infos.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Informações ({infos.length})
              </h3>
              <div className="mt-2 space-y-2">
                {infos.map((info, index) => (
                  <div key={index} className="text-sm text-blue-600">
                    <p className="font-medium">{info.message}</p>
                    {info.suggestion && (
                      <p className="text-blue-500 ml-4">💡 {info.suggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
