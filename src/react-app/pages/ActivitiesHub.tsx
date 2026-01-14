import { useState, useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import NewTaskModal from '@/react-app/components/NewTaskModal';
import GamificationWidget from '@/react-app/components/GamificationWidget';
import KanbanBoard from '@/react-app/components/KanbanBoard';
import {
    Plus,
    LayoutTemplate as LayoutIcon,
    List as ListIcon,
    Search
} from 'lucide-react';

interface ActionItem {
    id: number;
    inspection_id?: number;
    title: string;
    type?: 'inspection_action' | 'manual_task' | 'system_task';
    description?: string;
    inspection_title?: string;
    inspection_location?: string;
    what_description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'baixa' | 'media' | 'alta';
    when_deadline?: string;
    created_at: string;
    source?: string;
    assigned_to_name?: string;
    assigned_to_google_data?: string;
}

interface FilterState {
    status: string;
    priority: string;
    overdue: boolean;
    search: string;
    type: string;
}

export default function ActivitiesHub() {
    // const [searchParams] = useSearchParams();
    const { selectedOrganization } = useOrganization();
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [activities, setActivities] = useState<ActionItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        priority: 'all',
        type: 'all',
        overdue: false,
        search: ''
    });

    useEffect(() => {
        fetchActivities();
    }, [selectedOrganization]);

    useEffect(() => {
        applyFilters();
    }, [activities, filters]);

    const fetchActivities = async () => {
        try {
            let url = '/api/action-plans/all';
            if (selectedOrganization) {
                url += `?organization_id=${selectedOrganization.id}`;
            }
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setActivities(data.action_items || []);
            }
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...activities];
        const now = new Date();

        if (filters.status !== 'all') filtered = filtered.filter(i => i.status === filters.status);
        if (filters.priority !== 'all') filtered = filtered.filter(i => i.priority === filters.priority);
        if (filters.type !== 'all') filtered = filtered.filter(i => i.type === filters.type);
        if (filters.overdue) filtered = filtered.filter(i => i.when_deadline && new Date(i.when_deadline) < now && i.status !== 'completed');
        if (filters.search) {
            const lower = filters.search.toLowerCase();
            filtered = filtered.filter(i => i.title.toLowerCase().includes(lower) || i.description?.toLowerCase().includes(lower));
        }
        setFilteredItems(filtered);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'baixa': return 'bg-green-100 text-green-800';
            case 'media': return 'bg-yellow-100 text-yellow-800';
            case 'alta': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getAvatarUrl = (jsonString?: string) => {
        if (!jsonString) return null;
        try {
            const data = JSON.parse(jsonString);
            return data.picture;
        } catch (e) {
            return null;
        }
    };

    const handleItemMove = async (itemId: number, newStatus: string) => {
        // Optimistic update
        const updatedItems = activities.map(item =>
            item.id === itemId ? { ...item, status: newStatus as any } : item
        );
        setActivities(updatedItems);
        // applyFilters will run automatically due to dependency on 'activities'
        // But we might need to manually trigger update if dependent on filteredItems mainly

        // Call Backend
        try {
            await fetch(`/api/kanban/${selectedOrganization?.id || 1}/items/${itemId}/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) {
            console.error("Failed to move item:", error);
            fetchActivities(); // Revert on error
        }
    };

    const handleColumnChange = () => {
        // Reload Board logic if columns changed (not implemented yet fully for simple items list)
    };

    return (
        <Layout>
            <div className="h-[calc(100vh-140px)] flex flex-col space-y-6">
                {/* Header - Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                    <div>
                        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900">
                            Central de Atividades
                        </h1>
                        <p className="text-slate-600 mt-1 text-sm sm:text-base">
                            Gerencie todas as tarefas e pendências.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ListIcon size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <LayoutIcon size={20} />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm sm:text-base"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Nova Tarefa</span>
                        </button>
                    </div>
                </div>

                {/* Filters Bar - Responsive */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 shrink-0 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar atividades..."
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    {/* Organization Selector Removed - Global in Header */}
                    <select
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white w-full sm:w-auto"
                        value={filters.type}
                        onChange={e => setFilters({ ...filters, type: e.target.value })}
                    >
                        <option value="all">Todos os Tipos</option>
                        <option value="inspection_action">Planos de Ação</option>
                        <option value="manual_task">Tarefas Manuais</option>
                    </select>
                </div>

                {loading && (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* Content Area */}
                {!loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 hover:overflow-hidden">
                        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
                            {viewMode === 'kanban' ? (
                                <div className="flex-1 overflow-hidden h-full">
                                    <KanbanBoard
                                        items={filteredItems.map(i => ({ ...i, id: Number(i.id) }))}
                                        orgId={selectedOrganization?.id || 1}
                                        onItemMove={handleItemMove}
                                        onColumnChange={handleColumnChange}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200">
                                    <table className="w-full text-sm text-left text-slate-600">
                                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Título</th>
                                                <th className="px-6 py-3">Tipo</th>
                                                <th className="px-6 py-3">Prioridade</th>
                                                <th className="px-6 py-3">Responsável</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Prazo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredItems.map(item => {
                                                const avatar = getAvatarUrl(item.assigned_to_google_data);
                                                return (
                                                    <tr key={item.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                                                        <td className="px-6 py-4">
                                                            {item.type === 'inspection_action' ? 'Plano de Ação' : 'Tarefa'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityColor(item.priority)}`}>
                                                                {item.priority}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                {item.assigned_to_name ? (
                                                                    <>
                                                                        {avatar ? (
                                                                            <img src={avatar} className="w-6 h-6 rounded-full" />
                                                                        ) : (
                                                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                                                {item.assigned_to_name.substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <span className="truncate max-w-[100px]">{item.assigned_to_name}</span>
                                                                    </>
                                                                ) : '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">{item.status}</td>
                                                        <td className="px-6 py-4">
                                                            {item.when_deadline ? new Date(item.when_deadline).toLocaleDateString('pt-BR') : '-'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Sidebar - Gamification */}
                        <div className="hidden lg:flex flex-col gap-4">
                            <GamificationWidget />
                        </div>
                    </div>
                )}

                <NewTaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onTaskCreated={fetchActivities}
                    defaultOrgId={selectedOrganization?.id}
                />

            </div>
        </Layout>
    );
}
