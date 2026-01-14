import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import { fetchWithAuth } from '@/react-app/utils/auth';
import Layout from '@/react-app/components/Layout';
import { ExtendedMochaUser, UserProfile as UserProfileType } from '@/shared/user-types';
import {
  User,
  Mail,
  Phone,
  Building2,
  Save,
  Camera,
  Shield,
  Calendar,
  Activity
} from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  type: string;
}

export default function UserProfile() {
  const { user: currentUser } = useAuth();
  const extendedUser = currentUser as ExtendedMochaUser;
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    organization_id: ''
  });

  useEffect(() => {
    if (extendedUser?.profile) {
      const userProfile = extendedUser.profile;
      setProfile(userProfile);
      setFormData({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        organization_id: userProfile.organization_id?.toString() || ''
      });
    }
    fetchOrganizations();
  }, [currentUser]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetchWithAuth('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/users/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || undefined,
          organization_id: formData.organization_id ? parseInt(formData.organization_id) : undefined
        })
      });

      if (response.ok) {
        const updatedProfile = {
          ...profile,
          name: formData.name,
          phone: formData.phone,
          organization_id: formData.organization_id ? parseInt(formData.organization_id) : undefined
        };
        setProfile(updatedProfile);
        alert('Perfil atualizado com sucesso!');
      } else {
        throw new Error('Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'system_admin':
      case 'sys_admin': return 'Admin Sistema';
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

  if (loading || !profile) {
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
        {/* Compact Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-slate-900">Meu Perfil</h1>
          <p className="text-slate-600 text-sm mt-1">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                {profile.avatar_url || currentUser?.google_user_data?.picture ? (
                  <img
                    src={profile.avatar_url || currentUser?.google_user_data?.picture || undefined}
                    alt={profile.name ?? 'Profile'}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-slate-500" />
                  </div>
                )}
                <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                {profile.name || 'Sem nome'}
              </h2>
              <p className="text-slate-600 mb-3">{profile.email}</p>

              <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(profile.role)}`}>
                <Shield className="w-4 h-4 mr-1" />
                {getRoleLabel(profile.role)}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center text-sm text-slate-600">
                <Building2 className="w-4 h-4 mr-2" />
                {getOrganizationName(profile.organization_id)}
              </div>

              <div className="flex items-center text-sm text-slate-600">
                <Calendar className="w-4 h-4 mr-2" />
                Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
              </div>

              {profile.last_login_at && (
                <div className="flex items-center text-sm text-slate-600">
                  <Activity className="w-4 h-4 mr-2" />
                  Último acesso: {new Date(profile.last_login_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">
              Informações Pessoais
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    O email não pode ser alterado pois é vinculado à sua conta Google
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Organização
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select
                      value={formData.organization_id}
                      onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma organização</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Informações da Conta
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ID do Usuário
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono text-sm">
                {profile.id}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status da Conta
              </label>
              <div className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {profile.is_active ? 'Ativa' : 'Inativa'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
