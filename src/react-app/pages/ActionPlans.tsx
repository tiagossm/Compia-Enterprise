import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import CSVExportImport from '@/react-app/components/CSVExportImport';
import {
  Target,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  AlertCircle,
  Zap,
  Eye,
  Edit,
  Trash2,
  Building2
} from 'lucide-react';

interface ActionItem {
  id: number;
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
  created_at: string;
  updated_at: string;
  // Inspection details
  inspection_title?: string;
  inspection_location?: string;
  inspection_company?: string;
}

interface FilterState {
  status: string;
  priority: string;
  overdue: boolean;
  aiGenerated: boolean;
  search: string;
}



export default function ActionPlans() {
  // const [searchParams, setSearchParams] = useSearchParams();
  const { selectedOrganization } = useOrganization();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    highPriority: 0
  });

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    overdue: false,
    aiGenerated: false,
    search: ''
  });

  useEffect(() => {
    fetchAllActionItems();
  }, [selectedOrganization]); // Fetch on global org change

  useEffect(() => {
    applyFilters();
  }, [actionItems, filters]);

  // Removed URL sync effect for org - handled by Context/Header

  const fetchAllActionItems = async () => {
    try {
      let url = '/api/action-plans/all';
      if (selectedOrganization) {
        url += `?organization_id=${selectedOrganization.id}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setActionItems(data.action_items || []);

        // Calculate stats
        const items = data.action_items || [];
        const now = new Date();
        const overdue = items.filter((item: ActionItem) =>
          item.when_deadline &&
          new Date(item.when_deadline) < now &&
          item.status !== 'completed'
        ).length;

        setStats({
          total: items.length,
          pending: items.filter((item: ActionItem) => item.status === 'pending').length,
          inProgress: items.filter((item: ActionItem) => item.status === 'in_progress').length,
          completed: items.filter((item: ActionItem) => item.status === 'completed').length,
          overdue,
          highPriority: items.filter((item: ActionItem) => item.priority === 'alta' && item.status !== 'completed').length
        });
      }
    } catch (error) {
      console.error('Erro ao carregar ações:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...actionItems];
    const now = new Date();

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(item => item.priority === filters.priority);
    }

    // Overdue filter
    if (filters.overdue) {
      filtered = filtered.filter(item =>
        item.when_deadline &&
        new Date(item.when_deadline) < now &&
        item.status !== 'completed'
      );
    }

    // AI Generated filter
    if (filters.aiGenerated) {
      filtered = filtered.filter(item => item.is_ai_generated);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.inspection_title?.toLowerCase().includes(searchLower) ||
        item.inspection_location?.toLowerCase().includes(searchLower) ||
        item.what_description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredItems(filtered);
  };

  const handleDeleteAction = async (actionId: number) => {
    if (confirm('Tem certeza que deseja excluir esta ação?')) {
      try {
        const response = await fetch(`/api/action-items/${actionId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          fetchAllActionItems();
        }
      } catch (error) {
        console.error('Erro ao excluir ação:', error);
      }
    }
  };

  const handleExportActions = async () => {
    setCsvLoading(true);
    try {
      const csvData = filteredItems.map(action => ({
        titulo: action.title,
        inspecao: action.inspection_title || '',
        local_inspecao: action.inspection_location || '',
        empresa: action.inspection_company || '',
        o_que: action.what_description || '',
        onde: action.where_location || '',
        por_que: action.why_reason || '',
        como: action.how_method || '',
        quem: action.who_responsible || '',
        quando: action.when_deadline || '',
        quanto: action.how_much_cost || '',
        status: getStatusLabel(action.status),
        prioridade: action.priority,
        gerado_ia: action.is_ai_generated ? 'Sim' : 'Não',
        criado_em: new Date(action.created_at).toLocaleDateString('pt-BR')
      }));

      const headers = 'titulo,inspecao,local_inspecao,empresa,o_que,onde,por_que,como,quem,quando,quanto,status,prioridade,gerado_ia,criado_em';
      const csvContent = [
        headers,
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `plano_acao_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar plano de ação:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleImportActions = async () => {
    alert('Importação de itens de ação não está disponível. Os itens são criados através das inspeções.');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <Target className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluída';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date() && deadline !== '';
  };

  const getTimeUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Atrasada ${Math.abs(diffDays)} dia(s)`;
    } else if (diffDays === 0) {
      return 'Vence hoje';
    } else if (diffDays <= 7) {
      return `${diffDays} dia(s) restantes`;
    }

    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900">
              Plano de Ação Global
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Gestão centralizada de todos os planos de ação
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {filteredItems.length} de {actionItems.length} ações
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Alta Prioridade</p>
                <p className="text-2xl font-bold text-orange-600">{stats.highPriority}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="font-heading text-lg font-semibold text-slate-900">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar ações..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              {/* Organization Selector Removed - Global in Header */}
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluída</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todas Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.overdue}
                onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              Apenas Atrasadas
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.aiGenerated}
                onChange={(e) => setFilters({ ...filters, aiGenerated: e.target.checked })}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              Geradas por IA
            </label>

            <button
              onClick={() => setFilters({
                status: 'all',
                priority: 'all',
                overdue: false,
                aiGenerated: false,
                search: ''
              })}
              className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* CSV Export */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Exportar Plano de Ação
          </h3>
          <CSVExportImport
            type="action-items"
            onExport={handleExportActions}
            onImport={handleImportActions}
            isLoading={csvLoading}
          />
          <p className="text-sm text-slate-500 mt-2">
            Nota: A importação de itens de ação não está disponível. Os itens são criados através das inspeções.
          </p>
        </div>

        {/* Actions List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">
                {actionItems.length === 0
                  ? 'Nenhuma ação encontrada no sistema'
                  : 'Nenhuma ação corresponde aos filtros aplicados'
                }
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {actionItems.length === 0
                  ? 'Crie ações através das inspeções para começar'
                  : 'Tente ajustar os filtros para encontrar as ações desejadas'
                }
              </p>
            </div>
          ) : (
            filteredItems.map((action) => (
              <div key={action.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-heading text-lg font-semibold text-slate-900">
                        {action.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(action.priority)}`}>
                        {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                      </span>
                      {action.is_ai_generated && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          IA
                        </span>
                      )}
                      {isOverdue(action.when_deadline) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Atrasada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(action.status)}
                        <span>{getStatusLabel(action.status)}</span>
                      </div>

                      {action.when_deadline && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            {new Date(action.when_deadline).toLocaleDateString('pt-BR')}
                            {getTimeUntilDeadline(action.when_deadline) && (
                              <span className={`ml-2 ${isOverdue(action.when_deadline) ? 'text-red-600' : 'text-amber-600'}`}>
                                ({getTimeUntilDeadline(action.when_deadline)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {action.who_responsible && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{action.who_responsible}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>{action.inspection_company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{action.inspection_location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-1">
                    <Link
                      to={`/inspections/${action.inspection_id}`}
                      className="p-3 sm:p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver inspeção"
                    >
                      <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                    </Link>
                    <Link
                      to={`/inspections/${action.inspection_id}/action-plan`}
                      className="p-3 sm:p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Editar no plano de ação"
                    >
                      <Edit className="w-5 h-5 sm:w-4 sm:h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteAction(action.id)}
                      className="p-3 sm:p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir ação"
                    >
                      <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-3">
                  <strong>Inspeção:</strong> {action.inspection_title}
                </div>

                {(action.what_description || action.where_location || action.how_method) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {action.what_description && (
                      <div>
                        <span className="font-medium text-red-600">O que:</span>
                        <p className="text-slate-700 mt-1">{action.what_description}</p>
                      </div>
                    )}
                    {action.where_location && (
                      <div>
                        <span className="font-medium text-green-600">Onde:</span>
                        <p className="text-slate-700 mt-1">{action.where_location}</p>
                      </div>
                    )}
                    {action.how_method && (
                      <div>
                        <span className="font-medium text-indigo-600">Como:</span>
                        <p className="text-slate-700 mt-1">{action.how_method}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
