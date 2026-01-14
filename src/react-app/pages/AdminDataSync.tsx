import { useState } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import Layout from '@/react-app/components/Layout';
import { ExtendedMochaUser } from '@/shared/user-types';
import { Download, Database, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface ExportData {
  timestamp: string;
  exported_by: string;
  total_counts: {
    inspections: number;
    inspection_items: number;
    action_items: number;
    checklist_templates: number;
    checklist_fields: number;
    organizations: number;
    users: number;
    inspection_media: number;
    ai_assistants: number;
  };
  data: any;
}

export default function AdminDataSync() {
  const { user } = useAuth();
  const extendedUser = user as ExtendedMochaUser;
  const [loading, setLoading] = useState(false);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importData, setImportData] = useState<File | null>(null);

  // Check if user is system admin
  if (!extendedUser?.profile || (extendedUser.profile.role !== 'system_admin' && extendedUser.profile.role !== 'sys_admin')) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Acesso Negado
            </h2>
            <p className="text-red-700">
              Apenas administradores do sistema podem acessar esta funcionalidade.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const exportAllData = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/export-all-data');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setExportData(data);
      setMessage({
        type: 'success',
        text: `Dados exportados com sucesso! Total de ${data.total_counts.inspections} inspeções encontradas.`
      });


    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      setMessage({
        type: 'error',
        text: `Erro ao exportar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExportData = () => {
    if (!exportData) return;
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compia-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const checkProdData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/inspections-all');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMessage({
        type: 'info',
        text: `Produção tem ${data.total_count} inspeções totais (bypass de filtros ativo).`
      });
    } catch (error) {
      console.error('Erro ao verificar dados da produção:', error);
      setMessage({
        type: 'error',
        text: `Erro ao verificar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const importAllData = async () => {
    if (!importData) {
      setMessage({
        type: 'error',
        text: 'Selecione um arquivo JSON para importar.'
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const fileContent = await importData.text();
      let jsonData;

      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Arquivo JSON inválido');
      }

      if (!jsonData.data || !jsonData.total_counts) {
        throw new Error('Formato de arquivo inválido. Use apenas arquivos exportados do COMPIA.');
      }

      const response = await fetch('/api/admin/import-all-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setMessage({
        type: 'success',
        text: `Dados importados com sucesso! ${result.imported_counts?.inspections || 0} inspeções, ${result.imported_counts?.organizations || 0} organizações importadas.`
      });

      // Clear import data
      setImportData(null);

    } catch (error) {
      console.error('Erro ao importar dados:', error);
      setMessage({
        type: 'error',
        text: `Erro ao importar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setMessage({
          type: 'error',
          text: 'Selecione apenas arquivos JSON.'
        });
        return;
      }
      setImportData(file);
      setMessage({
        type: 'info',
        text: `Arquivo selecionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Sincronização de Dados - Produção para Desenvolvimento
              </h1>
              <p className="text-slate-600">
                Ferramentas administrativas para sincronizar dados entre ambientes
              </p>
            </div>
          </div>

          {/* Alert de permissão */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">Atenção</h3>
                <p className="text-amber-800 text-sm">
                  Esta funcionalidade está disponível apenas para SYSTEM_ADMIN e irá contornar todos os filtros de permissão para exportar dados da produção.
                </p>
              </div>
            </div>
          </div>

          {/* Message display */}
          {message && (
            <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 border border-green-200' :
              message.type === 'error' ? 'bg-red-50 border border-red-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
              <div className="flex items-start gap-3">
                {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                {message.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />}
                {message.type === 'info' && <Database className="w-5 h-5 text-blue-600 mt-0.5" />}
                <p className={`text-sm ${message.type === 'success' ? 'text-green-800' :
                  message.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={checkProdData}
              disabled={loading}
              className="flex items-center justify-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <Database className="w-5 h-5 text-blue-600" />
              )}
              <span className="font-medium text-blue-900">
                Verificar Dados da Produção
              </span>
            </button>

            <button
              onClick={exportAllData}
              disabled={loading}
              className="flex items-center justify-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-green-600" />
              )}
              <span className="font-medium text-green-900">
                Exportar Todos os Dados
              </span>
            </button>

            <div className="space-y-3">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-orange-50 file:text-orange-700
                  hover:file:bg-orange-100"
              />
              <button
                onClick={importAllData}
                disabled={loading || !importData}
                className="flex items-center justify-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50 w-full"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                ) : (
                  <Database className="w-5 h-5 text-orange-600" />
                )}
                <span className="font-medium text-orange-900">
                  Importar Dados de Produção
                </span>
              </button>
            </div>
          </div>

          {/* Export data display */}
          {exportData && (
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Dados Exportados
                </h3>
                <button
                  onClick={downloadExportData}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar JSON
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {exportData.total_counts.inspections}
                  </div>
                  <div className="text-sm text-slate-600">Inspeções</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {exportData.total_counts.inspection_items}
                  </div>
                  <div className="text-sm text-slate-600">Itens</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {exportData.total_counts.action_items}
                  </div>
                  <div className="text-sm text-slate-600">Ações</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {exportData.total_counts.organizations}
                  </div>
                  <div className="text-sm text-slate-600">Organizações</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {exportData.total_counts.users}
                  </div>
                  <div className="text-sm text-slate-600">Usuários</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {exportData.total_counts.checklist_templates}
                  </div>
                  <div className="text-sm text-slate-600">Templates</div>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Exportado por:</strong> {exportData.exported_by}</p>
                <p><strong>Data/Hora:</strong> {new Date(exportData.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-900 mb-2">Instruções:</h4>
            <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
              <li><strong>Exportar:</strong> Clique em "Exportar Todos os Dados" para extrair dados de produção</li>
              <li><strong>Download:</strong> Use "Baixar JSON" para salvar o arquivo de exportação</li>
              <li><strong>Importar:</strong> Selecione o arquivo JSON exportado e clique em "Importar"</li>
              <li><strong>Sincronização:</strong> A importação substituirá todos os dados de desenvolvimento pelos de produção</li>
            </ol>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm"><strong>⚠️ Atenção:</strong> A importação irá substituir TODOS os dados existentes no ambiente de desenvolvimento pelos dados da produção, exceto seu usuário atual.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
