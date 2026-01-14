import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import { Download, RefreshCw, Bot } from 'lucide-react';

export default function AIUsageLogs() {
    const { session } = useAuth();
    const { selectedOrganization: organization } = useOrganization();

    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterType, setFilterType] = useState('');
    const [usageCount, setUsageCount] = useState(0);

    // Fetch Organization Details to get ai_usage_count
    useEffect(() => {
        const fetchOrgDetails = async () => {
            if (!organization?.id || !session?.access_token) return;
            try {
                const response = await fetch(`/api/organizations/${organization.id}`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'x-organization-id': organization.id.toString()
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.organization) {
                        setUsageCount(data.organization.ai_usage_count || 0);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch org details', error);
            }
        };
        fetchOrgDetails();
    }, [organization?.id, session?.access_token]);

    const fetchLogs = async () => {
        if (!organization?.id || !session?.access_token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(filterType && { feature_type: filterType })
            });

            const token = session.access_token;

            const response = await fetch(`/api/ai-usage/${organization.id}/logs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-organization-id': organization.id.toString(),
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || []);
                setTotalPages(data.pagination?.pages || 1);
            } else {
                console.error("Failed to fetch logs:", response.status);
            }
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [organization?.id, page, filterType, session?.access_token]);

    const handleExport = () => {
        if (!organization?.id || !session?.access_token) return;

        fetch(`/api/ai-usage/${organization.id}/export`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'x-organization-id': organization.id.toString()
            }
        })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ai_usage_report_${organization.id}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(err => console.error("Export failed", err));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* Optional Header inside tab if needed, but tabs handle context usually */}
                <div></div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        title="Atualizar"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-green-600 text-white hover:bg-green-700 h-10 py-2 px-4 shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow bg-white p-6 md:col-span-1">
                    <div className="flex flex-col space-y-1.5 pb-2">
                        <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            Total de Chamadas (Mês)
                        </h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{usageCount}</div>
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow bg-white">
                <div className="flex flex-col space-y-1.5 p-6 pb-4">
                    <h3 className="font-semibold leading-none tracking-tight text-slate-900">Histórico de Uso</h3>
                    <p className="text-sm text-slate-500">Últimas 20 atividades registradas.</p>
                </div>
                <div className="p-6 pt-0">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-xs"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="">Todos os Tipos</option>
                                <option value="pre_analysis">Pré-Análise</option>
                                <option value="action_plan">Plano de Ação</option>
                                <option value="checklist">Checklist</option>
                                <option value="analysis">Análise de Campo</option>
                            </select>
                        </div>

                        <div className="rounded-md border border-slate-200">
                            <table className="w-full caption-bottom text-sm text-left">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted border-slate-200">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Data/Hora</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Usuário</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Funcionalidade</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Modelo</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {loading ? (
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted border-slate-200">
                                            <td colSpan={5} className="p-4 align-middle text-center text-slate-500 py-8">Carregando...</td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted border-slate-200">
                                            <td colSpan={5} className="p-4 align-middle text-center text-slate-500 py-8">Nenhum registro encontrado.</td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="border-b transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-muted border-slate-200">
                                                <td className="p-4 align-middle text-slate-700">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-4 align-middle text-slate-700">{log.user_email}</td>
                                                <td className="p-4 align-middle">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {log.feature_type}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle text-slate-700">{log.model_used}</td>
                                                <td className="p-4 align-middle">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {log.status === 'success' ? 'Sucesso' : 'Erro'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-slate-200 bg-transparent hover:bg-slate-100 hover:text-slate-900 h-9 px-3"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Anterior
                            </button>
                            <div className="flex items-center text-sm text-slate-500">
                                Página {page} de {totalPages}
                            </div>
                            <button
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-slate-200 bg-transparent hover:bg-slate-100 hover:text-slate-900 h-9 px-3"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
