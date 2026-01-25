
import { useEffect, useState } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Chrome, Loader2, AlertTriangle, User, Lock } from 'lucide-react';

export default function Login() {
  const {
    user,
    isPending,
    signInWithGoogle
  } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname || '/';

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-redirect if already authenticated
    if (user && !isPending) {
      console.log('User authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [user, isPending, from, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signInWithGoogle();
      // Note: Page will redirect to Google OAuth, so no need to setIsLoading(false)
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Erro ao fazer login com Google');
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha email e senha.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetchWithAuth('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Login bem sucedido, recarregar página para auth context pegar o cookie
        window.location.reload();
      } else {
        if (data.code === 'APPROVAL_PENDING') {
          setError('Sua conta aguarda aprovação do administrador.');
        } else if (data.code === 'APPROVAL_REJECTED') {
          setError('Sua solicitação de cadastro foi recusada.');
        } else {
          setError(data.error || 'Credenciais inválidas.');
        }
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro de conexão. Tente novamente.');
      setIsLoading(false);
    }
  };

  if (isPending) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Verificando autenticação...</p>
      </div>
    </div>;
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F7FA] font-sans p-4">

      {/* CARD DE LOGIN HORIZONTAL */}
      <div className="w-full md:w-auto md:max-w-[95vw] bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row shadow-slate-200/50">

        {/* LADO ESQUERDO: Vitrine Estratégica (Visual Rico) */}
        <div className="w-full md:w-[600px] bg-[#0F172A] flex flex-col items-center justify-between p-8 md:p-12 text-center md:text-left relative overflow-hidden shrink-0">

          {/* Background Decorations (Subtle Technical Mesh) */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.15)_1px,_transparent_0)] bg-[length:24px_24px]"></div>
          <div className="absolute w-[500px] h-[500px] bg-[#0EA5E9]/10 rounded-full blur-3xl -top-32 -left-32 animate-pulse"></div>

          <div className="relative z-10 w-full flex flex-col h-full justify-center max-w-[400px]">
            {/* Conteúdo Centralizado como Bloco Único */}
            <div className="flex flex-col gap-8 md:gap-10">
              {/* Header: Logo */}
              <div>
                <img
                  src="/compia_logo.png"
                  alt="Compia Logo"
                  className="w-48 md:w-64 h-auto object-contain mb-2 filter brightness-0 invert opacity-90 text-left md:ml-0 mx-auto"
                />
              </div>

              {/* Main Content */}
              <div className="space-y-3 md:space-y-4">
                <h2 className="text-2xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                  Gestão Inteligente <br />
                  <span className="text-[#38BDF8]">de Auditorias</span>
                </h2>

                <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                  Plataforma corporativa de controle e conformidade.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: Formulário */}
        <div className="w-full md:w-[450px] p-6 md:p-14 flex flex-col justify-center bg-white shrink-0 md:min-h-[600px]">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2 tracking-tight">Login</h2>
            <p className="text-slate-500 text-sm">Insira suas credenciais de acesso seguro.</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start text-left animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-600 font-medium">{error}</span>
              </div>
            )}

            {/* CAMPO E-MAIL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Usuário</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                  <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-[#0369A1] transition-colors" />
                  </div>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com"
                  className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] placeholder:text-slate-300 font-medium transition-all duration-200"
                />
              </div>
            </div>

            {/* CAMPO SENHA */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                  <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#0369A1] transition-colors" />
                  </div>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-[#0369A1]/20 focus:border-[#0369A1] placeholder:text-slate-300 font-medium transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1 pt-2">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-[#0369A1] focus:ring-[#0369A1] transition-all"
                />
                <span className="text-slate-600 font-medium group-hover:text-[#0369A1] transition-colors">Lembrar de mim</span>
              </label>
              <a className="text-[#0369A1] hover:text-[#024d77] font-semibold transition-colors hover:underline" href="#">Esqueceu a senha?</a>
            </div>

            {/* BOTÃO PRIMÁRIO (EMAIL) - Agora em cima */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0F172A] hover:bg-slate-900 text-white font-bold h-14 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 mt-6 text-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Acessar Painel'
              )}
            </button>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-semibold uppercase tracking-widest">OU</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Login Social - Google como SECUNDÁRIO (Outline) */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-base transition-all duration-300 group"
            >
              <Chrome className="w-5 h-5 text-slate-500 group-hover:text-[#4285F4] transition-colors" />
              <span>Entrar com Google</span>
            </button>

          </form>

          {/* Rodapé de Cadastro */}
          <div className="pt-8 text-center text-sm">
            <span className="text-slate-400">Sua empresa ainda não tem acesso? </span>
            <Link
              to="/register"
              className="text-[#0369A1] hover:text-[#024d77] font-bold transition-colors block mt-1 hover:underline text-base"
            >
              Solicitar conta corporativa
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
