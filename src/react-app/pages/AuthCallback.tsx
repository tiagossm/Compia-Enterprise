import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, supabase } from '@/react-app/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function AuthCallback() {
  const { exchangeCodeForSessionToken } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const ranRef = useRef(false);

  // Lê e memoiza os parâmetros importantes uma única vez
  const oauthParams = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      code: sp.get('code'),
      state: sp.get('state'),
      error: sp.get('error'),
      error_description: sp.get('error_description'),
      // opcional: para voltar à rota original
      redirect: sp.get('redirect') || '/dashboard',
    };
  }, []);

  useEffect(() => {
    if (ranRef.current) return; // evita rodar 2x em Strict Mode
    ranRef.current = true;

    const run = async () => {
      // 1) Erros enviados pelo provider (antes de tentar trocar code)
      if (oauthParams.error) {
        setStatus('error');
        setError(
          `Provider retornou erro: ${oauthParams.error}${oauthParams.error_description ? ` – ${oauthParams.error_description}` : ''
          }`
        );
        return;
      }

      // 2) Precisa ter code (OU já ter uma sessão ativa recuperada pelo cliente Supabase)
      if (!oauthParams.code) {
        // Correção crítica: O cliente do Supabase (detectSessionInUrl: true) pode ter consumido o código
        // e limpado a URL antes de chegarmos aqui. Vamos verificar se já temos sessão.
        const { data } = await supabase.auth.getSession();

        if (data?.session) {
          console.log('Código não encontrado na URL, mas sessão já está ativa (Supabase auto-detect).');
          setStatus('success');
          return;
        }

        // Se realmente não tem código E não tem sessão, aí sim é erro.
        setStatus('error');
        setError('Código de autorização não encontrado na URL');
        return;
      }

      // 3) (Opcional, mas recomendado) Validar state salvo em cookie/localStorage
      //    Se você salvou "state" antes de redirecionar ao provider, compare aqui.
      //    Exemplo:
      // const expectedState = localStorage.getItem('oauth_state');
      // if (!oauthParams.state || oauthParams.state !== expectedState) {
      //   setStatus('error');
      //   setError('State inválido ou ausente na resposta do provider');
      //   return;
      // }

      try {
        setStatus('loading');

        // 🔸 Tentar trocar o código
        try {
          await exchangeCodeForSessionToken?.();
          setStatus('success');
        } catch (exchangeError: any) {
          console.warn('Troca de código falhou, verificando se já existe sessão válida...', exchangeError);

          // Fallback: Verificar se o usuário JÁ está logado (Race condition do StrictMode)
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            console.log('Sessão encontrada apesar do erro na troca de código. Prosseguindo.');
            setStatus('success');
          } else {
            // Se não tem sessão, então o erro foi real
            throw exchangeError;
          }
        }
      } catch (e: any) {
        console.error('Auth callback error:', e);
        setStatus('error');

        // mensagem amigável + dica de causa raiz frequente (cookie samesite/secure/domínio)
        const msg =
          e?.message ||
          'Erro durante autenticação. Possível causa: falha na troca do code por token de sessão no backend.';
        setError(msg);
      }
    };

    run();
  }, [exchangeCodeForSessionToken, oauthParams.code, oauthParams.error, oauthParams.error_description, oauthParams.state]);

  // Redireciona quando o status é success (não precisa esperar user carregar)
  if (status === 'success') {
    const sp = new URLSearchParams(window.location.search);
    const redirectFromQuery = sp.get('redirect');
    const redirectFromStorage = (() => {
      try { return localStorage.getItem('auth_redirect_after_login'); } catch { return null; }
    })();

    // Prefer explicit query param; fallback to stored value; then to dashboard.
    const redirectTo =
      (redirectFromQuery && redirectFromQuery.startsWith('/'))
        ? redirectFromQuery
        : ((redirectFromStorage && redirectFromStorage.startsWith('/')) ? redirectFromStorage : '/dashboard');

    // Cleanup so future logins don't reuse stale redirects.
    try { localStorage.removeItem('auth_redirect_after_login'); } catch { }

    return <Navigate to={redirectTo} replace />;
  }

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
        <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>

        {(status === 'idle' || status === 'loading') && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-slate-700 font-medium">Finalizando login...</span>
            </div>
            <p className="text-slate-500 text-sm">
              Aguarde enquanto configuramos sua conta
            </p>
          </>
        )}

        {(status as string) === 'success' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-slate-700 font-medium">Login realizado com sucesso!</span>
            </div>
            <p className="text-slate-500 text-sm">
              Redirecionando você para o sistema...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-slate-700 font-medium">Erro no login</span>
            </div>
            <p className="text-slate-500 text-sm mb-4 whitespace-pre-wrap">
              {error || 'Ocorreu um erro durante o processo de autenticação'}
            </p>
            <button
              onClick={() => (window.location.href = '/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </div>
  );
}
