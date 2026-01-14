import { useMemo } from 'react';
import { format, isToday, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    MapPin,
    Clock,
    CheckCircle2,
    Briefcase,
    Calendar as CalendarIcon,
    Circle
} from 'lucide-react';
import { CalendarEvent } from '@/shared/types';

interface CalendarListViewProps {
    events: CalendarEvent[];
    currentDate: Date;
    onEventClick: (event: CalendarEvent) => void;
}

export default function CalendarListView({ events, currentDate, onEventClick }: CalendarListViewProps) {

    // Agrupar eventos por dia
    const groupedEvents = useMemo(() => {
        const groups: { [key: string]: CalendarEvent[] } = {};

        // Filtrar apenas eventos do mês atual (ou permitir lista contínua? Vamos seguir o mês selecionado por enquanto)
        const relevantEvents = events.filter(event =>
            isSameMonth(parseISO(event.start_time), currentDate)
        );

        // Ordenar por data/hora -> REMOVIDO: O Backend já retorna ordenado (Lei da Preguiça Inteligente)
        // relevantEvents.sort((a, b) => compareAsc(parseISO(a.start_time), parseISO(b.start_time)));

        relevantEvents.forEach(event => {
            const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(event);
        });

        // Ordenar as chaves (dias)
        return Object.keys(groups).sort().map(dateKey => ({
            date: parseISO(dateKey),
            events: groups[dateKey]
        }));
    }, [events, currentDate]);

    const getEventColorBorder = (type: string) => {
        switch (type) {
            case 'inspection': return 'border-l-4 border-l-blue-500';
            case 'meeting': return 'border-l-4 border-l-emerald-500';
            case 'focus_time': return 'border-l-4 border-l-purple-500';
            case 'blocking': return 'border-l-4 border-l-gray-500';
            default: return 'border-l-4 border-l-slate-300';
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'inspection': return <CheckCircle2 size={16} className="text-blue-500" />;
            case 'meeting': return <Briefcase size={16} className="text-emerald-500" />;
            case 'focus_time': return <Clock size={16} className="text-purple-500" />;
            case 'blocking': return <Circle size={16} className="text-gray-500" />;
            default: return <CalendarIcon size={16} className="text-slate-400" />;
        }
    };

    if (groupedEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <CalendarIcon size={48} className="mb-4 opacity-20" />
                <p>Nenhum evento para este mês.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-slate-50 p-2 sm:p-4">
            <div className="space-y-6 pb-20">
                {groupedEvents.map(({ date, events }) => {
                    const isDayToday = isToday(date);

                    return (
                        <div key={date.toISOString()} className="flex flex-col gap-2">
                            {/* Sticky Headerish Date */}
                            <div className="flex items-center gap-3 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 py-2">
                                <div className={`
                                    flex flex-col items-center justify-center w-12 h-12 rounded-xl border shadow-sm
                                    ${isDayToday ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}
                                `}>
                                    <span className="text-xs font-semibold uppercase">
                                        {format(date, 'EEE', { locale: ptBR }).slice(0, 3)}
                                    </span>
                                    <span className="text-xl font-bold leading-none">
                                        {format(date, 'd')}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-medium ${isDayToday ? 'text-blue-700' : 'text-slate-500'}`}>
                                        {isDayToday ? 'Hoje' : format(date, 'MMMM', { locale: ptBR })}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {events.length} evento{events.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Events List */}
                            <div className="space-y-3 pl-4 sm:pl-0">
                                {events.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className={`
                                            bg-white rounded-lg p-4 shadow-sm active:scale-[0.99] transition-transform cursor-pointer
                                            ${getEventColorBorder(event.event_type)}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {getEventIcon(event.event_type)}
                                                <span className="font-semibold text-slate-800 line-clamp-1">
                                                    {event.title}
                                                </span>
                                            </div>
                                            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                {format(parseISO(event.start_time), 'HH:mm')}
                                            </span>
                                        </div>

                                        {event.description && (
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-2 pl-6">
                                                {event.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-3 pl-6 mt-2">
                                            {event.location && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <MapPin size={12} />
                                                    <span className="truncate max-w-[200px]">{event.location}</span>
                                                </div>
                                            )}
                                            {event.company_name && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Briefcase size={12} />
                                                    <span className="truncate max-w-[200px]">{event.company_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
