import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/react-app/context/AuthContext';
import { supabase } from '@/react-app/lib/supabase';
import {
  Mail,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Lock,
  User,
  LogOut
} from 'lucide-react';

interface InvitationData {
  email: string;
  organization_id: number;
  role: string;
  organization_name?: string;
  inviter_name?: string;
  expires_at: string;
}

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'register' | 'login'>('register'); // register = Criar conta, login = Tenho conta

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  // Se usuário já logado, pré-preencher nome
  useEffect(() => {
    // Cast user to any to access metadata safely if type definition is strict
    const u = user as any;
    if (u && (u.user_metadata?.name || u.name)) {
      setName(u.user_metadata?.name || u.name);
    }
  }, [user]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setInvitation(data);
          // Se usuário logado e email não bate, avisar
          if (user && user.email?.toLowerCase() !== data.email.toLowerCase()) {
            setError(`Logado como ${user.email}, mas convite é para ${data.email}`);
          }
        } else {
          setError(data.reason || 'Convite inválido');
        }
      } else {
        setError('Erro ao validar convite');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao validar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      // 1. Chamar endpoint unificado que cria user e aceita convite
      const response = await fetch('/api/invitations/register-and-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'user_exists') {
          setMode('login');
          setError('Usuário já existe. Por favor, faça login para aceitar.');
          return;
        }
        throw new Error(data.message || data.error || 'Erro ao processar');
      }

      // 2. Sucesso! Fazer login automático
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation?.email!,
        password
      });

      if (signInError) {
        console.warn('Auto-login falhou, redirecionando para login manual', signInError);
        navigate('/login?email=' + invitation?.email);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao aceitar convite');
    } finally {
      setProcessing(false);
    }
  };

  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    // Se já estiver logado com o email certo, só aceitar
    if (user && user.email === invitation?.email) {
      acceptOnly();
      return;
    }

    // Se estiver deslogado ou logado com outro email, fazer login primeiro
    // Obs: Usuário deve estar deslogado para ver o formulário de login aqui
    // Mas se o componente mostrar form de login, fazemos signIn
    if (!password) {
      setError('Senha obrigatória');
      setProcessing(false);
      return;
    }

    try {
      // Se tiver logado com outro user, logout antes
      if (user) await signOut();

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: invitation?.email!,
        password
      });

      if (loginError) throw loginError;

      // Agora logado, chamar accept
      await acceptOnly();

    } catch (err: any) {
      setError('Email ou senha incorretos');
      setProcessing(false);
    }
  };

  const acceptOnly = async () => {
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        const d = await response.json();
        throw new Error(d.error || 'Erro ao aceitar');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  // --- RENDERS ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600">Verificando convite...</p>
      </div>
    );
  }

  if (!invitation) { // Invalido e carregado
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Convite Inválido</h1>
          <p className="text-slate-600 mb-6">{error || 'O convite expirou ou não existe.'}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">
            Ir para página inicial
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Bem-vindo(a)!</h1>
          <p className="text-slate-600 mb-6">Convite aceito com sucesso. Entrando...</p>
          <Loader2 className="mx-auto w-6 h-6 text-green-600 animate-spin" />
        </div>
      </div>
    )
  }

  const isEmailMismatch = user && user.email !== invitation.email;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* CARD PRINCIPAL */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">

        {/* Header Organização */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto flex items-center justify-center mb-4 ring-1 ring-white/30">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {invitation.organization_name}
            </h1>
            <p className="text-blue-100 text-sm">
              {invitation.inviter_name ? `${invitation.inviter_name} convidou você` : 'Você foi convidado'} para a equipe
            </p>
          </div>
        </div>

        <div className="p-8">

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* EMAIL MISMATCH ALERT */}
          {isEmailMismatch && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium mb-2">Conta incorreta</p>
              <p className="text-sm text-amber-700 mb-3">
                Você está logado como <strong>{user.email}</strong>, mas o convite é para <strong>{invitation.email}</strong>.
              </p>
              <button
                onClick={() => signOut()}
                className="text-sm bg-white border border-amber-300 px-3 py-1.5 rounded-md text-amber-800 hover:bg-amber-100 flex items-center gap-2"
              >
                <LogOut className="w-3 h-3" />
                Sair e usar conta correta
              </button>
            </div>
          )}

          {/* FORM */}
          {!isEmailMismatch && (
            <>
              {/* TABS (Register vs Login) */}
              <div className="flex border-b border-slate-200 mb-6">
                <button
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${mode === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setMode('register')}
                >
                  Criar Conta
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${mode === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setMode('login')}
                >
                  Já tenho conta
                </button>
              </div>

              <form onSubmit={mode === 'register' ? handleRegisterAndAccept : handleLoginAndAccept}>
                <div className="space-y-4">

                  {/* Email Readonly */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                    <div className="flex items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-not-allowed">
                      <Mail className="w-4 h-4 mr-3 text-slate-400" />
                      {invitation.email}
                    </div>
                  </div>

                  {/* Name (Register Only) */}
                  {mode === 'register' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Como gostaria de ser chamado"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {mode === 'register' ? 'Defina sua Senha' : 'Sua Senha'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                    {mode === 'register' && (
                      <p className="text-xs text-slate-500 mt-1">Mínimo de 6 caracteres</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-2 hover:translate-y-[-1px]"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        {mode === 'register' ? 'Criar Conta e Aceitar' : 'Entrar e Aceitar'}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                </div>
              </form>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Ao continuar, você concorda com os Termos de Uso do Compia.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
