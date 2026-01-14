import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
    status: AutoSaveStatus;
    errorMessage?: string;
}

export default function AutoSaveIndicator({ status, errorMessage }: AutoSaveIndicatorProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (status === 'saving' || status === 'saved' || status === 'error') {
            setShow(true);

            // Auto-hide after 3 seconds for 'saved' status
            if (status === 'saved') {
                const timer = setTimeout(() => setShow(false), 3000);
                return () => clearTimeout(timer);
            }
        } else {
            setShow(false);
        }
    }, [status]);

    if (!show) return null;

    const getStatusConfig = () => {
        switch (status) {
            case 'saving':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" />,
                    text: 'Salvando...',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700',
                    borderColor: 'border-blue-200'
                };
            case 'saved':
                return {
                    icon: <Check className="w-4 h-4" />,
                    text: 'Salvo',
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-700',
                    borderColor: 'border-green-200'
                };
            case 'error':
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    text: errorMessage || 'Erro ao salvar',
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-700',
                    borderColor: 'border-red-200'
                };
            default:
                return {
                    icon: <Cloud className="w-4 h-4" />,
                    text: 'Aguardando...',
                    bgColor: 'bg-slate-50',
                    textColor: 'text-slate-700',
                    borderColor: 'border-slate-200'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div
            className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border shadow-lg transition-all duration-300 ease-in-out ${config.bgColor} ${config.borderColor} animate-fade-in`}
            role="status"
            aria-live="polite"
            aria-label={config.text}
        >
            <div className={config.textColor}>
                {config.icon}
            </div>
            <span className={`text-sm font-medium ${config.textColor}`}>
                {config.text}
            </span>
        </div>
    );
}
