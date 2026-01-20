import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AIUsageLogs from '@/react-app/components/AIUsageLogs';
import { useAuth } from '@/react-app/context/AuthContext';
import { fetchWithAuth } from '@/react-app/utils/auth';
import {
    Shield,
    Search,
    Filter,
    Download,
    RefreshCw,
    User,
    Activity,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    BarChart3,
    Clock,
    Building2
} from 'lucide-react';
import Layout from '@/react-app/components/Layout';

interface AuditLog {
    id: number;
    user_id: string;
    organization_id: number;
    action_type: string;
    action_description: string;
    target_type: string;
    target_id: string;
    metadata: any;
    created_at: string;
    user_email: string;
    user_name: string;
    organization_name: string;
}

interface AuditStats {
    period: { days: number; start_date: string };
    total_events: number;
    by_action_type: { action_type: string; count: number }[];
    by_target_type: { target_type: string; count: number }[];
    top_users: { user_id: string; user_name: string; user_email: string; activity_count: number }[];
    daily_activity: { date: string; count: number }[];
    security_alerts: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Dicionários de Tradução
const ACTION_TRANSLATIONS: Record<string, string> = {
    'CREATE': 'CRIAÇÃO',
    'INSERT': 'CRIAÇÃO',
    'UPDATE': 'ATUALIZAÇÃO',
    'DELETE': 'EXCLUSÃO',
    'LOGIN': 'LOGIN',
    'LOGOUT': 'LOGOUT',
    'USER_APPROVED': 'APROVAÇÃO DE USUÁRIO',
    'EXPORT': 'EXPORTAÇÃO',
    'VIEW': 'VISUALIZAÇÃO',
    'REJECT': 'REJEIÇÃO',
    'APPROVE': 'APROVAÇÃO'
};

const TARGET_TRANSLATIONS: Record<string, string> = {
    'USER': 'USUÁRIO',
    'ORGANIZATION': 'ORGANIZAÇÃO',
    'INSPECTION': 'INSPEÇÃO',
    'CHECKLIST': 'CHECKLIST',
    'TEMPLATE': 'MODELO',
    'ACTION_PLAN': 'PLANO DE AÇÃO',
    'MEDIA': 'MÍDIA',
    'DOCUMENT': 'DOCUMENTO'
};

export default function AuditLogs() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const profile = (user as any)?.profile;

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'ai' ? 'ai' : 'system');


    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Filters
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        action_type: '',
        target_type: '',
        user_id: '',
        organization_id: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const [targetTypes, setTargetTypes] = useState<string[]>([]);

    // Check if user has access
    useEffect(() => {
        if (profile && !['system_admin', 'sys_admin', 'org_admin', 'organization_admin'].includes(profile.role)) {
            navigate('/');
        }
    }, [profile, navigate]);

    // Fetch filter options
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const [actionTypesRes, targetTypesRes] = await Promise.all([
                    fetchWithAuth('/api/audit/action-types'),
                    fetchWithAuth('/api/audit/target-types')
                ]);

                if (actionTypesRes.ok) {
                    const data = await actionTypesRes.json();
                    const types = data.action_types || [];
                    // Add common types if empty (fallback)
                    if (types.length === 0) {
                        setActionTypes(['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'APPROVE', 'REJECT']);
                    } else {
                        setActionTypes(types);
                    }
                }
                if (targetTypesRes.ok) {
                    const data = await targetTypesRes.json();
                    const types = data.target_types || [];
                    // Add common types if empty (fallback)
                    if (types.length === 0) {
                        setTargetTypes(['USER', 'ORGANIZATION', 'INSPECTION', 'CHECKLIST', 'TEMPLATE', 'ACTION_PLAN']);
                    } else {
                        setTargetTypes(types);
                    }
                }
            } catch (error) {
                console.error('Error fetching filter options:', error);
            }
        };
        fetchFilterOptions();
    }, []);

    // Fetch logs
    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '50');

            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });

            const response = await fetchWithAuth(`/api/audit/logs?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || []);
                setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch stats
    const fetchStats = async () => {
        try {
            const response = await fetchWithAuth('/api/audit/stats?days=30');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, []);

    // Export to CSV
    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (filters.start_date) params.set('start_date', filters.start_date);
            if (filters.end_date) params.set('end_date', filters.end_date);

            const response = await fetchWithAuth(`/api/audit/export?${params.toString()}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Erro ao exportar logs');
        } finally {
            setExporting(false);
        }
    };

    // Apply filters
    const handleApplyFilters = () => {
        fetchLogs(1);
        setShowFilters(false);
    };

    // Clear filters
    const handleClearFilters = () => {
        setFilters({
            start_date: '',
            end_date: '',
            action_type: '',
            target_type: '',
            user_id: '',
            organization_id: '',
            search: ''
        });
        fetchLogs(1);
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get action badge color
    const getActionColor = (actionType: string) => {
        if (actionType?.includes('CREATE') || actionType?.includes('INSERT')) return 'bg-green-100 text-green-800';
        if (actionType?.includes('UPDATE') || actionType?.includes('EDIT')) return 'bg-blue-100 text-blue-800';
        if (actionType?.includes('DELETE') || actionType?.includes('REMOVE')) return 'bg-red-100 text-red-800';
        if (actionType?.includes('LOGIN') || actionType?.includes('AUTH')) return 'bg-purple-100 text-purple-800';
        if (actionType?.includes('REOPEN')) return 'bg-yellow-100 text-yellow-800';
        if (actionType?.includes('FINALIZE') || actionType?.includes('COMPLETE')) return 'bg-emerald-100 text-emerald-800';
        return 'bg-slate-100 text-slate-800';
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    return (
        <Layout>
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Shield className="w-7 h-7 text-primary" />
                            Logs de Auditoria
                        </h1>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => handleTabChange('system')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'system' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Sistema
                        </button>
                        <button
                            onClick={() => handleTabChange('ai')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Uso de IA
                        </button>
                    </div>

                    {activeTab === 'system' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { fetchLogs(); fetchStats(); }}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Atualizar"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filtros
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                {exporting ? 'Exportando...' : 'Exportar CSV'}
                            </button>
                        </div>
                    )}
                </div>

                {activeTab === 'ai' ? (
                    <AIUsageLogs />
                ) : (
                    <>
                        {/* Stats Cards */}
                        {stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Activity className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-slate-900">{stats?.total_events.toLocaleString()}</p>
                                            <p className="text-sm text-slate-500">Eventos (30 dias)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <User className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-slate-900">{stats?.top_users.length}</p>
                                            <p className="text-sm text-slate-500">Usuários Ativos</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <BarChart3 className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-slate-900">{stats?.by_action_type.length}</p>
                                            <p className="text-sm text-slate-500">Tipos de Ação</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${stats.security_alerts > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                                            <AlertTriangle className={`w-5 h-5 ${stats.security_alerts > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-bold ${stats.security_alerts > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                                {stats?.security_alerts}
                                            </p>
                                            <p className="text-sm text-slate-500">Alertas Segurança</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filters Panel */}
                        {showFilters && (
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900">Filtros Avançados</h3>
                                    <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data Inicial</label>
                                        <input
                                            type="date"
                                            value={filters.start_date}
                                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data Final</label>
                                        <input
                                            type="date"
                                            value={filters.end_date}
                                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Ação</label>
                                        <select
                                            value={filters.action_type}
                                            onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="">Todos</option>
                                            {actionTypes.map((type) => (
                                                <option key={type} value={type}>
                                                    {ACTION_TRANSLATIONS[type] || type}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Recurso</label>
                                        <select
                                            value={filters.target_type}
                                            onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="">Todos</option>
                                            {targetTypes.map((type) => (
                                                <option key={type} value={type}>
                                                    {TARGET_TRANSLATIONS[type] || type}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Busca</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={filters.search}
                                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                                placeholder="Buscar por descrição ou ID..."
                                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={handleClearFilters}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Limpar
                                    </button>
                                    <button
                                        onClick={handleApplyFilters}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        Aplicar Filtros
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Logs Table */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                                Data/Hora
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                                Usuário
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                                Ação
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                                Recurso
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                                Descrição
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                    Carregando logs...
                                                </td>
                                            </tr>
                                        ) : logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                                    <Shield className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                    Nenhum log encontrado
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Clock className="w-4 h-4 text-slate-400" />
                                                            <span className="text-slate-900">{formatDate(log.created_at)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                                {(log.user_name || log.user_email || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">{log.user_name || 'Desconhecido'}</p>
                                                                <p className="text-xs text-slate-500">{log.user_email || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                                                            {ACTION_TRANSLATIONS[log.action_type] || log.action_type || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm">
                                                            <p className="text-slate-900 font-medium">
                                                                {TARGET_TRANSLATIONS[log.target_type] || log.target_type || '-'}
                                                            </p>
                                                            <p className="text-xs text-slate-500">ID: {log.target_id || '-'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm text-slate-600 max-w-xs truncate" title={log.action_description}>
                                                            {log.action_description || '-'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => setSelectedLog(log)}
                                                            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                                                            title="Ver detalhes"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                                    <p className="text-sm text-slate-600">
                                        Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => fetchLogs(pagination.page - 1)}
                                            disabled={pagination.page <= 1}
                                            className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm text-slate-600">
                                            Página {pagination.page} de {pagination.totalPages}
                                        </span>
                                        <button
                                            onClick={() => fetchLogs(pagination.page + 1)}
                                            disabled={pagination.page >= pagination.totalPages}
                                            className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Log Detail Modal */}
                        {selectedLog && (
                            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
                                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                        <h3 className="text-lg font-semibold text-slate-900">Detalhes do Log #{selectedLog.id}</h3>
                                        <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Data/Hora</label>
                                                <p className="text-sm text-slate-900">{formatDate(selectedLog.created_at)}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Usuário</label>
                                                <p className="text-sm text-slate-900">{selectedLog.user_name || selectedLog.user_email || 'Desconhecido'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Tipo de Ação</label>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action_type)}`}>
                                                    {ACTION_TRANSLATIONS[selectedLog.action_type] || selectedLog.action_type}
                                                </span>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Recurso</label>
                                                <p className="text-sm text-slate-900">
                                                    {TARGET_TRANSLATIONS[selectedLog.target_type] || selectedLog.target_type} (ID: {selectedLog.target_id})
                                                </p>
                                            </div>
                                            {selectedLog.organization_name && (
                                                <div className="col-span-2">
                                                    <label className="text-xs font-medium text-slate-500 uppercase">Organização</label>
                                                    <p className="text-sm text-slate-900 flex items-center gap-1">
                                                        <Building2 className="w-4 h-4" />
                                                        {selectedLog.organization_name}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-slate-500 uppercase">Descrição</label>
                                            <p className="text-sm text-slate-900 mt-1">{selectedLog.action_description || 'Sem descrição'}</p>
                                        </div>

                                        {selectedLog.metadata && (
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Metadata (JSON)</label>
                                                <pre className="mt-1 p-3 bg-slate-50 rounded-lg text-xs text-slate-700 overflow-auto max-h-48">
                                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
