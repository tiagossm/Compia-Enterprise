import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

interface UsageIndicatorProps {
    currentUsage: number;
    limit: number;
    resetDate?: string;
    showDetails?: boolean;
    className?: string;
    onUpgradeClick?: () => void;
}

/**
 * Componente que exibe o uso de IA da organização
 * Mostra barra de progresso e alertas quando próximo do limite
 */
export const UsageIndicator: React.FC<UsageIndicatorProps> = ({
    currentUsage,
    limit,
    resetDate,
    showDetails = false,
    className = '',
    onUpgradeClick,
}) => {
    const percentUsed = Math.min(100, Math.round((currentUsage / limit) * 100));
    const remaining = Math.max(0, limit - currentUsage);

    // Determinar cor da barra baseado no uso
    const getBarColor = () => {
        if (percentUsed >= 100) return 'bg-red-500';
        if (percentUsed >= 80) return 'bg-amber-500';
        if (percentUsed >= 50) return 'bg-yellow-500';
        return 'bg-emerald-500';
    };

    // Determinar status e ícone
    const getStatus = () => {
        if (percentUsed >= 100) {
            return {
                icon: AlertTriangle,
                text: 'Limite atingido',
                color: 'text-red-600',
                bgColor: 'bg-red-50',
            };
        }
        if (percentUsed >= 80) {
            return {
                icon: AlertTriangle,
                text: 'Limite próximo',
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
            };
        }
        if (percentUsed >= 50) {
            return {
                icon: AlertTriangle,
                text: 'Uso moderado',
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-50',
            };
        }
        return {
            icon: Sparkles,
            text: 'IA disponível',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
        };
    };

    const status = getStatus();
    const StatusIcon = status.icon;

    // Formatar data de reset
    const formatResetDate = () => {
        if (!resetDate) return '';
        const date = new Date(resetDate);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };



    return (
        <div className={`${className}`}>
            {/* Versão compacta (para header/sidebar) com Plaqueta Hover */}
            {!showDetails ? (
                <div className="relative group z-50">
                    {/* Badge Visível */}
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bgColor} cursor-help transition-all duration-300 group-hover:scale-105 group-hover:shadow-md`}
                    >
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        <span className={`text-sm font-bold ${status.color}`}>
                            {currentUsage}/{limit}
                        </span>
                    </div>

                    {/* Plaqueta/Card Hover (Fallback Status) */}
                    <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 transform translate-y-[-10px] group-hover:translate-y-0 z-50 pointer-events-none group-hover:pointer-events-auto">
                        {/* Seta (Triângulo) */}
                        <div className="absolute -top-2 right-6 w-4 h-4 bg-white border-t border-l border-slate-100 transform rotate-45"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${status.bgColor} shrink-0`}>
                                    <StatusIcon className={`w-5 h-5 ${status.color}`} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Consumo de IA</h4>
                                    <p className="text-xs text-slate-500 leading-tight">
                                        {percentUsed < 80 ? 'Você está dentro do limite.' : 'Atenção ao seu consumo.'}
                                    </p>
                                </div>
                            </div>

                            {/* Barra de Progresso */}
                            <div className="space-y-1 mb-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Uso Mensal</span>
                                    <span className={`${status.color} font-bold`}>{percentUsed}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getBarColor()} transition-all duration-500`}
                                        style={{ width: `${percentUsed}%` }}
                                    />
                                </div>
                            </div>

                            {/* Detalhes/Fallback */}
                            <div className="bg-slate-50 rounded-lg p-2.5 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Utilizados:</span>
                                    <span className="font-semibold text-slate-700">{currentUsage} requisições</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Restantes:</span>
                                    <span className="font-semibold text-slate-700">{remaining} requisições</span>
                                </div>
                                {resetDate && (
                                    <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1">
                                        <span className="text-slate-500">Renova em:</span>
                                        <span className="font-medium text-blue-600">{formatResetDate()}</span>
                                    </div>
                                )}
                            </div>

                            {percentUsed >= 80 && onUpgradeClick && (
                                <button
                                    onClick={onUpgradeClick}
                                    className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow"
                                >
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Aumentar Limite
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Versão detalhada (para dashboard) - MANTER INALTERADA */
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${status.bgColor}`}>
                                <Sparkles className={`w-5 h-5 ${status.color}`} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Análises de IA</h3>
                                <p className="text-xs text-slate-500">{status.text}</p>
                            </div>
                        </div>
                        {percentUsed >= 80 && onUpgradeClick && (
                            <button
                                onClick={onUpgradeClick}
                                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                <TrendingUp className="w-4 h-4" />
                                Upgrade
                            </button>
                        )}
                    </div>

                    {/* Barra de progresso */}
                    <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">
                                {currentUsage} de {limit} análises
                            </span>
                            <span className={`font-medium ${status.color}`}>
                                {percentUsed}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${getBarColor()} transition-all duration-500`}
                                style={{ width: `${percentUsed}%` }}
                            />
                        </div>
                    </div>

                    {/* Informações adicionais */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                            {remaining} análises restantes
                        </span>
                        {resetDate && (
                            <span>
                                Renova em {formatResetDate()}
                            </span>
                        )}
                    </div>

                    {/* Alerta de limite */}
                    {percentUsed >= 100 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                                Você atingiu o limite de análises deste mês.{' '}
                                {onUpgradeClick ? (
                                    <button
                                        onClick={onUpgradeClick}
                                        className="font-medium underline hover:no-underline"
                                    >
                                        Faça upgrade do seu plano
                                    </button>
                                ) : (
                                    'Aguarde a renovação ou faça upgrade.'
                                )}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UsageIndicator;
