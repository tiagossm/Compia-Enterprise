import { useState, useEffect } from 'react';
import { isSystemAdmin } from '../utils/auth';
import {
  Building2,
  Users,
  UserPlus,
  Plus,
  Eye,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Target,
  CheckCircle,
  Clock,
  Grid3X3,
  List,
  TreePine
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '@/react-app/context/AuthContext';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { Organization } from '../../shared/types';
import NewOrganizationModal from '../components/NewOrganizationModal';
import OrganizationEditModal from '../components/OrganizationEditModal';
import OrganizationDeleteModal from '../components/OrganizationDeleteModal';
import OrganizationBulkActions from '../components/OrganizationBulkActions';
import OrganizationFilters from '../components/OrganizationFilters';
import EnhancedOrganizationHierarchy from '../components/EnhancedOrganizationHierarchy';
import UserAssignmentModal from '../components/UserAssignmentModal';
import StatsCard from '../components/StatsCard';

type ViewMode = 'tree' | 'cards' | 'list';

export default function Organizations() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userCounts, setUserCounts] = useState<Record<number, number>>({});
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedOrganizations, setSelectedOrganizations] = useState<Organization[]>([]);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [organizationToEdit, setOrganizationToEdit] = useState<Organization | null>(null);
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [organizationToAssign, setOrganizationToAssign] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [assignmentOrgIds, setAssignmentOrgIds] = useState<number[]>([]);


  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: [] as string[],
    status: [] as string[],
    plan: [] as string[],
    userCountRange: [0, 1000] as [number, number],
    dateRange: ['', ''] as [string, string]
  });

  // Estados para estatísticas
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    masterOrganizations: 0,
    clientCompanies: 0,
    subsidiaries: 0,
    totalUsers: 0,
    myOrgUsers: 0,
    mySubsidiaries: 0,
    pendingInspections: 0,
    activeInspections: 0
  });

  // Check if user is system admin (regular user or demo user)
  const isSystemAdminUser = isSystemAdmin(user);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/organizations');

      if (!response.ok) throw new Error('Erro ao carregar organizações');

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setUserCounts(data.userCounts || {});
    } catch (error) {
      console.error('Erro ao carregar organizações:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/api/organizations/stats');

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleUpdateOrganization = async (organizationId: number, data: Partial<Organization>) => {
    try {
      const response = await fetchWithAuth(`/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Erro ao atualizar organização');

      // Trigger refresh and update UI
      await Promise.all([fetchOrganizations(), fetchStats()]);

      // Force re-render to ensure hierarchy updates
      setSelectedOrganization(null);
      setShowEditModal(false);
      setOrganizationToEdit(null);
    } catch (error) {
      console.error('Erro ao atualizar organização:', error);
      throw error;
    }
  };

  const handleDeleteOrganization = async (organizationId: number) => {
    try {
      const response = await fetchWithAuth(`/api/organizations/${organizationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Read the actual error message from the backend
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Erro ao excluir organização';
        throw new Error(errorMessage);
      }

      // Trigger refresh and update UI
      await Promise.all([fetchOrganizations(), fetchStats()]);

      // Force re-render to ensure hierarchy updates
      setSelectedOrganization(null);
      setShowDeleteModal(false);
      setOrganizationToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir organização:', error);
      throw error;
    }
  };

  const handleToggleActive = async (organization: Organization) => {
    try {
      await handleUpdateOrganization(organization.id, {
        is_active: !organization.is_active
      });

      // Update selected organization if it's the same one
      if (selectedOrganization?.id === organization.id) {
        setSelectedOrganization({
          ...selectedOrganization,
          is_active: !selectedOrganization.is_active
        });
      }
    } catch (error) {
      console.error('Erro ao alterar status da organização:', error);
    }
  };

  // Funções para ações em lote
  const handleBulkDelete = async (organizationIds: number[]) => {
    // Implementar confirmação e exclusão em lote
    console.log('Excluir organizações:', organizationIds);
  };

  const handleBulkActivate = async (organizationIds: number[]) => {
    try {
      await Promise.all(
        organizationIds.map(id =>
          fetchWithAuth(`/api/organizations/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: true })
          })
        )
      );
      await fetchOrganizations();
      setSelectedOrganizations([]);
    } catch (error) {
      console.error('Erro ao ativar organizações:', error);
    }
  };

  const handleBulkDeactivate = async (organizationIds: number[]) => {
    try {
      await Promise.all(
        organizationIds.map(id =>
          fetchWithAuth(`/api/organizations/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: false })
          })
        )
      );
      await fetchOrganizations();
      setSelectedOrganizations([]);
    } catch (error) {
      console.error('Erro ao desativar organizações:', error);
    }
  };

  const handleBulkExport = async (organizationIds: number[]) => {
    // Implementar exportação em lote
    console.log('Exportar organizações:', organizationIds);
  };



  // Filtrar organizações baseado na busca e filtros
  const filteredOrganizations = organizations.filter(org => {
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        org.name.toLowerCase().includes(searchLower) ||
        org.contact_email?.toLowerCase().includes(searchLower) ||
        org.cnpj?.includes(searchTerm) ||
        org.razao_social?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Filtros por tipo
    if (filters.type.length > 0 && !filters.type.includes(org.type)) {
      return false;
    }

    // Filtros por status
    if (filters.status.length > 0) {
      const statusKey = org.is_active ? 'active' : 'inactive';
      if (!filters.status.includes(statusKey)) return false;
    }

    // Filtros por plano
    if (filters.plan.length > 0 && !filters.plan.includes(org.subscription_plan || 'basic')) {
      return false;
    }

    // Filtros por contagem de usuários
    const userCount = userCounts[org.id] || 0;
    if (userCount < filters.userCountRange[0] || userCount > filters.userCountRange[1]) {
      return false;
    }

    // Filtros por data
    if (filters.dateRange[0] || filters.dateRange[1]) {
      const createdAt = new Date(org.created_at).toISOString().split('T')[0];
      if (filters.dateRange[0] && createdAt < filters.dateRange[0]) return false;
      if (filters.dateRange[1] && createdAt > filters.dateRange[1]) return false;
    }

    return true;
  });

  const handleToggleSelection = (organizationId: number) => {
    const organization = organizations.find(org => org.id === organizationId);
    if (!organization) return;

    const isSelected = selectedOrganizations.some(org => org.id === organizationId);
    if (isSelected) {
      setSelectedOrganizations(prev => prev.filter(org => org.id !== organizationId));
    } else {
      setSelectedOrganizations(prev => [...prev, organization]);
    }
  };

  const handleBulkAssignment = (orgIds: number[]) => {
    setAssignmentOrgIds(orgIds);
    setOrganizationToAssign(null);
    setShowAssignmentModal(true);
  };

  const clearFilters = () => {
    setFilters({
      type: [],
      status: [],
      plan: [],
      userCountRange: [0, 1000],
      dateRange: ['', '']
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-7 w-7 text-blue-600" />
              Gestão Organizacional
            </h1>
            <p className="text-gray-600 mt-1">
              {isSystemAdminUser
                ? 'Gerencie todas as organizações do sistema'
                : 'Gerencie sua organização e subsidiárias'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de visualização */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`p-2 rounded transition-colors ${viewMode === 'tree'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
                title="Visualização em árvore"
              >
                <TreePine className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded transition-colors ${viewMode === 'cards'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
                title="Visualização em cartões"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
                title="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Nova Organização */}
            <button
              onClick={() => setShowNewOrgModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              Nova Organização
            </button>
          </div>
        </div>

        {/* Visão Geral Contextual */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {isSystemAdminUser ? (
            // Visão para Administradores do Sistema
            <>
              <StatsCard
                title="Organizações Master"
                value={stats.masterOrganizations}
                icon={Building2}
                color="blue"
                change="Empresas consultoras"
                onClick={() => setFilters({ ...filters, type: ['consultancy'] })}
                clickable
              />
              <StatsCard
                title="Empresas Cliente"
                value={stats.clientCompanies}
                icon={Users}
                color="green"
                change="Clientes ativos"
                onClick={() => setFilters({ ...filters, type: ['client'] })}
                clickable
              />
              <StatsCard
                title="Subsidiárias"
                value={stats.subsidiaries}
                icon={Building2}
                color="purple"
                change="Total no sistema"
                onClick={() => setFilters({ ...filters, type: ['company'] })}
                clickable
              />
              <StatsCard
                title="Total de Usuários"
                value={stats.totalUsers}
                icon={Users}
                color="orange"
                change="Em todas as orgs"
                clickable
              />
            </>
          ) : (
            // Visão para Administradores de Organização
            <>
              <StatsCard
                title="Usuários da Minha Org"
                value={stats.myOrgUsers}
                icon={Users}
                color="blue"
                change="Membros ativos"
                clickable
              />
              <StatsCard
                title="Minhas Subsidiárias"
                value={stats.mySubsidiaries}
                icon={Building2}
                color="green"
                change="Organizações filhas"
                clickable
              />
              <StatsCard
                title="Inspeções Pendentes"
                value={stats.pendingInspections}
                icon={Clock}
                color="orange"
                change="Aguardando execução"
                clickable
              />
              <StatsCard
                title="Inspeções Ativas"
                value={stats.activeInspections}
                icon={CheckCircle}
                color="purple"
                change="Em andamento"
                clickable
              />
            </>
          )}
        </div>

        {/* Filtros e Busca */}
        <OrganizationFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
        />

        {/* Layout principal com hierarquia e detalhes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hierarquia de Organizações */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Hierarquia Organizacional
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {filteredOrganizations.length} de {organizations.length} organizações
                  </span>
                </div>
              </div>

              <EnhancedOrganizationHierarchy
                organizations={filteredOrganizations}
                selectedOrganization={selectedOrganization}
                selectedOrganizations={selectedOrganizations}
                onOrganizationSelect={(org) => setSelectedOrganization(org)}
                onToggleSelection={handleToggleSelection}
                onEdit={(org) => {
                  setOrganizationToEdit(org);
                  setShowEditModal(true);
                }}
                onDelete={(org) => {
                  setOrganizationToDelete(org);
                  setShowDeleteModal(true);
                }}
                onAssignUser={(org) => {
                  setOrganizationToAssign(org);
                  setShowAssignmentModal(true);
                }}
                onToggleActive={(org) => handleToggleActive(org)}
                userCounts={userCounts}
                viewMode={viewMode}

              />
            </div>
          </div>

          {/* Visão Rápida da Organização Selecionada */}
          {selectedOrganization && (
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Visão Rápida
                  </h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedOrganization.is_active
                    ? 'text-green-600 bg-green-50'
                    : 'text-red-600 bg-red-50'
                    }`}>
                    {selectedOrganization.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Nome e tipo */}
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">
                      {selectedOrganization.name}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {selectedOrganization.type === 'company' ? 'Empresa' :
                        selectedOrganization.type === 'consultancy' ? 'Consultoria' : 'Cliente'}
                    </p>
                  </div>

                  {/* Estatísticas rápidas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Usuários</span>
                      </div>
                      <p className="text-xl font-semibold text-blue-900 mt-1">
                        {userCounts[selectedOrganization.id] || 0}
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Subsidiárias</span>
                      </div>
                      <p className="text-xl font-semibold text-green-900 mt-1">
                        {organizations.filter(org => org.parent_organization_id === selectedOrganization.id).length}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-purple-600">Plano</span>
                      </div>
                      <p className="text-sm font-semibold text-purple-900 mt-1 capitalize">
                        {selectedOrganization.subscription_plan === 'basic' ? 'Básico' :
                          selectedOrganization.subscription_plan === 'pro' ? 'Profissional' : 'Empresarial'}
                      </p>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-600">Criada em</span>
                      </div>
                      <p className="text-sm font-semibold text-orange-900 mt-1">
                        {new Date(selectedOrganization.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Informações de contato */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Informações de Contato</h4>

                    {selectedOrganization.contact_email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{selectedOrganization.contact_email}</span>
                      </div>
                    )}

                    {selectedOrganization.contact_phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{selectedOrganization.contact_phone}</span>
                      </div>
                    )}

                    {selectedOrganization.address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-600">{selectedOrganization.address}</span>
                      </div>
                    )}

                    {selectedOrganization.website && (
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a
                          href={selectedOrganization.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {selectedOrganization.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Botões de ação */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setOrganizationToAssign(selectedOrganization);
                        setShowAssignmentModal(true);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Atribuir Usuário
                    </button>

                    <button
                      onClick={() => {
                        setOrganizationToEdit(selectedOrganization);
                        setShowEditModal(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ações em Lote */}
        <OrganizationBulkActions
          selectedOrganizations={selectedOrganizations}
          onClearSelection={() => setSelectedOrganizations([])}
          onBulkDelete={handleBulkDelete}
          onBulkActivate={handleBulkActivate}
          onBulkDeactivate={handleBulkDeactivate}
          onBulkExport={handleBulkExport}
          onBulkInviteUsers={handleBulkAssignment}
        />

        {/* Modals */}
        <NewOrganizationModal
          isOpen={showNewOrgModal}
          onClose={() => setShowNewOrgModal(false)}
          onSuccess={() => {
            fetchOrganizations();
            fetchStats();
          }}
          parentOrganizations={organizations}
        />

        {organizationToEdit && (
          <OrganizationEditModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setOrganizationToEdit(null);
            }}
            organization={organizationToEdit}
            onUpdate={handleUpdateOrganization}
          />
        )}

        {organizationToDelete && (
          <OrganizationDeleteModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setOrganizationToDelete(null);
            }}
            organization={organizationToDelete}
            onDelete={handleDeleteOrganization}
            organizationStats={{
              userCount: userCounts[organizationToDelete.id] || 0,
              inspectionCount: 0, // Buscar do backend
              subsidiaryCount: organizations.filter(org => org.parent_organization_id === organizationToDelete.id).length
            }}
          />
        )}

        <UserAssignmentModal
          organizationIds={assignmentOrgIds}
          organizationName={assignmentOrgIds.length === 1 ? (organizationToAssign?.name || '') : ''}
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setAssignmentOrgIds([]);
            setOrganizationToAssign(null);
          }}
          onSuccess={() => {
            fetchStats();
            fetchOrganizations();
          }}
        />
      </div>
    </Layout>
  );
}


