import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Brain, FileEdit, X } from 'lucide-react';

interface FloatingNewButtonProps {
    currentFolderId?: string | null;
}

export default function FloatingNewButton({ currentFolderId }: FloatingNewButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const handleNavigation = (path: string) => {
        setIsOpen(false);
        const url = currentFolderId ? `${path}?folder_id=${currentFolderId}` : path;
        setTimeout(() => navigate(url), 100);
    };

    return (
        <>
            {/* Botão Flutuante Fixo */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-8 z-50 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                style={{ pointerEvents: 'auto' }}
            >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Novo Checklist</span>
            </button>

            {/* Modal Fullscreen */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Criar Novo Checklist</h3>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Options */}
                        <div className="p-4 space-y-2">
                            <button
                                type="button"
                                onClick={() => handleNavigation('/checklists/import')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-green-50 transition-all border-2 border-transparent hover:border-green-200 group"
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
                                    <Upload className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-semibold text-slate-900 text-lg">Importar/Colar CSV</div>
                                    <div className="text-sm text-slate-500">Upload de arquivo ou colar dados</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleNavigation('/checklists/ai-generate')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-purple-50 transition-all border-2 border-transparent hover:border-purple-200 group"
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
                                    <Brain className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-semibold text-slate-900 text-lg">Gerar com IA</div>
                                    <div className="text-sm text-slate-500">Criação inteligente e automatizada</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleNavigation('/checklists/new')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-all border-2 border-transparent hover:border-blue-200 group"
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                                    <FileEdit className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-semibold text-slate-900 text-lg">Manual</div>
                                    <div className="text-sm text-slate-500">Criar do zero passo a passo</div>
                                </div>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
