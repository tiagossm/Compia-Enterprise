import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import Layout from '@/react-app/components/Layout';
import CSVExportImport from '@/react-app/components/CSVExportImport';
import UserEditModal from '@/react-app/components/UserEditModal';
import {
  Search,
  Filter,
  Trash2,
  Users as UsersIcon,
  Mail,
  Phone,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  Edit,
  UserPlus,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { ExtendedMochaUser } from '@/shared/user-types';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organization_id?: number;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  last_active_at?: string;
  created_at: string;
  organization_name?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

interface Organization {
  id: number;
  name: string;
  type: string;
}

interface PendingInvitation {
  id: number;
  email: string;
  role: string;
  organization_id: number;
  organization_name?: string;
  invited_by: string;
  inviter_name?: string;
  expires_at: string;
  created_at: string;
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const extendedUser = currentUser as ExtendedMochaUser;
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => {
    console.log('[USERS_PAGE] useEffect executando...');
    fetchUsers();
    fetchOrganizations();
    fetchPendingInvitations();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('[USERS_PAGE] Buscando usuarios - usuario atual:', currentUser?.email, 'role:', extendedUser?.profile?.role);

      let url = '/api/users';

      // System admin vê todos os usuários, incluindo os não atribuídos
      if (extendedUser?.profile?.role === 'system_admin' || extendedUser?.profile?.role === 'sys_admin') {
        url += '?include_unassigned=true';
      }

      console.log('[USERS_PAGE] URL da requisicao:', url);

      const response = await fetchWithAuth(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[USERS_PAGE] Resposta recebida:', data);
        console.log('[USERS_PAGE] Numero de usuarios:', data.users?.length || 0);

        if (data.users && data.users.length > 0) {
          console.log('[USERS_PAGE] Primeiros usuarios recebidos:', data.users.slice(0, 3).map((u: any) => ({
            email: u.email,
            name: u.name,
            role: u.role,
            organization_id: u.organization_id,
            organization_name: u.organization_name
          })));
        }

        setUsers(data.users || []);
      } else {
        console.error('[USERS_PAGE] Failed to fetch users:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('[USERS_PAGE] Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetchWithAuth('/api/organizations', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } else {
        console.error('Failed to fetch organizations:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetchWithAuth('/api/users/pending-invitations', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data.invitations || []);
      } else {
        console.error('Failed to fetch pending invitations:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Close modal first
        setShowDeleteModal(null);

        // Show success message
        alert('Usuário excluído com sucesso!');

        // Refresh users list
        await fetchUsers();

        // Also refresh organizations in case user counts changed
        await fetchOrganizations();
      } else {
        throw new Error('Erro ao excluir usuário');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário. Tente novamente.');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/users/admin/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setUsers(prev => prev.map(user =>
          user.id === userId ? { ...user, is_active: !currentStatus } : user
        ));

        // Refresh users list to ensure consistency
        await fetchUsers();
      } else {
        throw new Error('Erro ao alterar status do usuário');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Erro ao alterar status do usuário. Tente novamente.');
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja APROVAR este usuário?')) return;

    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        alert('Usuário aprovado com sucesso!');

        // Update local state immediately
        setUsers(prev => prev.map(user =>
          user.id === userId ? { ...user, approval_status: 'approved' } : user
        ));

        // Refresh full list
        await fetchUsers();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao aprovar usuário');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Erro ao aprovar usuário. Verifique se você tem permissão de administrador.');
    }
  };

  const handleExportUsers = async () => {
    setCsvLoading(true);
    try {
      const csvData = users.map(user => ({
        email: user.email,
        nome: user.name,
        cargo: getRoleLabel(user.role),
        organizacao: getOrganizationName(user.organization_id),
        telefone: user.phone || '',
        ativo: user.is_active ? 'Sim' : 'Não',
        ultimo_acesso: user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('pt-BR') : 'Nunca',
        criado_em: new Date(user.created_at).toLocaleDateString('pt-BR')
      }));

      const headers = 'email,nome,cargo,organizacao,telefone,ativo,ultimo_acesso,criado_em';
      const csvContent = [
        headers,
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar usuários:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleImportUsers = async () => {
    alert('Importação de usuários não está disponível. Os usuários são criados automaticamente no primeiro login.');
  };

  const handleEditUser = (user: User) => {
    setShowEditModal(user);
  };

  const handleSaveUser = async (updatedUser: User) => {
    // Update local state immediately for better UX
    setUsers(prev => prev.map(user =>
      user.id === updatedUser.id ? updatedUser : user
    ));

    // Refresh users list to ensure consistency
    await fetchUsers();

    // Also refresh organizations in case user organization changed
    await fetchOrganizations();
  };

  const copyInvitationLink = async (invitationId: number) => {
    // Get the invitation token first
    try {
      const response = await fetchWithAuth(`/api/users/invitations/${invitationId}/token`);

      if (response.ok) {
        const data = await response.json();
        const inviteUrl = `${window.location.origin}/accept-invitation/${data.token}`;
        await navigator.clipboard.writeText(inviteUrl);
        alert('Link de convite copiado para a área de transferência!');
      } else {
        throw new Error('Erro ao obter token do convite');
      }
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      alert('Erro ao copiar link do convite. Tente novamente.');
    }
  };

  const revokeInvitation = async (invitationId: number) => {
    if (!confirm('Tem certeza que deseja revogar este convite?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/users/invitations/${invitationId}/revoke`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Show success message
        alert('Convite revogado com sucesso!');

        // Refresh pending invitations list
        await fetchPendingInvitations();

        // Also refresh organizations and users lists
        await fetchOrganizations();
        await fetchUsers();
      } else {
        throw new Error('Erro ao revogar convite');
      }
    } catch (error) {
      console.error('Error revoking invitation:', error);
      alert('Erro ao revogar convite. Tente novamente.');
    }
  };

  const filteredUsers = users.filter(user => {
    const userName = user.name || '';
    const userEmail = user.email || '';

    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'system_admin':
      case 'sys_admin': return 'Admin Sistema';
      case 'org_admin': return 'Admin Organização';
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'inspector': return 'Técnico';
      case 'client': return 'Cliente';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system_admin':
      case 'sys_admin': return 'bg-purple-100 text-purple-800';
      case 'org_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'inspector': return 'bg-green-100 text-green-800';
      case 'client': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrganizationName = (orgId?: number) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || 'Sem organização';
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Gerenciar Usuários
            </h1>
            <p className="text-slate-600 mt-1">
              Controle de acesso e permissões dos usuários do sistema
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Usuários são criados automaticamente no primeiro login
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-slate-900">{users.length}</h3>
                <p className="text-slate-600 text-sm">Total de Usuários</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.is_active).length}
                </h3>
                <p className="text-slate-600 text-sm">Usuários Ativos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.role === 'admin').length}
                </h3>
                <p className="text-slate-600 text-sm">Administradores</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-slate-900">{organizations.length}</h3>
                <p className="text-slate-600 text-sm">Organizações</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <UsersIcon className="w-4 h-4 inline mr-2" />
              Usuários ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Convites Pendentes ({pendingInvitations.length})
            </button>
          </nav>
        </div>

        {activeTab === 'users' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos os Perfis</option>
                    <option value="system_admin">Admin Sistema</option>
                    <option value="org_admin">Admin Organização</option>
                    <option value="manager">Gerente</option>
                    <option value="inspector">Técnico</option>
                    <option value="client">Cliente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CSV Export */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Exportar Usuários
              </h3>
              <CSVExportImport
                type="users"
                onExport={handleExportUsers}
                onImport={handleImportUsers}
                isLoading={csvLoading}
              />
              <p className="text-sm text-slate-500 mt-2">
                Nota: A importação de usuários não está disponível. Os usuários são criados automaticamente no primeiro login.
              </p>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Usuário
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Perfil
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Organização
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Último Acesso
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50 ${!user.organization_id ? 'bg-amber-50' : ''
                          }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="w-10 h-10 rounded-full mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                                <span className="text-slate-600 font-medium text-sm">
                                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900">{user.name}</p>
                                {!user.organization_id && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-800" title="Sem organização">
                                    Sem Org
                                  </span>
                                )}
                                {user.approval_status === 'pending' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200" title="Aprovação Pendente">
                                    Pendente
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center text-sm text-slate-500">
                                <Mail className="w-3 h-3 mr-1" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="flex items-center text-sm text-slate-500">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.organization_name ? (
                            <span className="text-sm text-slate-900">{user.organization_name}</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-sm text-amber-600 font-medium">Não atribuído</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                              } transition-colors`}
                          >
                            {user.is_active ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inativo
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {(user.last_active_at || user.last_login_at)
                              ? new Date(user.last_active_at || user.last_login_at || '').toLocaleString('pt-BR')
                              : 'Nunca'
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className={`p-2 transition-colors ${!user.organization_id
                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                } rounded-lg`}
                              title={!user.organization_id ? 'Configurar usuário' : 'Editar usuário'}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {user.approval_status === 'pending' && (
                              <button
                                onClick={() => handleApproveUser(user.id)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Aprovar Usuário"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => setShowDeleteModal(user.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">
                    {users.length === 0
                      ? 'Nenhum usuário encontrado'
                      : 'Nenhum usuário corresponde aos filtros'
                    }
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    {users.length === 0
                      ? 'Os usuários serão criados automaticamente no primeiro login'
                      : 'Tente ajustar os filtros ou termo de busca'
                    }
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'invitations' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Convites Pendentes
              </h3>
              <p className="text-slate-600 text-sm">
                Usuários que foram convidados mas ainda não aceitaram o convite
              </p>
            </div>

            {pendingInvitations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Email Convidado
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Perfil
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Organização
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Convidado por
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-900">
                        Expira em
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingInvitations.map((invitation) => (
                      <tr key={invitation.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                              <Mail className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{invitation.email}</p>
                              <p className="text-sm text-slate-500">
                                Enviado em {new Date(invitation.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(invitation.role)}`}>
                            {getRoleLabel(invitation.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-900">
                            {invitation.organization_name || 'Sem organização'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {invitation.inviter_name || invitation.invited_by}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm">
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            <span className={`${new Date(invitation.expires_at) < new Date()
                              ? 'text-red-600 font-medium'
                              : 'text-slate-600'
                              }`}>
                              {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {new Date(invitation.expires_at) < new Date() && (
                            <span className="text-xs text-red-600 font-medium">Expirado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => copyInvitationLink(invitation.id)}
                              className="px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                              title="Copiar link de convite"
                            >
                              Copiar Link
                            </button>
                            <button
                              onClick={() => revokeInvitation(invitation.id)}
                              className="px-3 py-1 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm"
                              title="Revogar convite"
                            >
                              Revogar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhum convite pendente</p>
                <p className="text-slate-400 text-sm mt-1">
                  Todos os convites enviados foram aceitos ou expiraram
                </p>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
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
                Tem certeza que deseja excluir este usuário? Todos os dados relacionados serão permanentemente removidos.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteUser(showDeleteModal)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir Usuário
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Edit Modal */}
        {showEditModal && (
          <UserEditModal
            user={showEditModal}
            isOpen={!!showEditModal}
            onClose={() => setShowEditModal(null)}
            onSave={handleSaveUser}
            organizations={organizations}
          />
        )}
      </div>
    </Layout >
  );
}
