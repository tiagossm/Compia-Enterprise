import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

interface DatabaseStatusProps {
  onRetry?: () => void;
}

export default function DatabaseStatus({ onRetry }: DatabaseStatusProps) {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  const checkDatabaseHealth = async () => {
    try {
      setStatus('checking');
      // Use regular fetch - health endpoint is public and doesn't need auth
      const response = await fetch('/api/health');

      if (response.ok) {
        const data = await response.json();
        if (data.database === 'connected') {
          setStatus('healthy');
          setRetryCount(0);
          return true;
        }
      }

      setStatus('error');
      return false;
    } catch (error) {
      console.error('Database health check failed:', error);
      setStatus('error');
      return false;
    }
  };

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    const success = await checkDatabaseHealth();

    if (success && onRetry) {
      onRetry();
    }
  };

  useEffect(() => {
    checkDatabaseHealth();

    // Check periodically if there's an error
    const interval = setInterval(() => {
      if (status === 'error') {
        checkDatabaseHealth();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [status]);

  if (status === 'healthy') {
    return null; // Don't show anything when healthy
  }

  if (status === 'checking' && retryCount === 0) {
    return (
      <div className="fixed top-4 right-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Verificando conexão...</span>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm z-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-sm">Problema de Conectividade</h4>
          <p className="text-xs text-red-600 mt-1">
            Banco de dados temporariamente indisponível.
            {retryCount > 0 && ` (Tentativa ${retryCount})`}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleRetry}
              disabled={status === 'checking'}
              className="inline-flex items-center gap-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              {status === 'checking' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Database className="w-3 h-3" />
              )}
              {status === 'checking' ? 'Tentando...' : 'Tentar novamente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
