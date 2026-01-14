import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Brain, FileEdit, ChevronDown } from 'lucide-react';

export default function NewChecklistDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleOptionClick = (path: string) => {
        setIsOpen(false);
        navigate(path);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap shadow-sm"
            >
                <Plus className="w-4 h-4" />
                <span>Novo Checklist</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="py-1">
                        <button
                            type="button"
                            onClick={() => handleOptionClick('/checklists/import')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-green-50 transition-colors"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100">
                                <Upload className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="font-medium text-slate-900">Importar/Colar CSV</div>
                                <div className="text-xs text-slate-500">Upload de arquivo</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOptionClick('/checklists/ai-generator')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 transition-colors"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100">
                                <Brain className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="font-medium text-slate-900">Gerar com IA</div>
                                <div className="text-xs text-slate-500">Criação inteligente</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOptionClick('/checklists/new')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 transition-colors"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                                <FileEdit className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="font-medium text-slate-900">Manual</div>
                                <div className="text-xs text-slate-500">Criar do zero</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
