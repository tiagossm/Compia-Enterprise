
import React, { useEffect, useState } from 'react';
import {
    MessageSquare,
    Phone,
    Mail,
    Users,
    ArrowRight,
    Plus,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
    id: number;
    type: 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'whatsapp';
    title: string;
    description?: string;
    created_at: string;
    user_email?: string;
}

interface ActivityTimelineProps {
    leadId: number;
    lead?: {
        phone?: string;
        email?: string;
        contact_name?: string;
    };
}

export default function ActivityTimeline({ leadId, lead }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    // New Note State
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState<Activity['type']>('note');

    const logActivity = async (type: Activity['type'], title: string, description: string) => {
        try {
            await fetch(`/api/crm/leads/${leadId}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, title, description })
            });
            fetchActivities();
        } catch (error) {
            console.error("Auto-log failed", error);
        }
    };

    const handleQuickAction = (action: 'whatsapp' | 'email' | 'call') => {
        if (!lead) return;

        let url = '';
        let logTitle = '';
        let logDesc = '';

        if (action === 'whatsapp') {
            if (!lead.phone) return alert('Telefone não cadastrado.');
            const phone = lead.phone.replace(/\D/g, '');
            const text = encodeURIComponent(`Olá ${lead.contact_name || ''}, tudo bem?`);
            url = `https://wa.me/55${phone}?text=${text}`;
            logTitle = 'Conversa WhatsApp Iniciada';
            logDesc = `Clicou para iniciar conversa via WhatsApp com ${lead.phone}`;
        }
        else if (action === 'email') {
            if (!lead.email) return alert('Email não cadastrado.');
            url = `mailto:${lead.email}`;
            logTitle = 'Email Iniciado';
            logDesc = `Abriu cliente de email para ${lead.email}`;
        }
        else if (action === 'call') {
            if (!lead.phone) return alert('Telefone não cadastrado.');
            url = `tel:${lead.phone}`;
            logTitle = 'Ligação Iniciada';
            logDesc = `Clicou para ligar para ${lead.phone}`;
        }

        window.open(url, '_blank');
        logActivity(
            action === 'call' ? 'call' : action === 'email' ? 'email' : 'whatsapp',
            logTitle,
            logDesc
        );
    };

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/crm/leads/${leadId}/activities`);
            if (res.ok) {
                const data = await res.json();
                setActivities(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [leadId]);

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            setAdding(true);
            await logActivity(noteType, getTitleByType(noteType), newNote);
            setNewNote('');
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar atividade.");
        } finally {
            setAdding(false);
        }
    };

    const getTitleByType = (type: string) => {
        switch (type) {
            case 'call': return 'Chamada Telefônica';
            case 'email': return 'Email Enviado';
            case 'meeting': return 'Reunião';
            case 'whatsapp': return 'Mensagem WhatsApp';
            default: return 'Nota';
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'status_change': return <ArrowRight className="w-4 h-4 text-white" />;
            case 'call': return <Phone className="w-4 h-4 text-white" />;
            case 'email': return <Mail className="w-4 h-4 text-white" />;
            case 'meeting': return <Users className="w-4 h-4 text-white" />;
            case 'whatsapp': return <MessageSquare className="w-4 h-4 text-white" />;
            default: return <MessageSquare className="w-4 h-4 text-white" />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'status_change': return 'bg-blue-500';
            case 'call': return 'bg-emerald-500';
            case 'email': return 'bg-indigo-500';
            case 'meeting': return 'bg-purple-500';
            case 'whatsapp': return 'bg-green-500';
            default: return 'bg-slate-400';
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Quick Actions Bar */}
            <div className="bg-white p-4 border-b border-slate-200 grid grid-cols-3 gap-2">
                <button
                    onClick={() => handleQuickAction('whatsapp')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors border border-green-200"
                >
                    <MessageSquare className="w-5 h-5 mb-1" />
                    <span className="text-xs font-semibold">WhatsApp</span>
                </button>
                <button
                    onClick={() => handleQuickAction('email')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200"
                >
                    <Mail className="w-5 h-5 mb-1" />
                    <span className="text-xs font-semibold">Email</span>
                </button>
                <button
                    onClick={() => handleQuickAction('call')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200"
                >
                    <Phone className="w-5 h-5 mb-1" />
                    <span className="text-xs font-semibold">Ligar</span>
                </button>
            </div>

            {/* Input Area */}
            <div className="bg-slate-50 p-4 border-b border-slate-200">
                <form onSubmit={handleAddActivity}>
                    <div className="flex gap-2 mb-2">
                        {(['note', 'call', 'email', 'meeting', 'whatsapp'] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setNoteType(type)}
                                className={`p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${noteType === type
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                                    }`}
                            >
                                {type === 'note' && 'Nota'}
                                {type === 'call' && 'Ligação'}
                                {type === 'email' && 'Email'}
                                {type === 'meeting' && 'Reunião'}
                                {type === 'whatsapp' && 'Zap'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder="Descreva a atividade..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={adding || !newNote.trim()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                    </div>
                </form>
            </div>

            {/* Timeline List */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
                {activities.length === 0 && !loading && (
                    <div className="text-center text-slate-400 text-sm italic mt-10">
                        Nenhuma atividade registrada ainda.
                    </div>
                )}
                {loading && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                )}

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {activities.map((activity) => (
                        <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                            {/* Icon */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${getColor(activity.type)}`}>
                                {getIcon(activity.type)}
                            </div>

                            {/* Card content */}
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-slate-200 shadow hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between space-x-2 mb-1">
                                    <div className="font-bold text-slate-900 text-sm">{activity.title}</div>
                                    <time className="font-caveat font-medium text-xs text-indigo-500">
                                        {format(new Date(activity.created_at), "d MMM, HH:mm", { locale: ptBR })}
                                    </time>
                                </div>
                                <div className="text-slate-500 text-sm">
                                    {activity.description}
                                </div>
                                {activity.user_email && (
                                    <div className="mt-2 text-xs text-slate-400 text-right italic">
                                        por {activity.user_email.split('@')[0]}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
