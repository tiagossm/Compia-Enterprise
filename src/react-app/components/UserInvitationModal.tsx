import { useState } from 'react';
import { 
  X, 
  Mail, 
  UserPlus, 
  Shield,
  Loader2
} from 'lucide-react';
import { USER_ROLES, UserRole } from '@/shared/user-types';

interface UserInvitationModalProps {
  organizationId: number;
  organizationName: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
  userRole: string;
}

export default function UserInvitationModal({
  organizationId,
  organizationName,
  isOpen,
  onClose,
  onInviteSent,
  userRole
}: UserInvitationModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: USER_ROLES.INSPECTOR as UserRole,
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/multi-tenant/organizations/${organizationId}/invite-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setInvitationUrl(data.invitation_url);
        
        // Reset form
        setFormData({
          email: '',
          role: USER_ROLES.INSPECTOR as UserRole,
          name: ''
        });
        
        // Notify parent component to refresh lists
        onInviteSent();
      } else {
        const error = await response.json();
        alert(`Erro ao enviar convite: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Erro ao enviar convite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationUrl = () => {
    navigator.clipboard.writeText(invitationUrl);
    alert('Link de convite copiado!');
  };

  

  const getAvailableRoles = () => {
    const roles: { value: UserRole; label: string }[] = [
      { value: USER_ROLES.INSPECTOR, label: 'Técnico' },
      { value: USER_ROLES.CLIENT, label: 'Cliente' },
      { value: USER_ROLES.MANAGER, label: 'Gerente' }
    ];

    // Only system admin can create org admins
    if (userRole === USER_ROLES.SYSTEM_ADMIN) {
      roles.unshift({ value: USER_ROLES.ORG_ADMIN, label: 'Administrador da Organização' });
    }

    return roles;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full" role="dialog" aria-labelledby="invite-modal-title" aria-describedby="invite-modal-description">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 id="invite-modal-title" className="font-heading text-xl font-bold text-slate-900">
                  Convidar Usuário
                </h2>
                <p id="invite-modal-description" className="text-sm text-slate-600">
                  Convidar novo usuário para a organização {organizationName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
              aria-label="Fechar modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!invitationUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email do Usuário *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="usuario@empresa.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Perfil *
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {getAvailableRoles().map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  O usuário receberá este nível de acesso no sistema
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-green-100 rounded-full">
                    <Mail className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-green-900">
                    Convite enviado com sucesso!
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  O usuário receberá um email com instruções para aceitar o convite.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Link de Convite
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invitationUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 text-sm"
                  />
                  <button
                    onClick={copyInvitationUrl}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Este link expira em 7 dias. Você pode compartilhá-lo diretamente com o usuário.
                </p>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setInvitationUrl('');
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
