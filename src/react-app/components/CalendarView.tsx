import { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Filter,
    X
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventModal from './EventModal';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import { CalendarEvent } from '@/shared/types';
import CalendarListView from './CalendarListView';
import { LayoutGrid, List as ListIcon } from 'lucide-react';



export default function CalendarView() {
    const { selectedOrganization } = useOrganization();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    // View Mode State (Default to Month on Desktop, List on Mobile - could use media query hook, defaulting to 'month' for now)
    const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

    // Drag and Drop State
    const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

    const EVENT_TYPES = [
        { value: 'all', label: 'Todos', color: 'bg-slate-100 text-slate-700' },
        { value: 'inspection', label: 'Inspeção', color: 'bg-blue-100 text-blue-700' },
        { value: 'meeting', label: 'Reunião', color: 'bg-emerald-100 text-emerald-700' },
        { value: 'focus_time', label: 'Foco', color: 'bg-purple-100 text-purple-700' },
        { value: 'blocking', label: 'Bloqueio', color: 'bg-gray-100 text-gray-700' },
        { value: 'other', label: 'Outro', color: 'bg-slate-100 text-slate-700' },
    ];

    useEffect(() => {
        fetchEvents();
    }, [currentDate, selectedOrganization]);

    // Mobile-first View Default
    useEffect(() => {
        // Mobile-first View Default (Hook handled in initial state logic or effect below)
        // Optional: dynamic switch? No, user might have switched manually. 
        // Just set initial. But to set initial we need to do it once.


        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const start = startOfMonth(currentDate).toISOString();
            const end = endOfMonth(currentDate).toISOString();
            const timestamp = new Date().getTime();

            let url = `/api/calendar?start_date=${start}&end_date=${end}&t=${timestamp}`;
            if (selectedOrganization) {
                url += `&organization_id=${selectedOrganization.id}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setEvents(data);
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEvent = async (eventData: any, eventId?: number | string, forceConflict = false) => {
        // Robust check for new event (handles string '0' or number 0 or undefined)
        const isNew = !eventId || eventId === 0 || eventId === '0';
        const url = !isNew
            ? `/api/calendar/${eventId}`
            : '/api/calendar';
        const method = !isNew ? 'PUT' : 'POST';

        // Inject Organization ID if new
        if (isNew && selectedOrganization) {
            eventData.organization_id = selectedOrganization.id;
        }

        // Se forçando criação apesar do conflito
        if (forceConflict) {
            eventData.force_conflict = true;
        }

        const response = await fetchWithAuth(url, {
            method,
            body: JSON.stringify(eventData),
        });

        // Chronos Lei 2: Tratar conflito de horário
        if (response.status === 409) {
            const conflictData = await response.json();
            const conflictEvents = conflictData.conflicting_events || [];
            const eventTitles = conflictEvents.map((e: any) => `• ${e.title}`).join('\n');

            const shouldForce = window.confirm(
                `⚠️ Conflito de Horário Detectado!\n\n` +
                `Já existem eventos neste período:\n${eventTitles}\n\n` +
                `Deseja criar o evento mesmo assim?`
            );

            if (shouldForce) {
                // Tentar novamente com force_conflict
                return handleSaveEvent(eventData, eventId, true);
            } else {
                throw new Error('Operação cancelada devido a conflito de horário');
            }
        }

        if (!response.ok) {
            throw new Error('Failed to save event');
        }

        await fetchEvents();
    };

    const handleDeleteEvent = async (eventId: number | string) => {
        console.log('[CalendarView] Deleting event ID:', eventId);
        try {
            const response = await fetchWithAuth(`/api/calendar/${eventId}`, {
                method: 'DELETE',
            });

            console.log('[CalendarView] Delete response status:', response.status);

            if (!response.ok) {
                const text = await response.text();
                console.error('[CalendarView] Delete failed body:', text);
                throw new Error(`Failed to delete event: ${response.status} ${text}`);
            }

            await fetchEvents();
        } catch (error) {
            console.error('[CalendarView] Delete exception:', error);
            throw error;
        }
    };

    // Drag and Drop Logic
    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
        e.dataTransfer.setData('eventId', event.id.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        // Optimize re-renders: only update if changed
        if (!dragOverDate || !isSameDay(date, dragOverDate)) {
            // console.log('Drag over', date);
            setDragOverDate(date);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // setDragOverDate(null);
    };

    const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverDate(null);

        const eventId = e.dataTransfer.getData('eventId');

        if (!eventId) return;

        // Robust find: loose equality to handle string/number mismatch
        const eventToMove = events.find(ev => ev.id == eventId);

        if (!eventToMove) {
            console.error('Event not found in state:', eventId);
            return;
        }

        // Calculate new times preserving duration
        const originalStart = parseISO(eventToMove.start_time);
        const originalEnd = parseISO(eventToMove.end_time);
        const durationMs = originalEnd.getTime() - originalStart.getTime();

        // Set new start time on target date, keeping original hours/minutes
        const newStart = new Date(targetDate);
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes());

        const newEnd = new Date(newStart.getTime() + durationMs);

        const updatedEvent = {
            ...eventToMove,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString()
        };

        // Optimistic UI Update
        const previousEvents = [...events];
        const optimisticEvents = events.map(ev =>
            ev.id === eventToMove.id ? updatedEvent : ev
        );
        setEvents(optimisticEvents);

        try {
            setLoading(true);
            await handleSaveEvent(updatedEvent, eventToMove.id);
        } catch (error) {
            console.error('Failed to move event:', error);
            alert('Falha ao mover evento');
            // Revert state if failed
            setEvents(previousEvents);
        } finally {
            setLoading(false);
        }
    };














    const openNewEventModal = (date?: Date, type: 'inspection' | 'meeting' = 'meeting') => {
        const dateToUse = date || new Date();
        const dateStr = format(dateToUse, "yyyy-MM-dd");
        // Create a temporary event with default values but specific type
        setSelectedEvent({
            id: 0,
            title: '',
            description: '',
            start_time: `${dateStr}T09:00`,
            end_time: `${dateStr}T10:00`,
            event_type: type,
            status: 'scheduled',
            participants: [],
            scope_items: [],
            attachments: [],
            company_name: '',
            client_id: '',
        } as CalendarEvent);
        setSelectedDate(dateToUse);
        setIsModalOpen(true);
    };

    const openEditEventModal = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setSelectedDate(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
        setSelectedDate(null);
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate))
    });

    const getEventsForDay = (date: Date) => {
        return events.filter(event => {
            const matchesDay = isSameDay(parseISO(event.start_time), date);
            const matchesFilter = filterType === 'all' || event.event_type === filterType;
            return matchesDay && matchesFilter;
        });
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'inspection': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'meeting': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'focus_time': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'blocking': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-[800px] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-800 capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h2>
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={prevMonth}
                                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-3 py-1 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded transition-all"
                            >
                                Hoje
                            </button>
                            <button
                                onClick={nextMonth}
                                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        {loading && (
                            <span className="text-sm text-slate-400">Carregando...</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Grade Mensal"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Lista"
                            >
                                <ListIcon size={18} />
                            </button>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium border ${showFilters || filterType !== 'all'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Filter size={18} />
                            Filtros
                            {filterType !== 'all' && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                        </button>

                        <button
                            onClick={() => openNewEventModal(undefined, 'meeting')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                        >
                            <Plus size={20} />
                            Novo Evento
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                {showFilters && (
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-600">Tipo:</span>
                        <div className="flex flex-wrap gap-2">
                            {EVENT_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setFilterType(type.value)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${filterType === type.value
                                        ? `${type.color} ring-2 ring-offset-1 ring-current`
                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        {filterType !== 'all' && (
                            <button
                                onClick={() => setFilterType('all')}
                                className="ml-auto flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                            >
                                <X size={16} />
                                Limpar
                            </button>
                        )}
                    </div>
                )}

                {/* Week Days Header */}
                <div className="grid grid-cols-7 border-b border-slate-200">
                    {weekDays.map(day => (
                        <div key={day} className="py-2 text-center text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}

                {/* Calendar Grid OR List View */}
                {viewMode === 'list' ? (
                    <div className="flex-1 overflow-hidden">
                        <CalendarListView
                            events={events.filter(e => filterType === 'all' || e.event_type === filterType)}
                            currentDate={currentDate}
                            onEventClick={(e) => openEditEventModal(e)}
                        />
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-7 grid-rows-6">
                        {days.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isDayToday = isToday(day);

                            const isDragOver = dragOverDate && isSameDay(day, dragOverDate);

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => openNewEventModal(day)}
                                    onDragOver={(e) => handleDragOver(e, day)}
                                    onDrop={(e) => handleDrop(e, day)}
                                    onDragLeave={handleDragLeave}
                                    className={`
                                                    min-h-[100px] border-b border-r border-slate-100 p-2 transition-colors cursor-pointer
                                                    ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white hover:bg-blue-50'}
                                                    ${isDayToday ? 'bg-blue-50/30' : ''}
                                                    ${isDragOver ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : ''}
                                                `}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`
                                            text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                            ${isDayToday ? 'bg-blue-600 text-white' : ''}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <span className="text-xs text-slate-400 font-medium">{dayEvents.length}</span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <div
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditEventModal(event);
                                                }}
                                                className={`
                                                    text-xs px-2 py-1 rounded border truncate cursor-pointer hover:opacity-80
                                                    ${getEventColor(event.event_type)}
                                                `}
                                                title={event.title}
                                                draggable={true}
                                                onDragStart={(e) => handleDragStart(e, event)}
                                                style={{ cursor: 'move' }}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1 font-semibold">
                                                        <span>{format(parseISO(event.start_time), 'HH:mm')}</span>
                                                        <span className="truncate">{event.title}</span>
                                                    </div>
                                                    {event.company_name && (
                                                        <span className="text-[10px] opacity-75 truncate block">
                                                            {event.company_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-xs text-center text-slate-500 font-medium hover:text-blue-600">
                                                + {dayEvents.length - 3} mais
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div >

            {/* Event Modal */}
            < EventModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                event={selectedEvent}
                selectedDate={selectedDate}
            />
        </>
    );
}
