
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

        {/* LADO ESQUERDO: Branding / Logo */}
        <div className="w-full md:w-[540px] bg-white flex flex-col items-center justify-center p-0 border-b md:border-b-0 md:border-r border-slate-100 relative overflow-hidden shrink-0">
          {/* Background Circle Decoration matched from brand */}
          <div className="absolute w-64 h-64 bg-[#2050E0]/5 rounded-full blur-3xl -top-10 -left-10"></div>
          <div className="absolute w-64 h-64 bg-[#605E88]/5 rounded-full blur-3xl -bottom-10 -right-10"></div>

          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
            <img
              src="/compia_logo.png"
              alt="Compia Logo"
              className="w-[85%] h-auto object-contain transition-transform hover:scale-105 duration-500"
            />
          </div>
        </div>

        {/* LADO DIREITO: Formulário */}
        <div className="w-full md:w-[420px] p-8 md:p-12 flex flex-col justify-center bg-white shrink-0">

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#303C60] mb-2 tracking-tight">Login</h2>
            <p className="text-slate-400 text-sm">Entre com suas credenciais ou social.</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start text-left animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-600 font-medium">{error}</span>
              </div>
            )}

            {/* Login Social - Google como PRINCIPAL */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-[#2050E0] hover:bg-[#1a40b0] text-white font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 active:scale-[0.99] relative overflow-hidden group"
            >
              <div className="bg-white p-1 rounded-full absolute left-4">
                <Chrome className="w-5 h-5 text-[#2050E0]" />
              </div>
              <span>Entrar com Google</span>
            </button>

            <div className="flex items-center justify-between gap-4 py-2">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">ou continue com email</span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            {/* CAMPO E-MAIL */}
            <div className="space-y-1.5">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                  <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-[#2050E0] transition-colors" />
                  </div>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Usuário" // Matching "User" from mockup
                  className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-[#2050E0]/10 focus:border-[#2050E0] placeholder:text-slate-400 font-medium transition-all duration-200"
                />
              </div>
            </div>

            {/* CAMPO SENHA */}
            <div className="space-y-1.5">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                  <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#2050E0] transition-colors" />
                  </div>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha" // Matching "Password" from mockup
                  className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-[#2050E0]/10 focus:border-[#2050E0] placeholder:text-slate-400 font-medium transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-[#2050E0] focus:ring-[#2050E0] transition-all"
                />
                <span className="text-slate-500 group-hover:text-[#2050E0] transition-colors">Lembrar de mim</span>
              </label>
              <a className="text-[#2050E0] hover:text-[#1a40b0] font-semibold transition-colors hover:underline" href="#">Esqueceu a senha?</a>
            </div>

            {/* BOTÃO SECUNDÁRIO (EMAIL) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-lg shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Rodapé de Cadastro */}
          <div className="pt-8 text-center text-sm">
            <span className="text-slate-400">Novo na Compia? </span>
            <Link
              to="/register"
              className="text-[#2050E0] hover:text-[#1a40b0] font-bold transition-colors"
            >
              Solicite seu acesso
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
