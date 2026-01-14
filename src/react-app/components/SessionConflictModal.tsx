import React from 'react';
import { AlertTriangle, LogOut, RefreshCw, Monitor } from 'lucide-react';

interface SessionConflictModalProps {
    isOpen: boolean;
    conflictDevice?: string;
    onForceLogout: () => void;
    onContinueHere: () => void;
}

/**
 * Modal exibido quando detectamos que outra sessão foi iniciada
 * Oferece opções: forçar logout da outra sessão ou sair desta
 */
export const SessionConflictModal: React.FC<SessionConflictModalProps> = ({
    isOpen,
    conflictDevice,
    onForceLogout,
    onContinueHere,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay - não pode fechar clicando fora */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header com alerta */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-full">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Sessão Ativa Detectada</h2>
                            <p className="text-white/90 text-sm">
                                Sua conta está em uso em outro dispositivo
                            </p>
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                    {/* Dispositivo conflitante */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-4">
                        <div className="p-2 bg-slate-200 rounded-lg">
                            <Monitor className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Dispositivo ativo:</p>
                            <p className="font-medium text-slate-900">
                                {conflictDevice || 'Outro dispositivo'}
                            </p>
                        </div>
                    </div>

                    <p className="text-slate-600 mb-6">
                        Por segurança, apenas uma sessão pode estar ativa por vez.
                        O que você deseja fazer?
                    </p>

                    {/* Opções */}
                    <div className="space-y-3">
                        {/* Opção 1: Continuar aqui (encerrar outra sessão) */}
                        <button
                            onClick={onContinueHere}
                            className="w-full flex items-center gap-4 p-4 border-2 border-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left"
                        >
                            <div className="p-2 bg-blue-200 rounded-lg">
                                <RefreshCw className="w-5 h-5 text-blue-700" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-blue-900">Continuar aqui</h3>
                                <p className="text-sm text-blue-700">
                                    Encerrar a sessão no outro dispositivo
                                </p>
                            </div>
                        </button>

                        {/* Opção 2: Sair desta sessão */}
                        <button
                            onClick={onForceLogout}
                            className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <LogOut className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-slate-900">Sair desta sessão</h3>
                                <p className="text-sm text-slate-500">
                                    Manter a outra sessão ativa
                                </p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-xs text-slate-500 text-center">
                        Este é um recurso de segurança para proteger sua conta.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SessionConflictModal;
