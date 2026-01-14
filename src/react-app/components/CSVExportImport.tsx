import { useState } from 'react';
import { 
  Download,
  Upload,
  FileText,
  Users,
  Building2,
  ClipboardList,
  Target,
  CheckSquare,
  AlertCircle
} from 'lucide-react';

interface CSVExportImportProps {
  type: 'organizations' | 'users' | 'inspections' | 'templates' | 'action-items';
  onImport?: (data: any[]) => void;
  onExport?: () => void;
  isLoading?: boolean;
}

export default function CSVExportImport({ type, onImport, onExport, isLoading }: CSVExportImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [importData, setImportData] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);

  const getTypeConfig = () => {
    switch (type) {
      case 'organizations':
        return {
          icon: Building2,
          label: 'Organizações',
          color: 'blue',
          sampleHeaders: 'nome,tipo,descricao,email_contato,telefone_contato,endereco',
          sampleRow: 'ABC Indústria Ltda,company,Empresa de manufatura,contato@abc.com,(11) 99999-9999,Rua das Indústrias 123'
        };
      case 'users':
        return {
          icon: Users,
          label: 'Usuários',
          color: 'green',
          sampleHeaders: 'email,nome,cargo,organizacao_id,telefone',
          sampleRow: 'joao@empresa.com,João Silva,inspector,1,(11) 98888-8888'
        };
      case 'inspections':
        return {
          icon: ClipboardList,
          label: 'Inspeções',
          color: 'purple',
          sampleHeaders: 'titulo,descricao,local,empresa,tecnico_nome,prioridade,data_agendada',
          sampleRow: 'Inspeção EPIs,Verificação de equipamentos,Galpão A,ABC Ltda,João Silva,alta,2024-01-15'
        };
      case 'templates':
        return {
          icon: CheckSquare,
          label: 'Templates de Checklist',
          color: 'orange',
          sampleHeaders: 'nome_campo,tipo_campo,obrigatorio,opcoes',
          sampleRow: 'Uso de capacetes,boolean,true,sim/não'
        };
      case 'action-items':
        return {
          icon: Target,
          label: 'Itens de Ação',
          color: 'red',
          sampleHeaders: 'titulo,descricao,local,responsavel,prazo,prioridade',
          sampleRow: 'Troca de EPIs,Substituir capacetes danificados,Setor A,João Silva,2024-02-01,alta'
        };
      default:
        return {
          icon: FileText,
          label: 'Dados',
          color: 'gray',
          sampleHeaders: '',
          sampleRow: ''
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      setShowImportModal(true);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileUpload(csvFile);
    } else {
      alert('Por favor, selecione um arquivo CSV válido.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const processImport = () => {
    if (!importData.trim()) {
      alert('Por favor, cole ou carregue os dados CSV.');
      return;
    }

    try {
      const lines = importData.trim().split('\n');
      if (lines.length < 2) {
        alert('O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      onImport?.(dataRows);
      setShowImportModal(false);
      setImportData('');
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      alert('Erro ao processar o arquivo CSV. Verifique o formato e tente novamente.');
    }
  };

  const downloadTemplate = () => {
    const content = `${config.sampleHeaders}\n${config.sampleRow}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `template_${type}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onExport}
          disabled={isLoading}
          className={`flex items-center justify-center px-4 py-2 ${
            config.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
            config.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
            config.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
            config.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
            config.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
            'bg-gray-600 hover:bg-gray-700'
          } text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exportar {config.label}
        </button>

        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          Baixar Modelo CSV
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 ${
                  config.color === 'blue' ? 'bg-blue-100' :
                  config.color === 'green' ? 'bg-green-100' :
                  config.color === 'purple' ? 'bg-purple-100' :
                  config.color === 'orange' ? 'bg-orange-100' :
                  config.color === 'red' ? 'bg-red-100' :
                  'bg-gray-100'
                } rounded-lg`}>
                  <Icon className={`w-6 h-6 ${
                    config.color === 'blue' ? 'text-blue-600' :
                    config.color === 'green' ? 'text-green-600' :
                    config.color === 'purple' ? 'text-purple-600' :
                    config.color === 'orange' ? 'text-orange-600' :
                    config.color === 'red' ? 'text-red-600' :
                    'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Importar {config.label}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Cole os dados CSV ou carregue um arquivo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 mb-2">
                Arraste um arquivo CSV aqui ou clique para selecionar
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Selecionar Arquivo
              </label>
            </div>

            {/* Text Import Option */}
            <div className="mt-4">
              <button
                onClick={() => setShowTextImport(!showTextImport)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showTextImport ? 'Esconder' : 'Mostrar'} opção de colar texto
              </button>
            </div>

            {showTextImport && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cole os dados CSV aqui:
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder={`${config.sampleHeaders}\n${config.sampleRow}`}
                />
              </div>
            )}

            {/* Sample Format */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Formato esperado:
              </h4>
              <div className="text-xs font-mono text-slate-600 space-y-1">
                <div className="font-semibold">{config.sampleHeaders}</div>
                <div>{config.sampleRow}</div>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> A importação irá adicionar novos registros. 
                  Certifique-se de que os dados estão corretos antes de proceder.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={processImport}
                disabled={!importData.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Importar Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
