import { FolderPlus, Folder } from 'lucide-react';
import { ChecklistFolder } from '@/shared/checklist-types';

interface FolderSelectorProps {
    selectedFolderId: string | null;
    onFolderChange: (folderId: string | null) => void;
    onCreateFolder?: () => void;
    label?: string;
    showCreateButton?: boolean;
    folders: ChecklistFolder[];
    className?: string;
}

export default function FolderSelector({
    selectedFolderId,
    onFolderChange,
    onCreateFolder,
    label = 'Pasta de Destino',
    showCreateButton = true,
    folders,
    className = ''
}: FolderSelectorProps) {
    // Flatten folder tree for easier selection
    const flattenFolders = (
        folderList: ChecklistFolder[],
        depth = 0
    ): Array<ChecklistFolder & { depth: number }> => {
        return folderList.reduce((acc, folder) => {
            acc.push({ ...folder, depth });
            if (folder.children && folder.children.length > 0) {
                acc.push(...flattenFolders(folder.children, depth + 1));
            }
            return acc;
        }, [] as Array<ChecklistFolder & { depth: number }>);
    };

    const flatFolders = flattenFolders(folders);
    const selectedFolder = flatFolders.find(f => f.id === selectedFolderId);

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-slate-700">
                {label}
            </label>

            <div className="flex gap-2">
                <select
                    value={selectedFolderId || ''}
                    onChange={(e) => onFolderChange(e.target.value || null)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                    <option value="">📁 Raiz (Sem pasta)</option>
                    {flatFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                            {'  '.repeat(folder.depth)}📁 {folder.name}
                        </option>
                    ))}
                </select>

                {showCreateButton && onCreateFolder && (
                    <button
                        type="button"
                        onClick={onCreateFolder}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium whitespace-nowrap"
                        title="Criar Nova Pasta"
                    >
                        <FolderPlus className="w-4 h-4" />
                        Nova Pasta
                    </button>
                )}
            </div>

            {selectedFolder && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Folder className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-900">
                        Checklist será salvo em: <strong>{selectedFolder.path || selectedFolder.name}</strong>
                    </span>
                </div>
            )}
        </div>
    );
}
