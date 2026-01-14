
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Clock,
    MapPin,
    AlignLeft,
    Save,
    Trash2,
    CheckCircle,
    XCircle,
    ListChecks,
    Users,
    ClipboardList,
    ExternalLink,
    Play,
    Video,
    Mail,
    Paperclip,
    Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { useAuth } from '@/react-app/context/AuthContext';
import AutoSuggestField from './AutoSuggestField';
import AddressForm, { AddressData } from './AddressForm';
import { parseAddressString } from '@/react-app/utils/addressParser';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: EventData, eventId?: number | string) => Promise<void>;
    onDelete?: (eventId: number | string) => Promise<void>;
    event?: CalendarEvent | null;
    selectedDate?: Date | null;
}

export interface CalendarEvent {
    id: number | string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    event_type: 'inspection' | 'meeting' | 'focus_time' | 'blocking' | 'other';
    status: 'scheduled' | 'in_progress' | 'completed' | 'delivered' | 'cancelled' | 'rescheduled';
    // Rich Fields
    participants?: string[]; // IDs or Emails
    scope_items?: string[];
    attachments?: string[]; // URLs
    location?: string;
    meeting_link?: string;
    google_event_id?: string;
    notification_body?: string;
    // Inspection Integration
    company_name?: string;
    client_id?: string;
    template_id?: number;
    // RSVP
    accepted_by?: any[];
    declined_by?: any[];
    // UI Metadata
    source?: string;
    readonly?: boolean;
    original_id?: number;
    // Address Fields
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
}

export interface EventData {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    event_type: string;
    status?: string;
    // Rich Fields
    participants?: string[];
    scope_items?: string[];
    attachments?: string[];
    location?: string;
    meeting_link?: string;
    notification_body?: string;
    // Inspection Integration
    company_name?: string;
    client_id?: string;
    template_id?: number;
    // Integration Flags
    create_meet?: boolean;
    notify_email?: boolean;
    // Address Fields
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
}

const EVENT_TYPES = [
    { value: 'inspection', label: 'Inspeção', color: 'bg-blue-100 text-blue-700' },
    { value: 'meeting', label: 'Reunião', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'focus_time', label: 'Foco/Trabalho', color: 'bg-purple-100 text-purple-700' },
    { value: 'blocking', label: 'Bloqueio', color: 'bg-gray-100 text-gray-700' },
    { value: 'other', label: 'Outro', color: 'bg-slate-100 text-slate-700' },
];

export default function EventModal({ isOpen, onClose, onSave, onDelete, event, selectedDate }: EventModalProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'scope' | 'participants' | 'integrations' | 'attachments'>('general');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
    const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [formData, setFormData] = useState<EventData>({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        event_type: 'meeting',
        participants: [],
        scope_items: [],
        attachments: [],
        create_meet: false,
        notify_email: false,
        notification_body: '',
        company_name: '',
        client_id: '',
        template_id: undefined
    });

    // Address State for Inspections
    const [addressData, setAddressData] = useState<AddressData>({
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        full_address: ''
    });


    const [myResponse, setMyResponse] = useState<'pending' | 'accepted' | 'declined'>('pending');
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (event && user?.email) {
            const accepted = event.accepted_by?.some((u: any) => (typeof u === 'string' ? u : u.email) === user.email);
            const declined = event.declined_by?.some((u: any) => (typeof u === 'string' ? u : u.email) === user.email);
            if (accepted) setMyResponse('accepted');
            else if (declined) setMyResponse('declined');
            else setMyResponse('pending');
        }
    }, [event, user?.email]);

    const handleResponse = async (status: 'accepted' | 'declined') => {
        if (!event?.id) return;
        try {
            setLoading(true);
            await fetchWithAuth(`/api/calendar/${event.id}/respond`, {
                method: 'POST',
                body: JSON.stringify({ status, type: formData.event_type })
            });
            setMyResponse(status);
            // Optional: Show success toast
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao responder');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setLoading(true);
        try {
            // Upload sequentially
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const base64Data = reader.result as string;
                            const response = await fetchWithAuth('/api/calendar-upload/upload', {
                                method: 'POST',
                                body: JSON.stringify({
                                    file_name: file.name,
                                    file_data: base64Data,
                                    file_size: file.size,
                                    mime_type: file.type
                                })
                            });

                            if (response.ok) {
                                const data = await response.json();
                                setFormData(prev => ({
                                    ...prev,
                                    attachments: [...(prev.attachments || []), data.file_url]
                                }));
                            } else {
                                console.error('Upload failed for', file.name);
                                alert(`Erro ao enviar ${file.name}`);
                            }
                        } catch (e) {
                            console.error(e);
                        } finally {
                            resolve();
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Erro ao fazer upload');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Helper for Scope Items
    const [newScopeItem, setNewScopeItem] = useState('');
    const [newParticipant, setNewParticipant] = useState('');

    // Fetch Templates on Mount
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const response = await fetchWithAuth('/api/checklist/checklist-templates');
                if (response.ok) {
                    const data = await response.json();
                    setTemplates(data.templates || []);
                }
            } catch (error) {
                console.error('Error fetching templates:', error);
            }
        };
        if (isOpen) loadTemplates();
    }, [isOpen]);

    // Fetch available users when Participants tab is opened
    useEffect(() => {
        const loadUsers = async () => {
            if (availableUsers.length > 0) return; // Already loaded
            setLoadingUsers(true);
            try {
                const response = await fetchWithAuth('/api/users/simple-list');
                if (response.ok) {
                    const data = await response.json();
                    setAvailableUsers(data.users || []);
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoadingUsers(false);
            }
        };
        if (isOpen && activeTab === 'participants') loadUsers();
    }, [isOpen, activeTab]);


    useEffect(() => {
        if (event) {
            setFormData({
                title: event.title,
                description: event.description || '',
                // Convert UTC ISO string to local datetime-local format
                start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
                end_time: format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"),
                event_type: event.event_type,
                status: event.status,
                participants: event.participants || [],
                scope_items: event.scope_items || [],
                attachments: event.attachments || [],
                meeting_link: event.meeting_link,
                location: event.event_type !== 'inspection' ? (event.location || '') : '', // Use location for simple events
                notification_body: event.notification_body || '',
                company_name: event.company_name || '',
                client_id: event.client_id || '',
                template_id: event.template_id,
                create_meet: !!event.meeting_link,
                notify_email: false,
                cep: event.cep || '',
                logradouro: event.logradouro || '',
                numero: event.numero || '',
                complemento: event.complemento || '',
                bairro: event.bairro || '',
                cidade: event.cidade || '',
                uf: event.uf || '',
            });

            // Map inspector if it's an inspection (legacy support or if participants empty)
            if (event.event_type === 'inspection') {
                console.log('[EventModal] Loading inspection address data:', {
                    cep: event.cep,
                    logradouro: event.logradouro,
                    location: event.location,
                    address: (event as any).address
                });
                // Try to populate address data from event location/metadata if available
                // Note: granular fields might not be in event object yet until we update GET endpoint
                // For now we try to parse or use what we have. 
                // If the backend assumes 'location' is the full address string for now.
                setAddressData({
                    cep: event.cep || '',
                    logradouro: event.logradouro || '',
                    numero: event.numero || '',
                    complemento: event.complemento || '',
                    bairro: event.bairro || '',
                    cidade: event.cidade || '',
                    uf: event.uf || '',
                    full_address: event.location || ''
                });

                // If granular data is missing but we have a location string, we might want to put it in logradouro or full_address
                if (!(event.logradouro) && event.location) {
                    setAddressData(prev => ({ ...prev, logradouro: event.location || '' }));
                }
            }
        } else if (selectedDate) {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            setFormData({
                title: '',
                description: '',
                start_time: `${dateStr}T09:00`,
                end_time: `${dateStr}T10:00`,
                event_type: 'meeting',
                participants: [],
                scope_items: [],
                attachments: [],
                company_name: '',
                client_id: '',
                cep: '',
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                uf: '',
            });
            setAddressData({
                cep: '',
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                uf: '',
                full_address: ''
            });
        } else {
            const now = new Date();
            const dateStr = format(now, "yyyy-MM-dd");
            setFormData({
                title: '',
                description: '',
                start_time: `${dateStr}T09:00`,
                end_time: `${dateStr}T10:00`,
                event_type: 'meeting',
                participants: [],
                scope_items: [],
                attachments: [],
                company_name: '',
                client_id: '',
                cep: '',
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                uf: '',
            });
            setAddressData({
                cep: '',
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                uf: '',
                full_address: ''
            });
        }
    }, [event, selectedDate, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.start_time || !formData.end_time) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        setLoading(true);
        try {
            // Construct location string
            let finalLocation = formData.location;

            // For inspections, construct address from granular fields for the 'location' string fallback
            // AND pass the granular fields in the payload 
            if (formData.event_type === 'inspection') {
                const parts = [
                    addressData.logradouro,
                    addressData.numero ? `nº ${addressData.numero}` : '',
                    addressData.bairro,
                    addressData.cidade,
                    addressData.uf
                ].filter(Boolean);
                finalLocation = parts.join(', ');
            }

            const payload: any = {
                ...formData,
                location: finalLocation, // This maps to 'address' column in backend for inspections
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
            };

            // Include granular fields for inspections
            if (formData.event_type === 'inspection') {
                console.log('[EventModal] Adding granular address to payload:', addressData);
                payload.cep = addressData.cep;
                payload.logradouro = addressData.logradouro;
                payload.numero = addressData.numero;
                payload.complemento = addressData.complemento;
                payload.bairro = addressData.bairro;
                payload.cidade = addressData.cidade;
                payload.uf = addressData.uf;
            }

            console.log('[EventModal] Final payload:', payload);
            await onSave(payload, event?.id); // Pass ID from event prop
            onClose();
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Erro ao salvar evento');
        } finally {
            setLoading(false);
        }
    };

    // ... Handlers (handleDelete, addScopeItem, etc) - Keep existing logic implies user wants minimal diff, but I am replacing a big chunk so I need to include them or be careful.
    // Wait, the tool 'replace_file_content' replaces a huge chunk. I need to make sure I don't lose the handlers.
    // The previous view_file showed lines 1-258 for imports to form start.
    // I will rewrite the handlers here to be safe since I am replacing up to line 260.

    const handleDelete = async () => {
        if (!event || !onDelete) return;

        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            setTimeout(() => setShowDeleteConfirm(false), 3000);
            return;
        }

        setLoading(true);
        try {
            console.log('[EventModal] Deleting event:', event.id);
            await onDelete(event.id);
            console.log('[EventModal] Delete success');
            onClose();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Erro ao excluir evento: ' + String(error));
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const addScopeItem = () => {
        if (!newScopeItem.trim()) return;
        setFormData(prev => ({
            ...prev,
            scope_items: [...(prev.scope_items || []), newScopeItem.trim()]
        }));
        setNewScopeItem('');
    };

    const removeScopeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            scope_items: (prev.scope_items || []).filter((_, i) => i !== index)
        }));
    };

    const addParticipant = () => {
        if (!newParticipant.trim()) return;
        setFormData(prev => ({
            ...prev,
            participants: [...(prev.participants || []), newParticipant.trim()]
        }));
        setNewParticipant('');
    };

    const removeParticipant = (index: number) => {
        setFormData(prev => ({
            ...prev,
            participants: (prev.participants || []).filter((_, i) => i !== index)
        }));
    };

    if (!isOpen) return null;

    const isReadOnly = event?.readonly;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 font-sans text-slate-800">
            <div className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isReadOnly ? 'border-t-4 border-slate-400' : ''}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800">
                            {event && event.id !== 0 ? (isReadOnly ? 'Detalhes do Evento (Sistema)' : 'Editar Evento') : 'Novo Evento'}
                        </h2>
                        {isReadOnly && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Somente Leitura</span>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Tabs - Simplified to 3 tabs */}
                <div className="flex px-4 border-b border-slate-100 overflow-x-auto whitespace-nowrap shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <AlignLeft size={16} className="inline mr-2 mb-0.5" />Geral
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('scope')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'scope' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <ListChecks size={16} className="inline mr-2 mb-0.5" />Escopo & Anexos
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('participants')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'participants' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={16} className="inline mr-2 mb-0.5" />Participantes
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            {/* Event Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Evento</label>
                                <div className="flex flex-wrap gap-2">
                                    {EVENT_TYPES.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => setFormData({ ...formData, event_type: type.value })}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${formData.event_type === type.value
                                                ? `${type.color} border-current ring-1 ring-offset-1`
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* INSPECTION SPECIFIC FIELDS */}
                            {formData.event_type === 'inspection' && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-4 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                                        <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                                            <ClipboardList size={16} />
                                            Dados da Inspeção
                                        </div>
                                        {/* Executor Actions */}
                                        {event?.original_id && (
                                            <div className="flex items-center gap-2">
                                                {/* Start/View Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (event.status === 'completed') {
                                                            navigate(`/inspections/${event.original_id}`);
                                                        } else {
                                                            navigate(`/inspections/${event.original_id}/edit`);
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors shadow-sm"
                                                >
                                                    {event.status === 'completed' ? (
                                                        <>
                                                            <ExternalLink size={14} />
                                                            Ver Relatório
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play size={14} />
                                                            {event.status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation Actions (Waze/Maps) */}
                                    {isReadOnly && formData.location && (
                                        <div className="flex gap-2 mb-2">
                                            <a
                                                href={`https://waze.com/ul?q=${encodeURIComponent(formData.location)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-xs font-bold"
                                            >
                                                <Navigation size={14} />
                                                Abrir no Waze
                                            </a>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-xs font-bold"
                                            >
                                                <MapPin size={14} />
                                                Google Maps
                                            </a>
                                        </div>
                                    )}

                                    {/* Company Selector */}
                                    {isReadOnly ? (
                                        <div>
                                            <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Cliente / Empresa</label>
                                            <p className="text-sm text-slate-700">{formData.company_name || 'Não informado'}</p>
                                        </div>
                                    ) : (
                                        <AutoSuggestField
                                            label="Cliente / Empresa"
                                            name="company_name"
                                            value={formData.company_name || ''}
                                            onChange={(val, _email, data) => {
                                                console.log('[EventModal] Company selected:', { val, data });
                                                const suggestion = data as { address?: string; org_id?: number };

                                                if (suggestion?.address) {
                                                    const parsed = parseAddressString(suggestion.address);
                                                    setAddressData(parsed);
                                                } else {
                                                    // Clear address data if no suggestion address
                                                    setAddressData({
                                                        cep: '',
                                                        logradouro: '',
                                                        numero: '',
                                                        complemento: '',
                                                        bairro: '',
                                                        cidade: '',
                                                        uf: '',
                                                        full_address: ''
                                                    });
                                                }

                                                setFormData(prev => ({
                                                    ...prev,
                                                    company_name: val,
                                                    location: suggestion?.address || prev.location,
                                                    client_id: suggestion?.org_id ? String(suggestion.org_id) : prev.client_id
                                                }));
                                            }}
                                            placeholder="Busque pelo nome da empresa..."
                                            apiEndpoint="/api/autosuggest/companies"
                                            required={true}
                                            className="w-full"
                                        />
                                    )}



                                    {/* Address / Location */}
                                    <div className="mt-4 mb-4">
                                        {formData.event_type === 'inspection' ? (
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                                <AddressForm
                                                    data={addressData}
                                                    onChange={setAddressData}
                                                    readOnly={isReadOnly}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Localização</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                                    <input
                                                        type="text"
                                                        disabled={isReadOnly}
                                                        value={formData.location || ''}
                                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                        placeholder="Sala de Reunião, Endereço, Link..."
                                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Template Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Checklist / Template (Opcional)</label>
                                        <select
                                            disabled={isReadOnly}
                                            value={formData.template_id || ''}
                                            onChange={(e) => setFormData({ ...formData, template_id: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                                        >
                                            <option value="">Decidir na hora da inspeção</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                                <input
                                    type="text"
                                    disabled={isReadOnly}
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
                                    required
                                />
                            </div>

                            {/* Date/Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Início *</label>
                                    <input
                                        type="datetime-local"
                                        disabled={isReadOnly}
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Término *</label>
                                    <input
                                        type="datetime-local"
                                        disabled={isReadOnly}
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                                <textarea
                                    disabled={isReadOnly}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>

                            {/* Integration Options - Inline in General Tab */}
                            {!isReadOnly && (
                                <div className="pt-4 border-t border-slate-200">
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Opções de Integração</label>
                                    <div className="flex flex-wrap gap-3">
                                        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                checked={formData.create_meet || false}
                                                onChange={(e) => setFormData({ ...formData, create_meet: e.target.checked })}
                                            />
                                            <Video size={16} className="text-blue-500" />
                                            <span className="text-sm font-medium text-slate-700">Gerar Link Meet</span>
                                        </label>

                                        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-amber-300 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300"
                                                checked={formData.notify_email || false}
                                                onChange={(e) => setFormData({ ...formData, notify_email: e.target.checked })}
                                            />
                                            <Mail size={16} className="text-amber-500" />
                                            <span className="text-sm font-medium text-slate-700">Enviar E-mail</span>
                                        </label>
                                    </div>

                                    {formData.notify_email && (
                                        <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                            <textarea
                                                value={formData.notification_body || ''}
                                                onChange={(e) => setFormData({ ...formData, notification_body: e.target.value })}
                                                placeholder="Mensagem personalizada para o convite (opcional)..."
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Meeting Link Display if exists */}
                            {formData.meeting_link && (
                                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <Video size={18} className="text-emerald-600" />
                                    <a href={formData.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 hover:underline flex-1 truncate">
                                        {formData.meeting_link}
                                    </a>
                                    <a href={formData.meeting_link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700">Entrar</a>
                                </div>
                            )}

                            {/* Spacer for better scrolling */}
                            <div className="h-4"></div>
                        </div>
                    )}

                    {/* --- SCOPE TAB --- */}
                    {activeTab === 'scope' && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Pontos De Atenção / Escopo</label>
                                <p className="text-xs text-slate-500 mb-3">Liste itens específicos que devem ser verificados ou discutidos neste evento.</p>

                                {!isReadOnly && (
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={newScopeItem}
                                            onChange={(e) => setNewScopeItem(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addScopeItem())}
                                            placeholder="Ex: Verificar extintores bloco B..."
                                            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                        <button
                                            type="button"
                                            onClick={addScopeItem}
                                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {(formData.scope_items && formData.scope_items.length > 0) ? (
                                        formData.scope_items.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-sm text-slate-700">{item}</span>
                                                </div>
                                                {!isReadOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeScopeItem(index)}
                                                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            <ListChecks className="mx-auto h-6 w-6 text-slate-300 mb-1" />
                                            <p className="text-xs text-slate-500">Nenhum item de escopo definido.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attachments Section (merged into Scope tab) */}
                            <div className="pt-4 border-t border-slate-200">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Anexos & Fotos</label>
                                {!isReadOnly && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center mb-3">
                                        <Paperclip size={20} className="mx-auto text-slate-400 mb-1" />
                                        <p className="text-xs text-slate-500">Arraste arquivos ou clique para adicionar</p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={loading}
                                            className="mt-2 text-primary text-sm font-bold hover:underline disabled:opacity-50"
                                        >
                                            {loading ? 'Enviando...' : 'Selecionar Arquivo'}
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleFileSelect(e.target.files)}
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {formData.attachments && formData.attachments.length > 0 ? (
                                        formData.attachments.map((url, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-[200px]">{url.split('/').pop()}</a>
                                                {!isReadOnly && <button type="button" className="text-slate-400 hover:text-red-500"><X size={16} /></button>}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic text-center">Nenhum anexo.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PARTICIPANTS TAB --- */}
                    {activeTab === 'participants' && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Participantes</label>
                                <p className="text-xs text-slate-500 mb-3">Selecione usuários cadastrados para participar deste evento.</p>

                                {!isReadOnly && (
                                    <div className="flex gap-2 mb-3">
                                        <select
                                            value={newParticipant}
                                            onChange={(e) => setNewParticipant(e.target.value)}
                                            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-ellipsis"
                                            disabled={loadingUsers}
                                        >
                                            <option value="">{loadingUsers ? 'Carregando usuários...' : 'Selecione um usuário...'}</option>
                                            {availableUsers
                                                .filter(u => !formData.participants?.includes(u.email))
                                                .map((user) => (
                                                    <option key={user.id} value={user.email}>
                                                        {user.name} ({user.email})
                                                    </option>
                                                ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={addParticipant}
                                            disabled={!newParticipant}
                                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {(formData.participants && formData.participants.length > 0) ? (
                                        formData.participants.map((email, index) => {
                                            const user = availableUsers.find(u => u.email === email);
                                            return (
                                                <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm rounded-full border border-indigo-100">
                                                    {user?.avatar_url ? (
                                                        <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                                                    ) : (
                                                        <Users size={14} />
                                                    )}
                                                    <span>{user?.name || email}</span>
                                                    {/* Status Icon */}
                                                    {(() => {
                                                        const isAccepted = event?.accepted_by?.some((u: any) => (typeof u === 'string' ? u : u.email) === email);
                                                        const isDeclined = event?.declined_by?.some((u: any) => (typeof u === 'string' ? u : u.email) === email);
                                                        if (isAccepted) return <CheckCircle size={14} className="text-green-600" />;
                                                        if (isDeclined) return <XCircle size={14} className="text-red-600" />;
                                                        return <Clock size={14} className="text-slate-400" />;
                                                    })()}
                                                    {!isReadOnly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeParticipant(index)}
                                                            className="ml-1 text-indigo-400 hover:text-indigo-900"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">Nenhum participante adicionado.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                </form>

                {/* Footer Actions */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl shrink-0">
                    {event && onDelete && !isReadOnly ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${showDeleteConfirm ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
                        >
                            <Trash2 size={18} />
                            {showDeleteConfirm ? 'Confirmar?' : 'Excluir'}
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex gap-2">
                        {event && formData.participants?.includes(user?.email || '') && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleResponse('accepted')}
                                    disabled={loading || myResponse === 'accepted'}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${myResponse === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-green-50 hover:text-green-700'}`}
                                >
                                    <CheckCircle size={16} />
                                    {myResponse === 'accepted' ? 'Aceito' : 'Aceitar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleResponse('declined')}
                                    disabled={loading || myResponse === 'declined'}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${myResponse === 'declined' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700'}`}
                                >
                                    <XCircle size={16} />
                                    {myResponse === 'declined' ? 'Recusado' : 'Recusar'}
                                </button>
                                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        >
                            {isReadOnly ? 'Fechar' : 'Cancelar'}
                        </button>
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${loading
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        <span>Salvar</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
