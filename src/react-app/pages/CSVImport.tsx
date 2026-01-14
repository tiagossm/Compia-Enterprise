import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import ChecklistPreview from '@/react-app/components/ChecklistPreview';
import TemplateSuggestions from '@/react-app/components/TemplateSuggestions';
import {
  Upload,
  ArrowLeft,
  Download,
  FileText,
  Check,
  Info
} from 'lucide-react';
import { CSVImport as CSVImportType } from '@/shared/checklist-types';

export default function CSVImport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importData, setImportData] = useState<CSVImportType>({
    template_name: '',
    category: '',
    csv_data: ''
  });
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    fetchFolderTree();
  }, []);

  const fetchFolderTree = async () => {
    try {
      const response = await fetch('/api/checklist/tree');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.tree || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
    }
  };

  const sampleCSV = `campo,tipo,obrigatorio,opcoes
Nome do Funcionário,text,true,
Data da Inspeção,date,true,
EPIs Adequados,boolean,true,
Estado dos Equipamentos,select,true,"Bom,Regular,Ruim"
Observações,textarea,false,
Avaliação Geral,rating,true,`;

  const fieldTypeMap: Record<string, string> = {
    'text': 'Texto Curto',
    'textarea': 'Texto Longo',
    'select': 'Lista Suspensa',
    'boolean': 'Conforme/Não Conforme',
    'date': 'Data',
    'time': 'Hora',
    'number': 'Número',
    'rating': 'Avaliação (1-5)',
    'checkbox': 'Caixa de Seleção',
    'radio': 'Escolha Única',
    'multiselect': 'Múltipla Escolha',
    'file': 'Upload de Arquivo'
  };

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_checklist.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
        parseCSV(content);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (data: string) => {
    try {
      const lines = data.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      if (!headers.includes('campo') || !headers.includes('tipo')) {
        alert('CSV deve conter pelo menos as colunas "campo" e "tipo"');
        return;
      }

      const parsed = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const field: any = { order_index: index };

        headers.forEach((header, i) => {
          if (header === 'campo') {
            field.field_name = values[i];
          } else if (header === 'tipo') {
            field.field_type = values[i];
          } else if (header === 'obrigatorio') {
            field.is_required = values[i]?.toLowerCase() === 'true';
          } else if (header === 'opcoes') {
            field.options = values[i] ? JSON.stringify(values[i].split('|')) : '';
          }
        });

        return field;
      }).filter(field => field.field_name && field.field_type);

      setPreview(parsed);
    } catch (error) {
      console.error('Erro ao parsear CSV:', error);
      alert('Erro ao processar o arquivo CSV. Verifique o formato.');
    }
  };

  const handleTextareaChange = (value: string) => {
    setCsvData(value);
    if (value.trim()) {
      parseCSV(value);
    } else {
      setPreview([]);
    }
  };

  const handlePreview = () => {
    if (!importData.template_name || !importData.category || !csvData) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    setShowPreview(true);
  };

  const handleSave = async (template: any, fields: any[], folder_id?: string | null) => {
    setLoading(true);
    try {
      // Create template
      const templateResponse = await fetch('/api/checklist/checklist-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...template, folder_id })
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

      navigate(`/checklists/${templateId}`);
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      alert('Erro ao salvar template. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
            <h1 className="font-heading text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg">
                <Upload className="w-6 h-6 text-white" />
              </div>
              Importar Checklist via CSV
            </h1>
            <p className="text-slate-600 mt-1">
              Importe checklists de arquivos CSV ou planilhas
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Como importar seu checklist</h3>
              <div className="text-blue-800 text-sm space-y-2">
                <p>1. Baixe o modelo CSV clicando no botão abaixo</p>
                <p>2. Preencha o arquivo com seus campos de checklist</p>
                <p>3. Faça upload do arquivo ou cole o conteúdo na área de texto</p>
                <p>4. Revise a prévia e clique em "Importar Template"</p>
              </div>
              <button
                onClick={downloadSample}
                className="flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Modelo CSV
              </button>
            </div>
          </div>
        </div>

        {/* Template Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
            Informações do Template
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TemplateSuggestions
              label="Nome do Template"
              name="template_name"
              value={importData.template_name}
              onChange={(value) => setImportData({ ...importData, template_name: value })}
              placeholder="Ex: Checklist de Segurança Importado"
              required={true}
              type="name"
            />

            <TemplateSuggestions
              label="Categoria"
              name="category"
              value={importData.category}
              onChange={(value) => setImportData({ ...importData, category: value })}
              placeholder="Ex: Segurança, Equipamentos, Higiene"
              required={true}
              type="category"
            />
          </div>
        </div>

        {/* CSV Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
            Dados do Checklist
          </h2>

          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload de Arquivo CSV
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">
                  Arraste e solte seu arquivo CSV aqui ou clique para selecionar
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </label>
              </div>
            </div>

            {/* Text Area */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ou cole os dados CSV aqui
              </label>
              <textarea
                rows={8}
                value={csvData}
                onChange={(e) => handleTextareaChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="campo,tipo,obrigatorio,opcoes
Nome do Funcionário,text,true,
Data da Inspeção,date,true,
EPIs Adequados,boolean,true,"
              />
            </div>
          </div>
        </div>

        {/* Preview Button */}
        {preview.length > 0 && !showPreview && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              CSV Processado ({preview.length} campos detectados)
            </h2>

            <div className="space-y-4 max-h-60 overflow-y-auto">
              {preview.slice(0, 3).map((field, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm flex items-center gap-2">
                        {field.field_name}
                        {field.is_required && <span className="text-red-500 text-xs">*</span>}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Tipo: {fieldTypeMap[field.field_type] || field.field_type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {preview.length > 3 && (
                <p className="text-sm text-slate-500 text-center">
                  ... e mais {preview.length - 3} campos
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => {
                  setCsvData('');
                  setPreview([]);
                }}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || !importData.template_name || !importData.category}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                Visualizar e Editar Template
              </button>
            </div>
          </div>
        )}

        {/* Checklist Preview */}
        {showPreview && (
          <ChecklistPreview
            template={{
              name: importData.template_name,
              description: `Template importado de CSV`,
              category: importData.category,
              created_by: 'CSV Import',
              is_public: false
            }}
            fields={preview}
            onSave={handleSave}
            onCancel={() => setShowPreview(false)}
            loading={loading}
            title="Preview do Template Importado"
            folders={folders}
          />
        )}

        {/* Field Types Reference */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h3 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Tipos de Campo Suportados
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(fieldTypeMap).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <code className="bg-slate-200 px-2 py-1 rounded text-xs">{key}</code>
                <span className="text-slate-700">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-300">
            <h4 className="font-medium text-slate-800 mb-2">Formato das opções:</h4>
            <p className="text-sm text-slate-600">
              Para campos de tipo <code className="bg-slate-200 px-1 rounded">select</code>,
              <code className="bg-slate-200 px-1 rounded mx-1">radio</code> ou
              <code className="bg-slate-200 px-1 rounded ml-1">multiselect</code>,
              separe as opções com pipe (|). Exemplo: "Bom|Regular|Ruim"
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
