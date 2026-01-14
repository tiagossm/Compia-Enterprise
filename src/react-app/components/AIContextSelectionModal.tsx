import { useState, useEffect } from 'react';
import {
    X,
    Check,
    FileText,
    Image as ImageIcon,
    Music,
    Bot,
    AlertCircle
} from 'lucide-react';

export interface MediaItem {
    id: number;
    file_url: string;
    media_type: 'image' | 'video' | 'audio' | 'document';
    file_name?: string;
    mime_type?: string;
    created_at?: string;
}

interface AIContextSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: number[]) => void;
    media: MediaItem[];
    itemName?: string;
}

export default function AIContextSelectionModal({
    isOpen,
    onClose,
    onConfirm,
    media,
    itemName
}: AIContextSelectionModalProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Auto-select first 3 by default when opening
    useEffect(() => {
        if (isOpen && media.length > 0) {
            // Default: Select up to 3 most recent (or first in list)
            setSelectedIds(media.slice(0, 3).map(m => m.id));
        }
    }, [isOpen, media]);

    const toggleSelection = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            // Hard limit of 5 for safety (Backend limit is also increased)
            if (selectedIds.length >= 5) {
                alert("Selecione no máximo 5 mídias para garantir a performance da análise.");
                return;
            }
            setSelectedIds([...selectedIds, id]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Bot className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Definir Contexto da IA</h2>
                            {itemName && <p className="text-xs text-slate-500 line-clamp-1 max-w-md">Item: {itemName}</p>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto min-h-[300px]">
                    <div className="flex items-center gap-2 mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                        <AlertCircle size={16} />
                        <p>Selecione as mídias (fotos, áudios, docs) mais relevantes para a análise.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {media.map((item) => {
                            const isSelected = selectedIds.includes(item.id);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => toggleSelection(item.id)}
                                    className={`
                                        relative group cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 text-left
                                        ${isSelected
                                            ? 'border-blue-500 bg-blue-50/30'
                                            : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                                        }
                                    `}
                                >
                                    {/* Selection Indicator */}
                                    <div className={`
                                        absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white border
                                        ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 text-transparent'}
                                    `}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>

                                    {/* Thumbnail Preview */}
                                    <div className="aspect-square bg-slate-100 flex items-center justify-center relative">
                                        {item.media_type === 'image' ? (
                                            <img
                                                src={item.file_url}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                {item.media_type === 'audio' && <Music size={32} />}
                                                {item.media_type === 'document' && <FileText size={32} />}
                                                <span className="text-xs uppercase font-semibold tracking-wider">{item.media_type}</span>
                                            </div>
                                        )}

                                        {/* Overlay when selected */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-blue-500/10" />
                                        )}
                                    </div>

                                    {/* Footer Name */}
                                    <div className="p-2 bg-white border-t border-slate-100 text-xs text-slate-600 truncate font-medium">
                                        {item.file_name || 'Sem nome'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {media.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <ImageIcon className="w-12 h-12 mx-auto opacity-20 mb-2" />
                            <p>Nenhuma mídia encontrada para este item.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-xl">
                    <span className="text-sm font-medium text-slate-500">
                        {selectedIds.length} selecionado(s) <span className='text-xs opacity-60'>(Máx: 5)</span>
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-colors font-medium border border-transparent hover:border-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={selectedIds.length === 0}
                            onClick={() => onConfirm(selectedIds)}
                            className={`
                                px-6 py-2 rounded-lg text-white font-medium shadow-sm flex items-center gap-2 transition-all
                                ${selectedIds.length > 0
                                    ? 'bg-blue-600 hover:bg-blue-700 hover:shadow transform hover:-translate-y-0.5'
                                    : 'bg-slate-300 cursor-not-allowed'
                                }
                            `}
                        >
                            <Bot size={18} />
                            Analisar com IA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
