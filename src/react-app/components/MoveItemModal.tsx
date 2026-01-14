import { useState, useEffect } from 'react';
import { Folder, Check } from 'lucide-react';
import { cn } from '@/react-app/utils/cn';

interface MoveItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: (targetFolderId: string | null) => Promise<void>;
    title: string;
    loading?: boolean;
    currentFolderId?: string | null;
}

interface FolderOption {
    id: string;
    name: string;
    parent_id: string | null;
    depth: number;
}

export default function MoveItemModal({
    isOpen,
    onClose,
    onMove,
    title,
    loading = false,
    currentFolderId
}: MoveItemModalProps) {
    const [folders, setFolders] = useState<FolderOption[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchFolders();
            setSelectedFolderId(currentFolderId || null);
        }
    }, [isOpen]);

    const fetchFolders = async () => {
        try {
            setFetching(true);
            const response = await fetch('/api/checklist/tree');
            if (response.ok) {
                const data = await response.json();
                const flatFolders: FolderOption[] = [];

                const flatten = (items: any[], depth = 0) => {
                    items.forEach(item => {
                        flatFolders.push({
                            id: item.id,
                            name: item.name,
                            parent_id: item.parent_id,
                            depth
                        });
                        if (item.children) {
                            flatten(item.children, depth + 1);
                        }
                    });
                };

                flatten(data.tree || []);
                setFolders(flatFolders);
            }
        } catch (error) {
            console.error('Error fetching folders:', error);
        } finally {
            setFetching(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-heading font-semibold text-slate-900">{title}</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {fetching ? (
                        <div className="flex justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <button
                                onClick={() => setSelectedFolderId(null)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                    selectedFolderId === null
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Folder className="w-4 h-4" />
                                <span>Raiz (Sem pasta)</span>
                                {selectedFolderId === null && <Check className="w-4 h-4 ml-auto" />}
                            </button>

                            {folders.map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => setSelectedFolderId(folder.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                        selectedFolderId === folder.id
                                            ? "bg-blue-50 text-blue-700 font-medium"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                    style={{ paddingLeft: `${(folder.depth + 1) * 12 + 12}px` }}
                                >
                                    <Folder className="w-4 h-4" />
                                    <span className="truncate">{folder.name}</span>
                                    {selectedFolderId === folder.id && <Check className="w-4 h-4 ml-auto" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onMove(selectedFolderId)}
                        disabled={loading || fetching}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                        {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>}
                        Mover
                    </button>
                </div>
            </div>
        </div>
    );
}
