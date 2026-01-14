
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>

                        <h1 className="text-xl font-bold text-slate-900 mb-2">
                            Ops! Algo deu errado.
                        </h1>

                        <p className="text-slate-600 mb-6 text-sm">
                            Pedimos desculpas pelo inconveniente. Um erro inesperado ocorreu.
                            Nossa equipe técnica foi notificada automaticamente.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-50 rounded text-left overflow-auto max-h-48 text-xs font-mono text-red-800 border border-red-100">
                                <p className="font-bold mb-1">{this.state.error.toString()}</p>
                                <p className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                <RefreshCw size={18} />
                                Recarregar Página
                            </button>

                            <a
                                href="/"
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                <Home size={18} />
                                Voltar ao Início
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
