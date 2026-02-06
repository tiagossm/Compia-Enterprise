import { useState, useEffect } from 'react';
import { X, Mail, Shield, AlertCircle, CheckCircle2, Loader2, Users } from 'lucide-react';
import { useAuth } from '@/react-app/context/AuthContext';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface InviteUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Organization {
    id: number;
    name: string;
}

export default function InviteUsersModal({ isOpen, onClose, onSuccess }: InviteUsersModalProps) {
    const { user } = useAuth();
    const [emails, setEmails] = useState('');
    const [role, setRole] = useState('inspector');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

    // Se for SysAdmin, permitir escolher organização
    const isSysAdmin = user?.role === 'system_admin' || user?.role === 'sys_admin';

    useEffect(() => {
        if (isOpen) {
            // Reset states
            setEmails('');
            setRole('inspector');
            setError('');
            setSuccess('');
            setLoading(false);

            // Safe access
            const u = user as any;
            const userOrgId = u?.organization_id || u?.profile?.organization_id;

            if (isSysAdmin) {
                fetchOrganizations();
            } else if (userOrgId) {
                setSelectedOrgId(userOrgId);
            }
        }
    }, [isOpen, user, isSysAdmin]);

    const fetchOrganizations = async () => {
        try {
            const res = await fetchWithAuth('/api/organizations');
            if (res.ok) {
                const data = await res.json();
                setOrganizations(data.organizations || []);
                if (data.organizations?.length > 0) {
                    setSelectedOrgId(data.organizations[0].id);
                }
            }
        } catch (e) {
            console.error('Error fetching orgs', e);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emails.trim()) {
            setError('Digite pelo menos um e-mail');
            return;
        }

        // Safe access
        const u = user as any;
        const userOrgId = u?.organization_id || u?.profile?.organization_id;
        const managedOrgId = u?.managed_organization_id || u?.profile?.managed_organization_id;

        if (!selectedOrgId && !userOrgId && !managedOrgId) {
            setError('Organização não identificada');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        // Separar emails por virgula, ponto e virgula ou nova linha
        const emailList = emails
            .split(/[\n,;]+/)
            .map(e => e.trim())
            .filter(e => e && e.includes('@'));

        if (emailList.length === 0) {
            setLoading(false);
            setError('Nenhum e-mail válido encontrado');
            return;
        }

        try {
            const orgId = selectedOrgId || managedOrgId || userOrgId;

            const response = await fetchWithAuth('/api/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emails: emailList,
                    role,
                    organization_id: orgId
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`Convites enviados: ${data.created}. Falhas: ${data.failed}`);
                if (data.failed > 0 && data.errors) {
                    // Mostrar detalhes de falha se houver
                    const firstError = data.errors[0];
                    setError(`Alguns convites falharam. Ex: ${firstError.email} - ${firstError.error}`);
                } else {
                    // Limpar form se tudo ok
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 2000);
                }
            } else {
                // Handle specific errors like limit reached
                if (data.error === 'plan_limit_reached') {
                    setError(data.message);
                } else {
                    throw new Error(data.error || 'Erro ao enviar convites');
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao enviar convites');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Convidar Membros
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* ALERTAS */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3 text-sm text-red-700">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <div>{error}</div>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-3 text-sm text-green-700">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <div>{success}</div>
                        </div>
                    )}

                    {/* Org Selector (SysAdmin Only) */}
                    {isSysAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Organização</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedOrgId || ''}
                                onChange={e => setSelectedOrgId(Number(e.target.value))}
                            >
                                <option value="">Selecione uma organização</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Role Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de Acesso</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                            >
                                <option value="inspector">Técnico (Padrão)</option>
                                <option value="manager">Gerente</option>
                                <option value="org_admin">Administrador da Organização</option>
                                <option value="client">Cliente (Visualização)</option>
                            </select>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Defina o nível de permissão para os usuários convidados.
                        </p>
                    </div>

                    {/* Emails */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mails</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <textarea
                                value={emails}
                                onChange={(e) => setEmails(e.target.value)}
                                placeholder={'nome@empresa.com\noutro@empresa.com'}
                                className="w-full pl-10 pr-4 py-3 min-h-[120px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Insira um e-mail por linha ou separados por vírgula.
                        </p>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || success.length > 0}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-4 h-4" />
                                    Enviar Convites
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
