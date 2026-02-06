import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import Layout from '@/react-app/components/Layout';
import CSVExportImport from '@/react-app/components/CSVExportImport';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  MapPin,
  AlertCircle,
  Edit,
  Trash2,
  Copy,
  DownloadCloud,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { syncService } from '@/lib/sync-service';
import { InspectionType } from '@/shared/types';
import InspectionStatusBadge from '@/react-app/components/InspectionStatusBadge';
import SkeletonLoader from '@/react-app/components/ui/SkeletonLoader';
import EmptyState from '@/react-app/components/ui/EmptyState';

// Simple debounce implementation if lodash not available/installed
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Inspections() {
  const { selectedOrganization } = useOrganization();
  const [inspections, setInspections] = useState<InspectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500); // 500ms delay
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  });

  const fetchInspections = useCallback(async (pageToFetch = 1) => {
    setLoading(true);
    let url = `/api/inspections?page=${pageToFetch}&limit=${pagination.limit}`;

    // Add filters
    if (selectedOrganization && selectedOrganization.id !== 0) {
      url += `&organization_id=${selectedOrganization.id}`;
    }
    if (debouncedSearch) {
      url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }
    if (statusFilter !== 'all') {
      url += `&status=${statusFilter}`;
    }

    console.log('[INSPECTIONS] Fetching:', url);

    try {
      const res = await fetchWithAuth(url);
      const data = await res.json();

      if (res.ok) {
        setInspections(data.inspections || []);
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            ...data.pagination
          }));
        }
      } else {
        console.error('[INSPECTIONS] Error data:', data);
      }
    } catch (error) {
      console.error('[INSPECTIONS] Network error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedOrganization, debouncedSearch, statusFilter, pagination.limit]);

  // Initial fetch and on filter change
  useEffect(() => {
    // Reset to page 1 when filters change (except when simply paginating, handled by page change)
    fetchInspections(1);
  }, [fetchInspections]);

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchInspections(newPage);
    }
  };

  const handleDeleteInspection = async (id: number) => {
    try {
      const response = await fetchWithAuth(`/api/inspections/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh current page
        fetchInspections(pagination.page);
        setShowDeleteModal(null);
        alert('Inspeção excluída com sucesso!');
      } else {
        throw new Error('Erro ao excluir inspeção');
      }
    } catch (error) {
      console.error('Erro ao excluir inspeção:', error);
      alert('Erro ao excluir inspeção. Tente novamente.');
    }
  };

  const handleCloneInspection = async (id: number, title: string) => {
    try {
      const response = await fetchWithAuth(`/api/inspections/${id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await response.json();
        // Refresh to page 1 to see new item
        fetchInspections(1);
        alert(`Inspeção "${title}" duplicada com sucesso! Apenas os dados básicos foram copiados. A nova inspeção está pronta para ser preenchida.`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao clonar inspeção');
      }
    } catch (error) {
      console.error('Erro ao clonar inspeção:', error);
      alert(`Erro ao clonar inspeção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleExportInspections = async () => {
    setCsvLoading(true);
    try {
      const confirmExport = confirm("Deseja exportar todos os registros correspondentes aos filtros atuais?");
      if (!confirmExport) return;

      // Construct URL with high limit to fetch "all" (functional max 10000)
      let url = `/api/inspections?page=1&limit=10000`;

      // Add active filters
      if (selectedOrganization && selectedOrganization.id !== 0) {
        url += `&organization_id=${selectedOrganization.id}`;
      }
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      const res = await fetchWithAuth(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao buscar dados para exportação');

      const inspectionsToExport = data.inspections || [];

      if (inspectionsToExport.length === 0) {
        alert('Nenhum registro encontrado para exportar.');
        return;
      }

      const csvData = inspectionsToExport.map((inspection: InspectionType) => ({
        titulo: inspection.title,
        descricao: inspection.description || '',
        local: inspection.location,
        empresa: inspection.company_name || '',
        tecnico_nome: inspection.inspector_name,
        tecnico_email: inspection.inspector_email || '',
        status: (() => {
          const s = inspection.status;
          const map: Record<string, string> = {
            'scheduled': 'Agendada', 'agendada': 'Agendada',
            'pending': 'Pendente', 'pendente': 'Pendente',
            'in_progress': 'Em Andamento', 'em_andamento': 'Em Andamento',
            'completed': 'Concluída', 'concluida': 'Concluída',
            'canceled': 'Cancelada', 'cancelada': 'Cancelada'
          };
          return map[s] || s;
        })(),
        prioridade: inspection.priority,
        data_agendada: inspection.scheduled_date || '',
        data_criacao: new Date(inspection.created_at).toLocaleDateString('pt-BR'),
        endereco: inspection.address || '',
        cep: inspection.cep || ''
      }));

      const headers = 'titulo,descricao,local,empresa,tecnico_nome,tecnico_email,status,prioridade,data_agendada,data_criacao,endereco,cep';
      const csvContent = [
        headers,
        ...csvData.map((row: any) => Object.values(row).map((val: any) => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const urlObject = URL.createObjectURL(blob);
      link.setAttribute('href', urlObject);
      link.setAttribute('download', `inspecoes_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar inspeções:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleDownloadOffline = async () => {
    if (!selectedOrganization?.id) {
      alert("Selecione uma organização primeiro.");
      return;
    }
    const confirmDownload = window.confirm("Deseja baixar todas as inspeções e modelos desta organização para uso offline? Isso pode levar alguns instantes.");
    if (!confirmDownload) return;

    setIsDownloading(true);
    try {
      await syncService.syncDown(selectedOrganization.id);
      alert("Download concluído com sucesso! \nVocê já pode sair para campo com o app offline. \n(Certifique-se de que o ícone 'Instalar' do app já apareceu)");
    } catch (e: any) {
      console.error(e);
      alert("Erro no download: " + (e.message || "Tente novamente online."));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImportInspections = async (data: any[]) => {
    setCsvLoading(true);
    try {
      for (const row of data) {
        const inspectionData = {
          title: row.titulo || row.title,
          description: row.descricao || row.description,
          location: row.local || row.location,
          company_name: row.empresa || row.company_name,
          inspector_name: row.tecnico_nome || row.inspector_name,
          inspector_email: row.tecnico_email || row.inspector_email,
          priority: row.prioridade || row.priority || 'media',
          scheduled_date: row.data_agendada || row.scheduled_date,
          address: row.endereco || row.address,
          cep: row.cep,
          organization_id: selectedOrganization?.id
        };

        const response = await fetchWithAuth('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inspectionData)
        });

        if (!response.ok) {
          throw new Error(`Erro ao importar inspeção: ${inspectionData.title}`);
        }
      }

      fetchInspections(1);
      alert(`${data.length} inspeções importadas com sucesso!`);
    } catch (error) {
      console.error('Erro ao importar inspeções:', error);
      alert('Erro ao importar dados. Verifique o formato e tente novamente.');
    } finally {
      setCsvLoading(false);
    }
  };



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'critica': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900">Inspeções</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Gerencie suas inspeções de segurança do trabalho
            </p>

          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadOffline}
              disabled={isDownloading}
              className="flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors duration-200 text-sm sm:text-base disabled:opacity-50"
              title="Baixar para Offline"
            >
              <DownloadCloud className={`w-4 h-4 mr-2 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isDownloading ? 'Baixando...' : 'Baixar Offline'}</span>
              <span className="sm:hidden"><DownloadCloud className="w-4 h-4" /></span>
            </button>
            <Link
              to="/inspections/new"
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nova Inspeção</span>
              <span className="sm:hidden">Nova</span>
            </Link>
          </div>
        </div>

        {/* Filters - Responsive */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por título, empresa, local ou técnico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Inspections List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3 mb-2">
                      <SkeletonLoader className="h-6 w-1/3" />
                      <SkeletonLoader className="h-6 w-20 rounded-full" />
                    </div>
                    <SkeletonLoader className="h-4 w-3/4" />
                    <div className="flex gap-4">
                      <SkeletonLoader className="h-4 w-24" />
                      <SkeletonLoader className="h-4 w-24" />
                      <SkeletonLoader className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : inspections.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="Nenhuma inspeção encontrada"
              description="Tente ajustar os filtros ou criar uma nova inspeção."
              action={
                <Link
                  to="/inspections/new"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Criar Nova Inspeção
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {inspections.map((inspection) => (
                <div key={inspection.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-heading text-base sm:text-lg font-semibold text-slate-900">
                          {inspection.title}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(inspection.priority)}`}>
                          {inspection.priority.charAt(0).toUpperCase() + inspection.priority.slice(1)}
                        </span>
                      </div>

                      {inspection.description && (
                        <p className="text-slate-600 mb-3 line-clamp-2 text-sm">
                          {inspection.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-500">
                        {inspection.company_name && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-700 truncate max-w-[120px] sm:max-w-none">{inspection.company_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[100px] sm:max-w-none">{inspection.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {inspection.inspector_avatar_url ? (
                            <img
                              src={inspection.inspector_avatar_url}
                              alt={inspection.inspector_name}
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <User className="w-4 h-4 shrink-0" />
                          )}
                          <span className="truncate max-w-[100px] sm:max-w-none">{inspection.inspector_name}</span>
                        </div>
                        {inspection.scheduled_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span>{new Date(inspection.scheduled_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <InspectionStatusBadge status={inspection.status} size="sm" />
                      <div className="flex items-center gap-2 sm:gap-1">
                        <Link
                          to={`/inspections/${inspection.id}/edit`}
                          className="p-3 sm:p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          title="Editar inspeção"
                        >
                          <Edit className="w-5 h-5 sm:w-4 sm:h-4" />
                        </Link>
                        <button
                          onClick={() => handleCloneInspection(inspection.id!, inspection.title)}
                          className="p-3 sm:p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                          title="Clonar inspeção"
                        >
                          <Copy className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(inspection.id!)}
                          className="p-3 sm:p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Excluir inspeção"
                        >
                          <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                        <Link
                          to={`/inspections/${inspection.id}`}
                          className="px-4 py-2.5 sm:px-4 sm:py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors duration-200 text-sm font-medium"
                        >
                          <span className="hidden sm:inline">Ver Detalhes</span>
                          <span className="sm:hidden">Ver</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Anterior</span>
            </button>

            <span className="text-sm text-slate-500 font-medium">
              Página {pagination.page} de {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="text-sm font-medium">Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CSV Export/Import */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 pt-6 mt-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Importar/Exportar Inspeções
          </h3>
          <CSVExportImport
            type="inspections"
            onExport={handleExportInspections}
            onImport={handleImportInspections}
            isLoading={csvLoading}
          />
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-slate-900">
                    Confirmar Exclusão
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <p className="text-slate-700 mb-6">
                Tem certeza que deseja excluir esta inspeção? Todos os dados relacionados serão permanentemente removidos.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteInspection(showDeleteModal)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir Inspeção
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
