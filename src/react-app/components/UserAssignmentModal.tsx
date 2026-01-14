import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Check, Loader2, User } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    organization_id?: number;
    approval_status?: string;
}

interface UserAssignmentModalProps {
    organizationIds: number[];
    organizationName?: string; // opcional se for múltiplos
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function UserAssignmentModal({
    organizationIds,
    organizationName,
    isOpen,
    onClose,
    onSuccess
}: UserAssignmentModalProps) {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState('inspector');

    const isBulk = organizationIds.length > 1;

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSelectedUser(null);
            setSearchTerm('');
            setSelectedRole('inspector');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            setFetchingUsers(true);
            // Busca todos os usuários, incluindo não atribuídos
            const response = await fetch('/api/users?include_unassigned=true');
            const data = await response.json();

            if (response.ok) {
                // Filtra para exibir apenas usuários que podem ser atribuídos
                const assignableUsers = data.users.filter((u: User) =>
                    // Remover lógica restrita anterior para permitir mover/readicionar
                    // Mas manter restrição de não mexer em sys_admin
                    u.role !== 'sys_admin' && u.role !== 'system_admin'
                );
                setUsers(assignableUsers);
            }
        } catch (err) {
            console.error('Erro ao buscar usuários:', err);
            error('Erro', 'Não foi possível carregar a lista de usuários.');
        } finally {
            setFetchingUsers(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) {
            error('Atenção', 'Selecione um usuário para atribuir.');
            return;
        }

        setLoading(true);
        try {
            let response;

            if (isBulk) {
                response = await fetch('/api/user-assignments/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        user_id: selectedUser,
                        organization_ids: organizationIds,
                        role: selectedRole,
                        permissions: {} // Default permissions
                    })
                });
            } else {
                // Single assignment compatibility (or just use bulk for single too, but keeps specific Logic if needed)
                // Actually, let's use the standard POST for single to be safe with verified implementation
                // OR use bulk with array of 1. Let's use bulk for array > 1, and regular for 1.
                response = await fetch('/api/user-assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        user_id: selectedUser,
                        organization_id: organizationIds[0],
                        role: selectedRole,
                        permissions: {},
                        is_primary: false
                    })
                });
            }

            if (response.ok) {
                const data = await response.json();
                if (isBulk && data.results?.failed?.length > 0) {
                    // Partial success or failure
                    const failedCount = data.results.failed.length;
                    const successCount = data.results.success.length;
                    if (successCount > 0) {
                        success('Processado', `${successCount} atribuições com sucesso. ${failedCount} falharam.`);
                    } else {
                        error('Erro', `Falha ao atribuir: ${data.results.failed[0].reason}`);
                    }
                } else {
                    success('Sucesso', isBulk
                        ? 'Usuário atribuído às organizações selecionadas.'
                        : 'Usuário atribuído com sucesso.');
                }

                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                error('Erro', data.error || 'Erro ao atribuir usuário.');
            }
        } catch (err) {
            console.error('Erro ao atribuir usuário:', err);
            error('Erro', 'Erro de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0">
                                    <UserPlus className="h-5 w-5 text-blue-600" />
                                </div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    {isBulk ? 'Atribuir em Massa' : 'Atribuir Usuário'}
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-2">
                            <p className="text-sm text-gray-500 mb-4">
                                {isBulk
                                    ? <>Selecione um usuário para atribuir a <span className="font-semibold text-gray-800">{organizationIds.length} organizações selecionadas</span>.</>
                                    : <>Selecione um usuário para atribuir à organização <span className="font-semibold text-gray-800">{organizationName}</span>.</>
                                }
                            </p>

                            <div className="space-y-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Usuário</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                                            placeholder="Nome ou email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* User List */}
                                <div className="border rounded-md max-h-48 overflow-y-auto">
                                    {fetchingUsers ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        </div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            Nenhum usuário encontrado.
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-gray-200">
                                            {filteredUsers.map(user => (
                                                <li
                                                    key={user.id}
                                                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedUser === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                                        }`}
                                                    onClick={() => setSelectedUser(user.id)}
                                                >
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold mr-3">
                                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs text-gray-500">{user.email}</p>
                                                                {user.organization_id && (
                                                                    <span className="text-xs text-orange-600 bg-orange-50 px-1 rounded">
                                                                        (Principal: Outra Org)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedUser === user.id && (
                                                        <Check className="h-4 w-4 text-blue-600" />
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Role Selector */}
                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                        Perfil de Acesso
                                    </label>
                                    <select
                                        id="role"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    >
                                        <option value="org_admin">Administrador da Organização</option>
                                        <option value="manager">Gerente</option>
                                        <option value="inspector">Inspetor / Técnico</option>
                                        <option value="client_viewer">Visualizador (Cliente)</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Define as permissões do usuário {isBulk ? 'nestas organizações' : 'nesta organização'}.
                                    </p>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || !selectedUser}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                'Atribuir Usuário'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
