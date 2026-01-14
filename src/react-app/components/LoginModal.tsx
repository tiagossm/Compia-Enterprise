import { useState } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import { Shield, LogIn, Loader2, Chrome } from 'lucide-react';
import DialogWrapper from './DialogWrapper';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { redirectToLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await redirectToLogin();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <DialogWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Bem-vindo ao Compia"
      description="Sistema inteligente de inspeções de segurança do trabalho"
      className="p-8 relative"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="text-center mb-8">
        <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Bem-vindo ao Compia</h2>
        <p className="text-slate-600 mt-2">Faça login para acessar o sistema de inspeções de segurança do trabalho</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <>
              <Chrome className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              <span className="font-medium text-slate-700 group-hover:text-blue-700">
                Entrar com Google
              </span>
            </>
          )}
        </button>

        <div className="text-center">
          <p className="text-sm text-slate-500">
            Ao fazer login, você concorda com nossos{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <LogIn className="w-4 h-4" />
          <span>Login seguro via OAuth 2.0</span>
        </div>
      </div>
    </DialogWrapper>
  );
}
