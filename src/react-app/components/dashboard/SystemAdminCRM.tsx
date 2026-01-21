
import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    CheckCircle,
    X,
    Loader2,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    LayoutList,
    KanbanSquare,
    MessageSquare,
    Mail,
    Phone
} from 'lucide-react';
import LeadConversionModal from '../LeadConversionModal';
import CRMPipelineBoard from '../CRMPipelineBoard';
import ActivityTimeline from '../ActivityTimeline';

export interface Lead {
    id: number;
    company_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
    source: string | null;
    created_at: string;
    notes?: string;

    // Extended Fields
    cnpj?: string;
    razao_social?: string;
    nome_fantasia?: string;
    website?: string;

    // Address
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;

    converted_organization_id?: number | null;

    // Professional Fields
    deal_value?: number;
    probability?: number;
    status_updated_at?: string;
}

export default function SystemAdminCRM() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Duplicate Prevention
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'address' | 'fiscal' | 'timeline'>('general');

    // View Mode
    const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');

    // CNPJ Search
    const [searchingCnpj, setSearchingCnpj] = useState(false);

    const [formData, setFormData] = useState<Partial<Lead>>({
        status: 'new'
    });

    // Conversion Modal
    const [showConversionModal, setShowConversionModal] = useState(false);
    const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1); // Reset to page 1 on search change
            fetchLeads();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        fetchLeads();
    }, [page]);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20', // Fits nice on most screens
                search: searchTerm,
                status: statusFilter
            });

            const res = await fetch(`/api/crm/leads?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []); // Fallback empty array
                setTotalPages(data.totalPages || 1);
                setTotalLeads(data.total || 0);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (lead?: Lead) => {
        if (lead) {
            setFormData({ ...lead });
            setIsEditing(true);
        } else {
            setFormData({ status: 'new' });
            setIsEditing(false);
        }
        setActiveTab('general');
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return; // Prevent double click

        try {
            setIsSaving(true);
            const url = isEditing && formData.id ? `/api/crm/leads/${formData.id}` : '/api/crm/leads';
            const method = isEditing ? 'PUT' : 'POST';

            // Sanitize numeric fields to prevent NaN
            const payload = {
                ...formData,
                deal_value: isNaN(Number(formData.deal_value)) ? 0 : Number(formData.deal_value),
                probability: isNaN(Number(formData.probability)) ? 0 : Number(formData.probability),
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                fetchLeads();
                alert(isEditing ? 'Lead atualizado!' : 'Lead criado com sucesso!');
            } else {
                alert('Erro ao salvar lead.');
            }
        } catch (error) {
            console.error('Error saving lead:', error);
            alert('Erro de conexão.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o lead "${name}"?\nEsta ação não pode ser desfeita.`)) return;

        try {
            const res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchLeads();
                alert('Lead excluído.');
            } else {
                alert('Erro ao excluir lead.');
            }
        } catch (error) {
            console.error('Error deleting lead:', error);
        }
    };

    const handleConvert = async (lead: Lead) => {
        setLeadToConvert(lead);
        setShowConversionModal(true);
    };

    const handleCnpjSearch = async () => {
        if (!formData.cnpj || formData.cnpj.length < 14) {
            alert("Por favor, digite um CNPJ válido.");
            return;
        }

        const cleanCnpj = formData.cnpj.replace(/\D/g, '');

        try {
            setSearchingCnpj(true);
            const res = await fetch(`/api/cnpj/${cleanCnpj}`);
            const json = await res.json();

            if (json.success && json.data) {
                const data = json.data;
                const updatedData = {
                    ...formData,
                    razao_social: data.razao_social,
                    nome_fantasia: data.nome_fantasia,
                    company_name: data.nome_fantasia || data.razao_social || formData.company_name, // Default reference name

                    // Address
                    cep: data.cep,
                    logradouro: data.logradouro,
                    numero: data.numero,
                    complemento: data.complemento,
                    bairro: data.bairro,
                    cidade: data.municipio,
                    uf: data.uf,

                    // Contact (if available/better)
                    email: !formData.email ? data.contact_email : formData.email,
                    phone: !formData.phone ? data.contact_phone : formData.phone,

                    website: data.website || formData.website
                };

                setFormData(updatedData);
                // Switch to address tab to show user the autofilled data
                setActiveTab('address');

            } else {
                alert(json.error || "CNPJ não encontrado.");
            }

        } catch (error) {
            console.error("CNPJ error:", error);
            alert("Erro ao buscar CNPJ.");
        } finally {
            setSearchingCnpj(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-yellow-100 text-yellow-800',
            qualified: 'bg-purple-100 text-purple-800',
            proposal: 'bg-indigo-100 text-indigo-800',
            negotiation: 'bg-orange-100 text-orange-800',
            won: 'bg-emerald-100 text-emerald-800',
            lost: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleStatusChange = async (leadId: number, newStatus: string) => {
        // Optimistic UI Update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l));

        try {
            const res = await fetch(`/api/crm/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                // Revert if failed
                fetchLeads();
                alert("Falha ao atualizar status.");
            }
        } catch (error) {
            console.error(error);
            fetchLeads(); // Revert
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando CRM...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar leads..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Filtro: Status</option>
                        <option value="new">Novos</option>
                        <option value="contacted">Contatados</option>
                        <option value="qualified">Qualificados</option>
                        <option value="proposal">Proposta</option>
                        <option value="won">Ganhos (Clientes)</option>
                        <option value="lost">Perdidos</option>
                    </select>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Novo Lead
                </button>
            </div>

            {/* View Filter / Toggles */}
            <div className="flex justify-between items-center px-1">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <LayoutList className="w-4 h-4" />
                        Lista
                    </button>
                    <button
                        onClick={() => setViewMode('pipeline')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'pipeline'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <KanbanSquare className="w-4 h-4" />
                        Pipeline
                    </button>
                </div>

                {viewMode === 'pipeline' && (
                    <div className="text-xs text-slate-500 italic">
                        * Arraste os cards para mudar o status
                    </div>
                )}
            </div>

            {/* Content Area */}
            {viewMode === 'list' ? (
                /* List View */
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Empresa</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Contato</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-indigo-900">{lead.company_name}</div>
                                            {lead.nome_fantasia && <div className="text-xs text-slate-500">{lead.nome_fantasia}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                                                {lead.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span>{lead.contact_name || '-'}</span>
                                                <span className="text-xs text-slate-500">{lead.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                            {lead.status !== 'won' && (
                                                <button
                                                    onClick={() => handleConvert(lead)}
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Converter em Cliente"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleOpenModal(lead)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lead.id, lead.company_name)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {leads.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum lead encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                Mostrando página <span className="font-medium text-slate-900">{page}</span> de <span className="font-medium text-slate-900">{totalPages}</span> ({totalLeads} total)
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            ) : (
                <CRMPipelineBoard
                    leads={leads}
                    onStatusChange={handleStatusChange}
                    onEdit={handleOpenModal}
                    onDelete={handleDelete}
                />
            )}

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {isEditing ? 'Editar Lead' : 'Novo Lead'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* CNPJ Search Banner */}
                        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                            <label className="block text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide">Busca Automática por CNPJ</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-300"
                                    placeholder="Digite o CNPJ (apenas números ou com formatação)"
                                    value={formData.cnpj || ''}
                                    onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                />
                                <button
                                    onClick={handleCnpjSearch}
                                    disabled={searchingCnpj}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                                >
                                    {searchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Buscar
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex flex-wrap border-b border-slate-200 px-2 md:px-6 gap-1">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Geral
                            </button>
                            <button
                                onClick={() => setActiveTab('address')}
                                className={`px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${activeTab === 'address' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Endereço
                            </button>
                            <button
                                onClick={() => setActiveTab('fiscal')}
                                className={`px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${activeTab === 'fiscal' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Fiscal
                            </button>
                            <button
                                onClick={() => setActiveTab('timeline')}
                                disabled={!isEditing}
                                className={`px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Timeline
                            </button>
                        </div>

                        {/* Body Content */}
                        {activeTab === 'timeline' && formData.id ? (
                            <ActivityTimeline leadId={formData.id} lead={formData} />

                        ) : (
                            /* Form Body */
                            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                                {activeTab === 'general' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Referência (Interno) *</label>
                                            <input
                                                required
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                value={formData.company_name || ''}
                                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                                placeholder="Ex: Cliente Alpha (Será preenchido pelo CNPJ)"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Contato</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.contact_name || ''}
                                                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="email"
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                        value={formData.email || ''}
                                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    />
                                                    {formData.email && (
                                                        <button
                                                            type="button"
                                                            onClick={() => window.open(`mailto:${formData.email}`, '_blank')}
                                                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors border border-indigo-200"
                                                            title="Enviar Email"
                                                        >
                                                            <Mail className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                                                <div className="flex gap-1">
                                                    <input
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                        value={formData.phone || ''}
                                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    />
                                                    {formData.phone && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const phone = (formData.phone || '').replace(/\D/g, '');
                                                                    const text = encodeURIComponent(`Olá ${formData.contact_name || ''}, tudo bem?`);
                                                                    window.open(`https://wa.me/55${phone}?text=${text}`, '_blank');
                                                                }}
                                                                className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-200"
                                                                title="WhatsApp"
                                                            >
                                                                <MessageSquare className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => window.open(`tel:${formData.phone}`, '_blank')}
                                                                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors border border-emerald-200"
                                                                title="Ligar"
                                                            >
                                                                <Phone className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.status || 'new'}
                                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                                >
                                                    <option value="new">Novo</option>
                                                    <option value="contacted">Contatado</option>
                                                    <option value="qualified">Qualificado</option>
                                                    <option value="proposal">Proposta Enviada</option>
                                                    <option value="negotiation">Negociação</option>
                                                    <option value="won">Ganho (Cliente)</option>
                                                    <option value="lost">Perdido</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Deal (R$)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.deal_value || ''}
                                                    onChange={e => setFormData({ ...formData, deal_value: parseFloat(e.target.value) })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Probabilidade (%)</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="10"
                                                        className="flex-1"
                                                        value={formData.probability || 0}
                                                        onChange={e => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                                                    />
                                                    <span className="text-sm font-bold text-slate-700 w-12 text-right">
                                                        {formData.probability || 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                                            <textarea
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24"
                                                value={formData.notes || ''}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'address' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.cep || ''}
                                                    onChange={e => setFormData({ ...formData, cep: e.target.value })}
                                                    placeholder="00000-000"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="col-span-3">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.logradouro || ''}
                                                    onChange={e => setFormData({ ...formData, logradouro: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.numero || ''}
                                                    onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.complemento || ''}
                                                    onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.bairro || ''}
                                                    onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.cidade || ''}
                                                    onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">UF (Estado)</label>
                                                <input
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    value={formData.uf || ''}
                                                    onChange={e => setFormData({ ...formData, uf: e.target.value })}
                                                    maxLength={2}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'fiscal' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ (Autopreenchido)</label>
                                            <input
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                                value={formData.cnpj || ''}
                                                readOnly={true} // Readonly because input is at the top
                                                placeholder="Busque pelo topo do formulário"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                                            <input
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                value={formData.razao_social || ''}
                                                onChange={e => setFormData({ ...formData, razao_social: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia (Oficial)</label>
                                            <input
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                value={formData.nome_fantasia || ''}
                                                onChange={e => setFormData({ ...formData, nome_fantasia: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                                            <input
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                value={formData.website || ''}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Footer/Actions inside Form */}
                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-70 flex items-center"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            isEditing ? 'Salvar Alterações' : 'Criar Lead'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Conversion Modal */}
            <LeadConversionModal
                isOpen={showConversionModal}
                onClose={() => {
                    setShowConversionModal(false);
                    setLeadToConvert(null);
                }}
                onSuccess={() => {
                    fetchLeads();
                    // Modal closes itself or we close it here handled by onClose
                }}
                lead={leadToConvert}
            />
        </div>
    );
}


