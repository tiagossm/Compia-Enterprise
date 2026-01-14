import { useState, useEffect } from "react";
import { Check, X, Loader2, User, Shield } from "lucide-react";
import { useToast } from "@/react-app/hooks/useToast";
import { useAuth } from "@/react-app/context/AuthContext";

interface PendingUser {
    id: string;
    email: string;
    name: string;
    role: string;
    organization_id: number;
    created_at: string;
}

export default function AdminUserApproval() {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { user } = useAuth();
    const extendedUser = user as any; // Cast rapidão para acessar profile.role
    const isSystemAdmin = extendedUser?.profile?.role === 'system_admin' ||
        extendedUser?.profile?.role === 'sys_admin' ||
        extendedUser?.profile?.role === 'admin';

    useEffect(() => {
        if (isSystemAdmin) {
            fetchPendingUsers();
        } else {
            setLoading(false);
        }
    }, [isSystemAdmin]);

    const fetchPendingUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/admin/pending-users");

            if (response.status === 401 || response.status === 403) {
                // Silently handle if auth check failed despite frontend check
                return;
            }

            const data = await response.json();

            if (response.ok) {
                setUsers(data.data || []);
            } else {
                error("Erro", "Não foi possível carregar os usuários pendentes.");
            }
        } catch (err) {
            console.error("Erro ao buscar usuários:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId: string, action: 'approve' | 'reject') => {
        if (!confirm(`Tem certeza que deseja ${action === 'approve' ? 'APROVAR' : 'REJEITAR'} este usuário?`)) return;

        setProcessingId(userId);
        try {
            const url = `/api/admin/users/${userId}/${action}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: action === 'reject' ? JSON.stringify({ reason: 'Rejeitado pelo administrador' }) : undefined
            });

            if (response.ok) {
                success("Sucesso", `Usuário ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso.`);
                // Remover da lista local
                setUsers(prev => prev.filter(u => u.id !== userId));
            } else {
                const data = await response.json();
                error("Erro", data.error || "Erro ao processar ação.");
            }
        } catch (err) {
            console.error("Erro na ação:", err);
            error("Erro", "Erro de comunicação com o servidor.");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isSystemAdmin && !loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900">Acesso Restrito</h2>
                <p className="text-slate-600 mt-2 max-w-md">
                    Você não tem permissão para acessar esta área. Esta página é reservada para administradores do sistema.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    Aprovação de Usuários
                </h1>
                <p className="text-slate-600 mt-2">
                    Gerencie as solicitações de cadastro pendentes.
                </p>
            </div>

            {users.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Nenhum usuário pendente</h3>
                    <p className="text-slate-500 mt-2">Todas as solicitações de cadastro foram processadas.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data Cadastro</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {users.map((pendingUser) => (
                                <tr key={pendingUser.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span className="text-blue-600 font-medium text-sm">
                                                    {pendingUser.name?.charAt(0).toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{pendingUser.name}</div>
                                                <div className="text-xs text-slate-500">ID: {pendingUser.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-600">{pendingUser.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-600">
                                            {new Date(pendingUser.created_at).toLocaleDateString()}
                                            <span className="text-xs text-slate-400 ml-1">
                                                {new Date(pendingUser.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleAction(pendingUser.id, 'reject')}
                                                disabled={!!processingId}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Rejeitar"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleAction(pendingUser.id, 'approve')}
                                                disabled={!!processingId}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Aprovar"
                                            >
                                                {processingId === pendingUser.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Check className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
