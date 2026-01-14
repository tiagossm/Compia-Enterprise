import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import NewCategoryModal from '@/react-app/components/NewCategoryModal';
// FolderTree removed - using inline folder navigation now
import MoveItemModal from '@/react-app/components/MoveItemModal';
import ConfirmationModal from '@/react-app/components/ConfirmationModal';
import ActionMenu from '@/react-app/components/ActionMenu';
import ShareChecklistModal from '@/react-app/components/ShareChecklistModal';
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Download,
  FolderPlus,
  FolderOpen,
  Folder,
  FileText,
  Copy,
  Trash2,
  Edit,
  Eye,
  Lock,
  Users,
  ChevronRight,
  Share2,
  ArrowRightLeft,
  Plus,
  Upload,
  Brain,
  FileEdit,
  X,
  CheckSquare
} from 'lucide-react';
import ChecklistPreview from '@/react-app/components/ChecklistPreview';
import { ChecklistTemplate, ChecklistField } from '@/shared/checklist-types';
import { ChecklistFolderWithCounts } from '@/shared/folder-types';
import { cn } from '@/react-app/utils/cn';
import { Card } from '@/react-app/components/premium/Card';
import { Button } from '@/react-app/components/premium/Button';

export default function ChecklistTemplates() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentFolderId = searchParams.get('folder_id');

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [folders, setFolders] = useState<ChecklistFolderWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [csvLoading, setCsvLoading] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<ChecklistFolderWithCounts[]>([]);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Partial<ChecklistTemplate> | null>(null);
  const [previewFields, setPreviewFields] = useState<Partial<ChecklistField>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [folderTree, setFolderTree] = useState<any[]>([]);

  // Update breadcrumb when folder changes
  useEffect(() => {
    const fetchBreadcrumb = async () => {
      if (!currentFolderId) {
        setBreadcrumb([]);
        return;
      }
      try {
        const response = await fetch(`/api/checklist/folders/${currentFolderId}/path`);
        if (response.ok) {
          const data = await response.json();
          setBreadcrumb(data.path || []);
        }
      } catch (error) {
        console.error('Error fetching breadcrumb:', error);
      }
    };
    fetchBreadcrumb();
  }, [currentFolderId]);


  // Move Item State
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState<{ type: 'folder' | 'template', id: string | number, name: string } | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  // Delete confirmation (supports both templates and folders)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: number | string | null;
    name: string;
    type: 'template' | 'folder';
  }>({
    isOpen: false,
    id: null,
    name: '',
    type: 'template'
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Rename folder modal state
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    id: string | number | null;
    currentName: string;
    type: 'folder' | 'template';
  }>({ isOpen: false, id: null, currentName: '', type: 'folder' });
  const [renameLoading, setRenameLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Selection mode for batch operations
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());

  // Share Modal State
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    templateId: number;
    templateName: string;
    visibility: 'private' | 'public' | 'shared';
    sharedWith: number[];
  }>({ isOpen: false, templateId: 0, templateName: '', visibility: 'private', sharedWith: [] });

  // New Checklist Modal State
  const [showNewChecklistModal, setShowNewChecklistModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar pastas do nível atual
      const foldersResponse = await fetch(`/api/checklist/folders?parent_id=${currentFolderId || 'null'}`);
      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json();
        setFolders(foldersData.folders || []);
      }

      // Buscar templates do nível atual
      const templatesUrl = currentFolderId
        ? `/api/checklist/checklist-templates?folder_id=${currentFolderId}`
        : '/api/checklist/checklist-templates?folder_id=null';

      const templatesResponse = await fetch(templatesUrl);
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.templates || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    if (folderId) {
      setSearchParams({ folder_id: folderId });
    } else {
      setSearchParams({});
    }
  };

  // Delete template or folder
  const deleteTemplate = (template: ChecklistTemplate) => {
    setDeleteConfirmation({
      isOpen: true,
      id: template.id!,
      name: template.name,
      type: 'template'
    });
  };

  const deleteFolder = (folder: ChecklistFolderWithCounts) => {
    setDeleteConfirmation({
      isOpen: true,
      id: folder.id!,
      name: folder.name,
      type: 'folder'
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.id) return;

    setDeleteLoading(true);
    try {
      // Use different API endpoint based on type
      const url = deleteConfirmation.type === 'folder'
        ? `/api/checklist/folders/${deleteConfirmation.id}`
        : `/api/checklist/checklist-templates/${deleteConfirmation.id}`;

      const response = await fetch(url, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchData();
        setDeleteConfirmation({ isOpen: false, id: null, name: '', type: 'template' });
      } else {
        const error = await response.json();
        alert(`Erro ao excluir: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir item');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Rename folder or template
  const handleRename = async () => {
    if (!renameModal.id || !newItemName.trim()) return;

    setRenameLoading(true);
    try {
      const url = renameModal.type === 'folder'
        ? `/api/checklist/folders/${renameModal.id}`
        : `/api/checklist/checklist-templates/${renameModal.id}`;

      const response = await fetch(url, {
        method: renameModal.type === 'folder' ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName.trim() })
      });

      if (response.ok) {
        await fetchData();
        setRenameModal({ isOpen: false, id: null, currentName: '', type: 'folder' });
        setNewItemName('');
      } else {
        const error = await response.json();
        alert(`Erro ao renomear: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao renomear:', error);
      alert('Erro ao renomear item');
    } finally {
      setRenameLoading(false);
    }
  };

  const openRenameModal = (item: ChecklistFolderWithCounts | ChecklistTemplate, type: 'folder' | 'template') => {
    setRenameModal({ isOpen: true, id: item.id!, currentName: item.name, type });
    setNewItemName(item.name);
  };

  // Selection helpers
  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const toggleTemplateSelection = (templateId: number) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedFolders(new Set(filteredFolders.map(f => f.id!)));
    setSelectedTemplates(new Set(filteredTemplates.map(t => t.id!)));
  };

  const deselectAll = () => {
    setSelectedFolders(new Set());
    setSelectedTemplates(new Set());
  };

  const deleteSelectedItems = async () => {
    const totalSelected = selectedFolders.size + selectedTemplates.size;
    if (totalSelected === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${totalSelected} item(s) selecionado(s)?`)) return;

    setDeleteLoading(true);
    try {
      // Delete selected folders
      for (const folderId of selectedFolders) {
        await fetch(`/api/checklist/folders/${folderId}`, { method: 'DELETE' });
      }
      // Delete selected templates
      for (const templateId of selectedTemplates) {
        await fetch(`/api/checklist/checklist-templates/${templateId}`, { method: 'DELETE' });
      }

      await fetchData();
      setSelectedFolders(new Set());
      setSelectedTemplates(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Erro ao excluir itens:', error);
      alert('Erro ao excluir alguns itens');
    } finally {
      setDeleteLoading(false);
    }
  };

  const duplicateTemplate = async (template: ChecklistTemplate) => {
    try {
      const response = await fetch(`/api/checklist/checklist-templates/${template.id}/duplicate`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
    }
  };

  const handleMoveItem = async (targetFolderId: string | null) => {
    if (!itemToMove) return;

    setMoveLoading(true);
    try {
      let url = '';
      let body = {};

      if (itemToMove.type === 'folder') {
        url = `/api/checklist/folders/${itemToMove.id}`;
        body = { parent_id: targetFolderId };
      } else {
        url = `/api/checklist/folders/${targetFolderId || 'null'}/move-items`;
        body = { templateIds: [itemToMove.id] };
      }

      const method = itemToMove.type === 'folder' ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao mover item');
      }

      await fetchData();
      setShowMoveModal(false);
      setItemToMove(null);
    } catch (error) {
      console.error('Erro ao mover item:', error);
      alert(`Erro ao mover item: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setMoveLoading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'template', id: string | number, name: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, id, name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.id.toString() === targetFolderId.toString()) return; // Can't drop into self

      // Move item directly without relying on state
      await handleMoveItemDirect(data, targetFolderId);
    } catch (error) {
      console.error('Invalid drop data', error);
    }
  };

  const handleMoveItemDirect = async (item: { type: 'folder' | 'template', id: string | number, name: string }, targetFolderId: string | null) => {
    setMoveLoading(true);
    try {
      let url = '';
      let body = {};

      if (item.type === 'folder') {
        url = `/api/checklist/folders/${item.id}`;
        body = { parent_id: targetFolderId };
      } else {
        url = `/api/checklist/folders/${targetFolderId || 'null'}/move-items`;
        body = { templateIds: [item.id] };
      }

      const method = item.type === 'folder' ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao mover item');
      }

      await fetchData();
    } catch (error) {
      console.error('Erro ao mover item:', error);
      alert(`Erro ao mover item: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setMoveLoading(false);
    }
  };

  const openMoveModal = (e: React.MouseEvent, type: 'folder' | 'template', id: string | number, name: string) => {
    e.stopPropagation();
    setItemToMove({ type, id, name });
    setShowMoveModal(true);
  };

  const handleExportTemplates = async () => {
    setCsvLoading(true);
    try {
      const templatesWithFields = await Promise.all(
        templates.filter(t => !t.is_category_folder).map(async (template) => {
          const response = await fetch(`/api/checklist/checklist-templates/${template.id}`);
          const data = await response.json();
          return { ...template, fields: data.fields };
        })
      );

      const csvData: any[] = [];
      templatesWithFields.forEach((template) => {
        if (template.fields && template.fields.length > 0) {
          template.fields.forEach((field: any) => {
            csvData.push({
              template_nome: template.name,
              template_categoria: template.category,
              template_descricao: template.description || '',
              campo_nome: field.field_name,
              campo_tipo: field.field_type,
              obrigatorio: field.is_required ? 'Sim' : 'Não',
              opcoes: field.options || '',
              ordem: field.order_index
            });
          });
        }
      });

      const headers = 'template_nome,template_categoria,template_descricao,campo_nome,campo_tipo,obrigatorio,opcoes,ordem';
      const csvContent = [
        headers,
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `templates_checklist_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar templates:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleCreateCategory = async (categoryData: any) => {
    setCategoryLoading(true);
    try {
      const folderData = {
        name: categoryData.name,
        description: categoryData.description,
        parent_id: currentFolderId,
        color: categoryData.folder_color || '#3B82F6',
        icon: categoryData.folder_icon || 'folder'
      };

      const response = await fetch('/api/checklist/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });

      if (response.ok) {
        await fetchData();
        setShowNewCategoryModal(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      alert(`Erro ao criar pasta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setCategoryLoading(false);
    }
  };



  /* TODO: Re-enable when UI is complete
  const handleAutoOrganize = async () => {
    if (!confirm('Esta ação irá organizar automaticamente todos os checklists em pastas baseado em suas categorias/NRs. Continuar?')) {
      return;
    }
   
    setAutoOrganizeLoading(true);
    try {
      const response = await fetch('/api/checklist/auto-organize-all', {
        method: 'POST'
      });
   
      if (response.ok) {
        const result = await response.json();
        alert(`Organização automática concluída!\n\n${result.templates_organized} templates organizados\n${result.folders_created} pastas criadas\n${result.templates_skipped} templates ignorados\n\nPastas criadas: ${result.folder_names.join(', ')}`);
        await fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to auto-organize');
      }
    } catch (error) {
      console.error('Erro na organização automática:', error);
      alert(`Erro na organização automática: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setAutoOrganizeLoading(false);
    }
  };
  */

  const enterFolder = (folder: ChecklistFolderWithCounts) => {
    setSearchParams({ folder_id: folder.id! });
  };

  // Filter items based on search
  const handlePreviewTemplate = async (template: ChecklistTemplate) => {
    setPreviewLoading(true);
    setShowPreviewModal(true);
    try {
      // Fetch template details
      const response = await fetch(`/api/checklist/checklist-templates/${template.id}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewTemplate(data.template);
        setPreviewFields(data.fields || []);
      }

      // Fetch folder tree for selection
      const treeResponse = await fetch('/api/checklist/tree');
      if (treeResponse.ok) {
        const treeData = await treeResponse.json();
        setFolderTree(treeData.tree || []);
      }
    } catch (error) {
      console.error('Error loading template details:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSavePreview = async (template: Partial<ChecklistTemplate>, _fields: Partial<ChecklistField>[], folderId?: string | null) => {
    if (!template.id) return;

    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/checklist/checklist-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          folder_id: folderId // Ensure folder_id is passed if changed
        })
      });

      if (response.ok) {
        await fetchData();
        setShowPreviewModal(false);
      } else {
        const error = await response.json();
        alert(`Erro ao salvar: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Erro ao salvar template');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getFilteredFolders = () => {
    return folders.filter(folder =>
      folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      folder.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredTemplates = () => {
    return templates.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredFolders = getFilteredFolders();
  const filteredTemplates = getFilteredTemplates();

  return (
    <Layout>
      {/* Full-Width Page Container */}
      <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50">

        {/* Page Header - Always visible */}
        <div className="bg-white border-b border-slate-200 py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          {/* Top Row: Title + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              {/* Breadcrumb - visível sempre */}
              {/* Breadcrumb - Always visible */}
              <nav className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <Link to="/checklists" className="hover:text-blue-600 transition-colors font-medium">
                  Raiz
                </Link>
                {breadcrumb.map((f) => (
                  <React.Fragment key={f.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    <button
                      onClick={() => handleFolderSelect(f.id!)}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {f.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Primary Actions - Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewCategoryModal(true)}
                icon={<FolderPlus className="w-4 h-4" />}
              >
                Nova Pasta
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowNewChecklistModal(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Novo Checklist
              </Button>
            </div>
          </div>

          {/* Second Row: Search + View Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar checklists e pastas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-900"
                  )}
                  title="Grade"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-900"
                  )}
                  title="Lista"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) deselectAll();
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors text-sm font-medium",
                  isSelectionMode
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-500 hover:bg-slate-100"
                )}
                title={isSelectionMode ? "Concluir" : "Selecionar"}
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportTemplates}
                disabled={csvLoading}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                title="Exportar CSV"
              >
                {csvLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">



          {/* Batch Actions Bar */}
          {(selectedFolders.size > 0 || selectedTemplates.size > 0) && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between transition-all animate-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                    {selectedFolders.size + selectedTemplates.size}
                  </div>
                  item(s) selecionado(s)
                </span>
                <button onClick={deselectAll} className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">
                  Limpar seleção
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteSelectedItems}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium shadow-sm transition-colors"
                >
                  {deleteLoading ? <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Excluir Selecionados</span>
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredFolders.length === 0 && filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-lg font-medium text-slate-900">Esta pasta está vazia</p>
                <p className="text-sm mt-1">Crie uma nova pasta ou template para começar</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                {/* Folders */}
                {filteredFolders.map((folder) => (
                  <Card
                    key={folder.id}
                    variant="default"
                    hoverEffect={true}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'folder', folder.id!, folder.name)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id!)}
                    className="p-5 cursor-pointer group relative min-w-0 border-l-4 border-l-blue-500/50 hover:border-l-blue-600 transition-all"
                    onClick={() => enterFolder(folder)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {isSelectionMode && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedFolders.has(folder.id!)}
                              onChange={() => toggleFolderSelection(folder.id!)}
                              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        )}
                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <Folder className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <ActionMenu
                          items={[
                            {
                              label: 'Abrir',
                              icon: <FolderOpen className="w-4 h-4" />,
                              onClick: () => enterFolder(folder)
                            },
                            {
                              label: 'Renomear',
                              icon: <FileEdit className="w-4 h-4" />,
                              onClick: (e) => { e.stopPropagation(); openRenameModal(folder, 'folder'); }
                            },
                            {
                              label: 'Mover',
                              icon: <ArrowRightLeft className="w-4 h-4" />,
                              onClick: (e) => openMoveModal(e, 'folder', folder.id!, folder.name)
                            },
                            {
                              label: 'Excluir',
                              icon: <Trash2 className="w-4 h-4 text-red-500" />,
                              className: "text-red-600 hover:bg-red-50",
                              onClick: (e) => { e.stopPropagation(); deleteFolder(folder); }
                            }
                          ]}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 truncate mb-1 text-lg tracking-tight" title={folder.name}>{folder.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full">
                          {(folder.subfolder_count || 0) + (folder.template_count || 0)} itens
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Templates */}
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    variant="default"
                    hoverEffect={true}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'template', template.id!, template.name)}
                    className="p-5 flex flex-col relative min-w-0"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {isSelectionMode && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedTemplates.has(template.id!)}
                              onChange={() => toggleTemplateSelection(template.id!)}
                              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        )}
                        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                          <FileText className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {template.is_public ? (
                          <div title="Público" className="bg-green-50 p-1 rounded-md">
                            <Users className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        ) : (
                          <div title="Privado" className="bg-slate-50 p-1 rounded-md">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        )}
                        <ActionMenu
                          items={[
                            {
                              label: 'Visualizar',
                              icon: <Eye className="w-4 h-4" />,
                              onClick: () => handlePreviewTemplate(template)
                            },
                            {
                              label: 'Editar',
                              icon: <Edit className="w-4 h-4" />,
                              onClick: () => navigate(`/checklists/${template.id}/edit`)
                            },
                            {
                              label: 'Renomear',
                              icon: <FileEdit className="w-4 h-4" />,
                              onClick: (e) => { e.stopPropagation(); openRenameModal(template, 'template'); }
                            },
                            {
                              label: 'Duplicar',
                              icon: <Copy className="w-4 h-4" />,
                              onClick: () => duplicateTemplate(template)
                            },
                            {
                              label: 'Mover',
                              icon: <ArrowRightLeft className="w-4 h-4" />,
                              onClick: (e) => openMoveModal(e, 'template', template.id!, template.name)
                            },
                            {

                              label: 'Compartilhar',
                              icon: <Share2 className="w-4 h-4" />,
                              onClick: () => setShareModal({
                                isOpen: true,
                                templateId: template.id!,
                                templateName: template.name,
                                visibility: (template as any).visibility || 'private',
                                sharedWith: (template as any).shared_with ? JSON.parse((template as any).shared_with) : []
                              })
                            },
                            {
                              label: 'Excluir',
                              icon: <Trash2 className="w-4 h-4 text-red-500" />,
                              className: "text-red-600 hover:bg-red-50",
                              onClick: () => deleteTemplate(template)
                            }
                          ]}
                        />
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate mb-2 text-base" title={template.name}>
                      {template.name}
                    </h3>

                    <div className="mt-auto pt-4 border-t border-slate-100/60 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium"
                        onClick={() => handlePreviewTemplate(template)}
                      >
                        Visualizar
                      </Button>
                    </div>
                  </Card>
                ))}

              </div >
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      {isSelectionMode && (
                        <th className="px-4 py-3 w-8">
                          <input
                            type="checkbox"
                            onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 w-8"></th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Criado em</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Folders */}
                    {filteredFolders.map((folder) => (
                      <tr
                        key={folder.id}
                        className="hover:bg-slate-50 cursor-pointer group"
                        onClick={() => enterFolder(folder)}
                      >
                        {isSelectionMode && (
                          <td className="px-4 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedFolders.has(folder.id!)}
                              onChange={() => toggleFolderSelection(folder.id!)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-400">
                          <Folder className="w-5 h-5 text-blue-500 fill-blue-100" />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {folder.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500">Pasta</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(folder.created_at!).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => openMoveModal(e, 'folder', folder.id!, folder.name)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                              title="Mover"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Templates */}
                    {filteredTemplates.map((template) => (
                      <tr key={template.id} className="hover:bg-slate-50 group">
                        {isSelectionMode && (
                          <td className="px-4 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedTemplates.has(template.id!)}
                              onChange={() => toggleTemplateSelection(template.id!)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-400">
                          <FileText className="w-5 h-5" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-slate-500 truncate max-w-xs">{template.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">Template</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(template.created_at!).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handlePreviewTemplate(template)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <Link
                              to={`/checklists/${template.id}/edit`}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={(e) => openMoveModal(e, 'template', template.id!, template.name)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                              title="Mover"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateTemplate(template);
                              }}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                              title="Duplicar"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplate(template);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div >
        </div >
      </div >

      {/* New Category Modal */}
      < NewCategoryModal
        isOpen={showNewCategoryModal}
        onClose={() => setShowNewCategoryModal(false)}
        onSave={handleCreateCategory}
        parentFolder={folders.find(f => f.id === currentFolderId)}
        loading={categoryLoading}
      />

      {/* Move Item Modal */}
      < MoveItemModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMoveItem}
        title={`Mover ${itemToMove?.type === 'folder' ? 'Pasta' : 'Template'}: ${itemToMove?.name}`}
        loading={moveLoading}
        currentFolderId={currentFolderId}
      />

      {/* Preview Modal */}
      {
        showPreviewModal && previewTemplate && (
          <ChecklistPreview
            template={previewTemplate}
            fields={previewFields}
            onSave={handleSavePreview}
            onCancel={() => setShowPreviewModal(false)}
            loading={previewLoading}
            title="Visualizar Template"
            folders={folderTree}
            selectedFolderId={currentFolderId}
          />
        )
      }

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="Excluir Checklist"
        message={`Tem certeza que deseja excluir o checklist "${deleteConfirmation.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        loading={deleteLoading}
      />


      {/* Share Modal */}
      <ShareChecklistModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ ...shareModal, isOpen: false })}
        checklistTitle={shareModal.templateName}
        templateId={shareModal.templateId}
        templateName={shareModal.templateName}
        currentVisibility={shareModal.visibility}
        currentSharedWith={shareModal.sharedWith}
        onSave={() => fetchData()}
      />

      {/* New Checklist Modal */}
      {
        showNewChecklistModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowNewChecklistModal(false)}
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
                  onClick={() => setShowNewChecklistModal(false)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Options */}
              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChecklistModal(false);
                    const url = currentFolderId ? `/checklists/import?folder_id=${currentFolderId}` : '/checklists/import';
                    navigate(url);
                  }}
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
                  onClick={() => {
                    setShowNewChecklistModal(false);
                    const url = currentFolderId ? `/checklists/ai-generate?folder_id=${currentFolderId}` : '/checklists/ai-generate';
                    navigate(url);
                  }}
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
                  onClick={() => {
                    setShowNewChecklistModal(false);
                    const url = currentFolderId ? `/checklists/new?folder_id=${currentFolderId}` : '/checklists/new';
                    navigate(url);
                  }}
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
                  onClick={() => setShowNewChecklistModal(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Rename Folder Modal */}
      {/* Rename Modal */}
      {
        renameModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">
                  Renomear {renameModal.type === 'folder' ? 'Pasta' : 'Checklist'}
                </h2>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Novo nome..."
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRenameModal({ isOpen: false, id: null, currentName: '', type: 'folder' });
                    setNewItemName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={renameLoading || !newItemName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {renameLoading ? 'Renomeando...' : 'Renomear'}
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-6 right-6 sm:hidden z-40">
        <button
          onClick={() => setShowNewChecklistModal(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          title="Novo Checklist"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

    </Layout >
  );
}
