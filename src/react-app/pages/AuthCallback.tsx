import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
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
      redirect: sp.get('redirect') || '/',
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

      // 2) Precisa ter code
      if (!oauthParams.code) {
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

        // 🔸 Chama sem argumentos, conforme esperado pela biblioteca
        await exchangeCodeForSessionToken?.();

        setStatus('success');
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
    const redirectTo = sp.get('redirect') || '/';
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
