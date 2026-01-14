import React from 'react';
import { X, AlertTriangle, TrendingUp, Clock, Zap } from 'lucide-react';

interface LimitReachedModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUsage: number;
    limit: number;
    resetDate?: string;
    onUpgrade?: () => void;
    onBuyPackage?: () => void;
}

/**
 * Modal exibido quando o usuário atinge o limite de análises de IA
 * Oferece opções: aguardar reset, comprar pacote extra, ou fazer upgrade
 */
export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
    isOpen,
    onClose,
    currentUsage,
    limit,
    resetDate,
    onUpgrade,
    onBuyPackage,
}) => {
    if (!isOpen) return null;

    // Calcular dias até reset
    const getDaysUntilReset = () => {
        if (!resetDate) return null;
        const reset = new Date(resetDate);
        const today = new Date();
        const diffTime = reset.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilReset = getDaysUntilReset();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header com alerta */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-full">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Limite de IA Atingido</h2>
                            <p className="text-white/90 text-sm">
                                Você usou {currentUsage} de {limit} análises
                            </p>
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                    <p className="text-slate-600 mb-6">
                        Você atingiu o limite de análises de IA do seu plano.
                        Escolha uma opção para continuar:
                    </p>

                    {/* Opções */}
                    <div className="space-y-3">
                        {/* Opção 1: Aguardar reset */}
                        {daysUntilReset && (
                            <button
                                onClick={onClose}
                                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Clock className="w-5 h-5 text-slate-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-slate-900">Aguardar renovação</h3>
                                    <p className="text-sm text-slate-500">
                                        Seu limite renova em {daysUntilReset} dia{daysUntilReset > 1 ? 's' : ''}
                                    </p>
                                </div>
                                <span className="text-slate-400">Grátis</span>
                            </button>
                        )}

                        {/* Opção 2: Comprar pacote extra */}
                        {onBuyPackage && (
                            <button
                                onClick={onBuyPackage}
                                className="w-full flex items-center gap-4 p-4 border border-blue-200 bg-blue-50 rounded-xl hover:border-blue-300 hover:bg-blue-100 transition-colors text-left"
                            >
                                <div className="p-2 bg-blue-200 rounded-lg">
                                    <Zap className="w-5 h-5 text-blue-700" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-blue-900">Comprar pacote extra</h3>
                                    <p className="text-sm text-blue-700">
                                        +50 análises adicionais
                                    </p>
                                </div>
                                <span className="font-medium text-blue-700">R$ 29</span>
                            </button>
                        )}

                        {/* Opção 3: Upgrade de plano */}
                        {onUpgrade && (
                            <button
                                onClick={onUpgrade}
                                className="w-full flex items-center gap-4 p-4 border-2 border-emerald-500 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors text-left"
                            >
                                <div className="p-2 bg-emerald-200 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-emerald-700" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-emerald-900">Fazer upgrade</h3>
                                    <p className="text-sm text-emerald-700">
                                        Mais análises + recursos premium
                                    </p>
                                </div>
                                <span className="text-xs font-semibold bg-emerald-500 text-white px-2 py-1 rounded-full">
                                    RECOMENDADO
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-xs text-slate-500 text-center">
                        Todas as suas inspeções continuam salvas.
                        Apenas a análise por IA está limitada.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LimitReachedModal;
