import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import StatsCard from '@/react-app/components/StatsCard';
import { useToast } from '@/react-app/hooks/useToast';
import { fetchWithAuth } from '@/react-app/utils/auth';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import {
  Users,
  Building2,
  ClipboardCheck,
  AlertTriangle,
  Plus,
  TrendingUp,
  UserPlus,
  BarChart3,
  CheckCircle2,
  Clock,
  Settings
} from 'lucide-react';

interface DashboardStats {
  users_count: number;
  inspections_count: number;
  pending_inspections: number;
  completed_inspections: number;
  active_actions: number;
  overdue_actions: number;
  recent_inspections: any[];
}

interface OrganizationInfo {
  id: number;
  name: string;
  type: string;
  user_count?: number;
  subsidiary_count?: number;
}

export default function OrgAdminDashboard() {
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get user's managed organization
      const userResponse = await fetchWithAuth('/api/users/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const managedOrg = userData.managed_organization;

        if (managedOrg) {
          setOrganization(managedOrg);

          // Get organization stats
          const statsResponse = await fetchWithAuth(`/api/organizations/${managedOrg.id}/stats`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats(statsData);
          }

          // Get recent users from organization
          const usersResponse = await fetchWithAuth(`/api/organizations/${managedOrg.id}/users?limit=5`);
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setRecentUsers(usersData.users || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      error('Erro no dashboard', 'Não foi possível carregar os dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Carregando dashboard da organização..." />
        </div>
      </Layout>
    );
  }

  if (!organization) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Organização não encontrada
          </h2>
          <p className="text-slate-600 mb-4">
            Você não tem uma organização gerenciada associada
          </p>
          <Link
            to="/organizations"
            className="text-blue-600 hover:underline"
          >
            Ver todas as organizações
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              Dashboard - {organization.name}
            </h1>
            <p className="text-slate-600 text-sm">
              Painel administrativo da organização
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/users"
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Usuários
            </Link>
            <Link
              to={`/organizations/${organization.id}`}
              className="flex items-center px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              <Settings className="w-4 h-4 mr-1" />
              Config
            </Link>
          </div>
        </div>

        {/* Organization Info Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{organization.name}</h2>
              <p className="text-blue-100 mb-4">
                Tipo: {organization.type === 'company' ? 'Empresa' :
                  organization.type === 'consultancy' ? 'Consultoria' : 'Cliente'}
              </p>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-blue-200">Usuários:</span>
                  <span className="font-semibold ml-1">{stats?.users_count || 0}</span>
                </div>
                <div>
                  <span className="text-blue-200">Inspeções:</span>
                  <span className="font-semibold ml-1">{stats?.inspections_count || 0}</span>
                </div>
              </div>
            </div>
            <Building2 className="w-16 h-16 text-blue-200" />
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total de Usuários"
              value={stats.users_count}
              icon={Users}
              color="blue"
            />
            <StatsCard
              title="Inspeções Pendentes"
              value={stats.pending_inspections}
              icon={Clock}
              color="yellow"
            />
            <StatsCard
              title="Inspeções Concluídas"
              value={stats.completed_inspections}
              icon={CheckCircle2}
              color="green"
            />
            <StatsCard
              title="Ações em Atraso"
              value={stats.overdue_actions}
              icon={AlertTriangle}
              color="red"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Inspections */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-semibold text-slate-900">
                Inspeções Recentes
              </h3>
              <Link
                to="/inspections"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Ver todas
              </Link>
            </div>

            {stats?.recent_inspections && stats.recent_inspections.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_inspections.map((inspection: any) => (
                  <div key={inspection.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{inspection.title}</h4>
                      <p className="text-sm text-slate-600">
                        Por {inspection.inspector_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${inspection.status === 'concluida' ? 'bg-green-100 text-green-800' :
                        inspection.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {inspection.status === 'concluida' ? 'Concluída' :
                          inspection.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(inspection.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma inspeção recente</p>
                <Link
                  to="/inspections/new"
                  className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                >
                  Criar primeira inspeção
                </Link>
              </div>
            )}
          </div>

          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-semibold text-slate-900">
                Usuários Recentes
              </h3>
              <Link
                to="/users"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Gerenciar usuários
              </Link>
            </div>

            {recentUsers && recentUsers.length > 0 ? (
              <div className="space-y-4">
                {recentUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{user.name}</h4>
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${user.role === 'org_admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'inspector' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {user.role === 'org_admin' ? 'Admin' :
                          user.role === 'manager' ? 'Gerente' :
                            user.role === 'inspector' ? 'Inspetor' : 'Cliente'}
                      </span>
                      {user.last_login_at && (
                        <p className="text-xs text-slate-500 mt-1">
                          Último acesso: {new Date(user.last_login_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhum usuário encontrado</p>
                <Link
                  to="/users"
                  className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                >
                  Convidar usuários
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-heading text-lg font-semibold text-slate-900 mb-6">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/inspections/new"
              className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors mr-4">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Nova Inspeção</h4>
                <p className="text-sm text-slate-600">Criar nova inspeção de segurança</p>
              </div>
            </Link>

            <Link
              to="/action-plans"
              className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors mr-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Planos de Ação</h4>
                <p className="text-sm text-slate-600">Gerenciar ações corretivas</p>
              </div>
            </Link>

            <Link
              to="/reports"
              className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors mr-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Relatórios</h4>
                <p className="text-sm text-slate-600">Visualizar análises e métricas</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
