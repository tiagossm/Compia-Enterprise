import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/react-app/utils/cn';

interface TreeFolder {
    id: string;
    name: string;
    slug: string;
    path: string;
    color?: string;
    icon?: string;
    children?: TreeFolder[];
    template_count?: number;
    subfolder_count?: number;
}

interface FolderTreeProps {
    currentFolderId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    className?: string;
}

export default function FolderTree({ currentFolderId, onSelectFolder, className }: FolderTreeProps) {
    const [tree, setTree] = useState<TreeFolder[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTree();
    }, []);

    const fetchTree = async () => {
        try {
            const response = await fetch('/api/checklist/tree');
            if (response.ok) {
                const data = await response.json();
                setTree(data.tree || []);
            }
        } catch (error) {
            console.error('Error fetching folder tree:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const renderFolder = (folder: TreeFolder, depth: number = 0) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = currentFolderId === folder.id;
        const hasChildren = folder.children && folder.children.length > 0;

        return (
            <div key={folder.id}>
                <div
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors select-none",
                        isSelected
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        depth > 0 && "ml-4"
                    )}
                    onClick={() => onSelectFolder(folder.id)}
                >
                    <button
                        onClick={(e) => toggleExpand(folder.id, e)}
                        className={cn(
                            "p-0.5 rounded hover:bg-slate-200 transition-colors",
                            !hasChildren && "invisible"
                        )}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                        ) : (
                            <ChevronRight className="w-3 h-3" />
                        )}
                    </button>

                    <div style={{ color: folder.color }}>
                        {isExpanded || isSelected ? (
                            <FolderOpen className="w-4 h-4" />
                        ) : (
                            <Folder className="w-4 h-4" />
                        )}
                    </div>

                    <span className="truncate flex-1">{folder.name}</span>
                    <span className="text-xs text-slate-400">
                        {(folder.subfolder_count || 0) + (folder.template_count || 0)}
                    </span>
                </div>

                {isExpanded && hasChildren && (
                    <div className="border-l border-slate-100 ml-[21px]">
                        {folder.children!.map(child => renderFolder(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-4 space-y-2">
                <div className="h-8 bg-slate-100 rounded animate-pulse" />
                <div className="h-8 bg-slate-100 rounded animate-pulse ml-4" />
                <div className="h-8 bg-slate-100 rounded animate-pulse ml-4" />
            </div>
        );
    }

    return (
        <div className={cn("py-2", className)}>
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors mb-1",
                    currentFolderId === null
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                onClick={() => onSelectFolder(null)}
            >
                <div className="w-4 flex justify-center">
                    <Folder className="w-4 h-4" />
                </div>
                <span>Todos os Checklists</span>
            </div>

            {tree.map(folder => renderFolder(folder))}
        </div>
    );
}
