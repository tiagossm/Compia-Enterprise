import { useState, useEffect } from 'react';
import { X, Calendar, User, AlignLeft, Flag, Target } from 'lucide-react';
import { supabase } from '@/react-app/lib/supabase';

interface User {
    id: string;
    name: string;
    avatar_url: string;
    role: string;
}

interface Organization {
    id: number;
    name: string;
    address?: string;
}

interface NewTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
    defaultOrgId?: number | null;
}

export default function NewTaskModal({ isOpen, onClose, onTaskCreated, defaultOrgId }: NewTaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [inspections, setInspections] = useState<{ id: number, title: string, created_at: string }[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'media',
        type: 'manual_task',
        when_deadline: '',
        assignee_id: '',
        organization_id: defaultOrgId,
        inspection_id: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            fetchOrganizations();
            fetchInspections(); // Initial fetch
        }
    }, [isOpen]);

    // Update inspections when organization changes
    useEffect(() => {
        if (formData.organization_id) {
            fetchInspections();
        }
    }, [formData.organization_id]);

    useEffect(() => {
        if (defaultOrgId) {
            setFormData(prev => ({ ...prev, organization_id: defaultOrgId }));
        }
    }, [defaultOrgId]);

    const fetchOrganizations = async () => {
        try {
            const response = await fetch('/api/organizations');
            if (response.ok) {
                const data = await response.json();
                setOrganizations(data.organizations || []);
            }
        } catch (error) {
            console.error("Error fetching organizations:", error);
        }
    }

    const fetchUsers = async () => {
        try {
            let url = '/api/users/simple-list';
            if (formData.organization_id) url += `?organization_id=${formData.organization_id}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchInspections = async () => {
        try {
            let url = '/api/inspections/simple-list';
            const orgId = formData.organization_id || defaultOrgId;
            if (orgId) url += `?organization_id=${orgId}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setInspections(data.inspections || []);
            }
        } catch (error) {
            console.error("Error fetching inspections:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Try to get Google Token from session for Calendar Sync
            const { data: { session } } = await supabase.auth.getSession();
            const googleToken = session?.provider_token;

            const payload = {
                ...formData,
                type: formData.inspection_id ? 'inspection_action' : formData.type,
                google_token: googleToken
            };

            const response = await fetch('/api/action-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                onTaskCreated();
                onClose();
                setFormData({
                    title: '',
                    description: '',
                    priority: 'media',
                    type: 'manual_task',
                    when_deadline: '',
                    assignee_id: '',
                    organization_id: defaultOrgId,
                    inspection_id: ''
                });
            }
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-heading font-semibold text-lg text-slate-800">Nova Tarefa</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Organization Selection - Only if not forced by defaultOrgId */}
                    {!defaultOrgId && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Organização</label>
                            <div className="relative">
                                <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                    value={formData.organization_id || ''}
                                    onChange={e => setFormData({ ...formData, organization_id: e.target.value ? Number(e.target.value) : undefined })}
                                >
                                    <option value="">Selecione uma organização...</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>
                                            {org.name} {org.address ? ` - ${org.address}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input
                            type="text"
                            required
                            placeholder="O que precisa ser feito?"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Tarefa</label>
                        <div className="relative">
                            <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                disabled={!!formData.inspection_id} // If linked to inspection, force inspection_action
                            >
                                <option value="manual_task">Tarefa Manual</option>
                                <option value="inspection_order">Ordem de Inspeção (Global)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <div className="relative">
                            <AlignLeft size={16} className="absolute left-3 top-3 text-slate-400" />
                            <textarea
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                rows={3}
                                placeholder="Detalhes adicionais..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                            <div className="relative">
                                <Flag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="baixa">Baixa</option>
                                    <option value="media">Média</option>
                                    <option value="alta">Alta</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={formData.when_deadline}
                                    onChange={e => setFormData({ ...formData, when_deadline: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                value={formData.assignee_id}
                                onChange={e => setFormData({ ...formData, assignee_id: e.target.value })}
                            >
                                <option value="">Sem responsável</option>
                                <option value="me">Atribuir a mim</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vincular a Inspeção (Opcional)</label>
                        <div className="relative">
                            <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                value={formData.inspection_id}
                                onChange={e => setFormData({ ...formData, inspection_id: e.target.value })}
                            >
                                <option value="">Nenhuma</option>
                                {inspections.map(i => (
                                    <option key={i.id} value={i.id}>
                                        {i.title} ({new Date(i.created_at).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Criando...' : 'Criar Tarefa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
