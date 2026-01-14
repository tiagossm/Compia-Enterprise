import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/react-app/context/AuthContext';
import {
  Mail,
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  ExternalLink
} from 'lucide-react';

interface InvitationData {
  email: string;
  organization_id: number;
  role: string;
  invited_by: string;
  expires_at: string;
  organization_name?: string;
  inviter_name?: string;
}

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}/details`);
      if (response.ok) {
        const data = await response.json();
        setInvitation(data.invitation);
      } else if (response.status === 404) {
        setError('Convite não encontrado ou expirado');
      } else {
        setError('Erro ao carregar convite');
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user || !token) {
      setError('Você precisa estar logado para aceitar o convite');
      return;
    }

    if (user.email !== invitation?.email) {
      setError('Este convite foi enviado para outro email. Faça login com o email correto.');
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao aceitar convite');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Erro ao aceitar convite');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'system_admin': return 'Administrador do Sistema';
      case 'org_admin': return 'Administrador da Organização';
      case 'manager': return 'Gerente';
      case 'inspector': return 'Técnico';
      case 'client': return 'Cliente';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system_admin': return 'text-red-600 bg-red-100';
      case 'org_admin': return 'text-purple-600 bg-purple-100';
      case 'manager': return 'text-blue-600 bg-blue-100';
      case 'inspector': return 'text-green-600 bg-green-100';
      case 'client': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Carregando Convite
          </h2>
          <p className="text-slate-600">
            Verificando os detalhes do seu convite...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Erro no Convite
          </h2>
          <p className="text-slate-600 mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Convite Aceito!
          </h2>
          <p className="text-slate-600 mb-4">
            Bem-vindo à {invitation?.organization_name}! Você será redirecionado em instantes.
          </p>
          <div className="flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-slate-600">Redirecionando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="p-4 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Login Necessário
          </h2>
          <p className="text-slate-600 mb-4">
            Você precisa fazer login para aceitar este convite.
          </p>

          {invitation && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
              <h3 className="font-medium text-slate-900 mb-2">Detalhes do Convite:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Email: {invitation.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    Organização: {invitation.organization_name || 'Carregando...'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                    {getRoleLabel(invitation.role)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Convite de Organização
          </h2>
          <p className="text-slate-600">
            Você foi convidado para participar de uma organização
          </p>
        </div>

        {invitation && (
          <div className="space-y-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-3">Detalhes do Convite</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Email:</span>
                  <span className="text-sm font-medium text-slate-900">{invitation.email}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Organização:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {invitation.organization_name || 'Carregando...'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Perfil:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                    {getRoleLabel(invitation.role)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Convidado por:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {invitation.inviter_name || 'Sistema'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Expira em:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {user.email !== invitation.email && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      Email Diferente
                    </p>
                    <p className="text-sm text-yellow-700">
                      Este convite foi enviado para <strong>{invitation.email}</strong>,
                      mas você está logado como <strong>{user.email}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/login')}
            className="flex-1 py-2 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={acceptInvitation}
            disabled={accepting || user.email !== invitation?.email}
            className="flex-1 flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aceitando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aceitar Convite
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            Ao aceitar este convite, você concorda em participar da organização com o perfil especificado.
          </p>
        </div>
      </div>
    </div>
  );
}
