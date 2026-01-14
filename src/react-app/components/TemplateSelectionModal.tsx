import { useState, useEffect } from 'react';
import { X, Search, Folder, FileText, ChevronRight } from 'lucide-react';
import { ChecklistTemplate } from '@/shared/checklist-types';
import { ChecklistFolder } from '@/shared/checklist-types';

interface TemplateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: ChecklistTemplate) => void;
    folders: ChecklistFolder[];
    templates: ChecklistTemplate[];
}

export default function TemplateSelectionModal({
    isOpen,
    onClose,
    onSelect,
    folders,
    templates
}: TemplateSelectionModalProps) {
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [breadcrumb, setBreadcrumb] = useState<ChecklistFolder[]>([]);

    // Update breadcrumb when folder changes
    useEffect(() => {
        if (!currentFolderId) {
            setBreadcrumb([]);
            return;
        }

        const buildBreadcrumb = (folderId: string): ChecklistFolder[] => {
            const findFolder = (folders: ChecklistFolder[], id: string): ChecklistFolder | null => {
                for (const folder of folders) {
                    if (folder.id === id) return folder;
                    if (folder.children) {
                        const found = findFolder(folder.children, id);
                        if (found) return found;
                    }
                }
                return null;
            };

            const folder = findFolder(folders, folderId);
            if (!folder) return [];

            const path: ChecklistFolder[] = [folder];
            let current = folder;
            while (current.parent_id) {
                const parent = findFolder(folders, current.parent_id);
                if (parent) {
                    path.unshift(parent);
                    current = parent;
                } else {
                    break;
                }
            }
            return path;
        };

        setBreadcrumb(buildBreadcrumb(currentFolderId));
    }, [currentFolderId, folders]);

    // Get folders and templates for current level
    const getCurrentFolders = () => {
        if (!currentFolderId) {
            return folders.filter(f => !f.parent_id);
        }

        const findFolder = (folders: ChecklistFolder[], id: string): ChecklistFolder | null => {
            for (const folder of folders) {
                if (folder.id === id) return folder;
                if (folder.children) {
                    const found = findFolder(folder.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const folder = findFolder(folders, currentFolderId);
        return folder?.children || [];
    };

    const getCurrentTemplates = () => {
        return templates.filter(t => {
            const matchesFolder = t.folder_id === currentFolderId;
            const matchesSearch = !searchTerm ||
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesFolder && matchesSearch;
        });
    };

    const currentFolders = getCurrentFolders();
    const currentTemplates = getCurrentTemplates();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Selecionar Template de Checklist</h3>
                        <p className="text-sm text-slate-600">Navegue pelas pastas para encontrar o template desejado</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Breadcrumb */}
                {breadcrumb.length > 0 && (
                    <nav className="flex items-center gap-2 text-sm text-slate-600 px-4 py-2 bg-slate-50 border-b border-slate-200">
                        <button
                            onClick={() => setCurrentFolderId(null)}
                            className="hover:underline"
                        >
                            Raiz
                        </button>
                        {breadcrumb.map((folder) => (
                            <div key={folder.id} className="flex items-center gap-2">
                                <ChevronRight className="w-3 h-3" />
                                <button
                                    onClick={() => setCurrentFolderId(folder.id as string)}
                                    className="hover:underline"
                                >
                                    {folder.name}
                                </button>
                            </div>
                        ))}
                    </nav>
                )}

                {/* Search */}
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {currentFolders.length === 0 && currentTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Folder className="w-12 h-12 mb-2" />
                            <p>Nenhum template ou pasta encontrado</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Folders */}
                            {currentFolders.map((folder) => (
                                <div
                                    key={folder.id}
                                    onClick={() => setCurrentFolderId(folder.id as string)}
                                    className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-slate-900 truncate">{folder.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {((folder.subfolder_count || 0) + (folder.template_count || 0))} itens
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                    </div>
                                </div>
                            ))}

                            {/* Templates */}
                            {currentTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => onSelect(template)}
                                    className="bg-white border border-slate-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-green-50 group-hover:text-green-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-slate-900 line-clamp-2">{template.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{template.category}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                            {currentFolders.length} pasta(s) • {currentTemplates.length} template(s)
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
