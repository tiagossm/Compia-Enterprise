import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Loader2,
  Save
} from 'lucide-react';
import { USER_ROLES, ExtendedMochaUser } from '@/shared/user-types';

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
  created_at: string;
  organization_name?: string;
}

interface Organization {
  id: number;
  name: string;
  type: string;
}

interface UserEditModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  organizations: Organization[];
}

export default function UserEditModal({
  user,
  isOpen,
  onClose,
  onSave,
  organizations
}: UserEditModalProps) {
  const { user: currentUser } = useAuth();
  const extendedUser = currentUser as ExtendedMochaUser;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    role: user.role || '',
    organization_id: user.organization_id?.toString() || '',
    is_active: user.is_active
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        role: user.role || '',
        organization_id: user.organization_id?.toString() || '',
        is_active: user.is_active
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/users/admin/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          role: formData.role,
          organization_id: formData.organization_id ? parseInt(formData.organization_id) : null,
          is_active: formData.is_active
        })
      });

      if (response.ok) {
        const updatedUser = {
          ...user,
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          organization_id: formData.organization_id ? parseInt(formData.organization_id) : undefined,
          is_active: formData.is_active
        };

        // Show success message
        alert('Usuário atualizado com sucesso!');

        // Close modal
        onClose();
        // Notify parent to refresh
        onSave(updatedUser);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error instanceof Error ? error.message : 'Erro ao atualizar usuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableRoles = (): { value: string; label: string }[] => {
    const roles: { value: string; label: string }[] = [
      { value: USER_ROLES.INSPECTOR, label: 'Técnico' },
      { value: USER_ROLES.CLIENT, label: 'Cliente' },
      { value: USER_ROLES.MANAGER, label: 'Gerente' }
    ];

    // System admin pode atribuir qualquer papel, incluindo org_admin
    if (extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN) {
      roles.unshift({ value: USER_ROLES.ORG_ADMIN, label: 'Administrador da Organização' });
    }

    return roles;
  };

  const getAvailableOrganizations = () => {
    // System admin vê todas as organizações
    if (extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN) {
      return organizations;
    }

    // Org admin vê apenas sua organização gerenciada e subsidiárias
    if (extendedUser?.profile?.role === USER_ROLES.ORG_ADMIN) {
      return organizations.filter(org =>
        org.id === extendedUser.profile?.managed_organization_id
      );
    }

    return [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-labelledby="user-edit-modal-title" aria-describedby="user-edit-modal-description">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 id="user-edit-modal-title" className="font-heading text-xl font-bold text-slate-900">
                  Editar Usuário
                </h2>
                <p id="user-edit-modal-description" className="text-sm text-slate-600">
                  Alterar informações e permissões do usuário
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Info Display */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-slate-600 font-medium">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-slate-900">{user.name}</h3>
                  <div className="flex items-center text-sm text-slate-500">
                    <Mail className="w-3 h-3 mr-1" />
                    {user.email}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Conta criada em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                {user.last_login_at && (
                  <span className="ml-4">
                    Último acesso: {new Date(user.last_login_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do usuário"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Perfil de Acesso *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="">Selecione um perfil</option>
                  {getAvailableRoles().map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Define as permissões do usuário no sistema
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Organização
                </label>
                <select
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Sem organização</option>
                  {getAvailableOrganizations().map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Organização à qual o usuário pertence
                </p>
              </div>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  disabled={loading}
                />
                <span className="ml-2 text-sm font-medium text-slate-700">
                  Conta ativa
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Usuários inativos não podem fazer login no sistema
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.role}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
