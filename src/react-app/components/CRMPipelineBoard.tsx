
import { useMemo, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead } from './dashboard/SystemAdminCRM';
import { User } from 'lucide-react';

// Status Columns Definition
const COLUMNS = [
    { id: 'new', title: 'Novos', color: 'bg-blue-100 text-blue-800' },
    { id: 'contacted', title: 'Contatados', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'qualified', title: 'Qualificados', color: 'bg-purple-100 text-purple-800' },
    { id: 'proposal', title: 'Proposta', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'negotiation', title: 'Negociação', color: 'bg-orange-100 text-orange-800' },
    { id: 'won', title: 'Ganhos', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'lost', title: 'Perdidos', color: 'bg-red-100 text-red-800' }
] as const;



interface CRMPipelineBoardProps {
    leads: Lead[];
    onStatusChange: (leadId: number, newStatus: string) => Promise<void>;
}

// ----------------------------------------------------------------------
// Sortable Lead Card Item
// ----------------------------------------------------------------------
function LeadCard({ lead, isOverlay = false }: { lead: Lead, isOverlay?: boolean }) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: lead.id,
        data: {
            type: 'lead',
            lead
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow
                ${isOverlay ? 'shadow-xl rotate-2 scale-105 cursor-grabbing' : ''}
            `}
        >
            <div className="font-semibold text-slate-800 text-sm mb-1">{lead.company_name}</div>
            {lead.contact_name && (
                <div className="flex items-center text-xs text-slate-500 mb-1">
                    <User className="w-3 h-3 mr-1" />
                    {lead.contact_name}
                </div>
            )}
            <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    #{lead.id}
                </span>
                <div className="text-xs font-medium text-emerald-600">
                    {/* Placeholder for value if exists */}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Column Container
// ----------------------------------------------------------------------
function Column({ id, title, color, leads }: { id: string, title: string, color: string, leads: Lead[] }) {
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'column',
            id
        }
    });

    return (
        <div ref={setNodeRef} className="flex-shrink-0 w-72 bg-slate-50/50 rounded-xl flex flex-col max-h-full">
            <div className={`p-3 rounded-t-xl border-b border-slate-200/50 flex justify-between items-center bg-white sticky top-0 z-10`}>
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color.split(' ')[0]}`}></span>
                    <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {leads.length}
                </span>
            </div>

            <div className="p-2 flex-1 overflow-y-auto min-h-[150px]">
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    {leads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} />
                    ))}
                    {leads.length === 0 && (
                        <div className="h-full flex items-center justify-center text-xs text-slate-300 italic min-h-[100px]">
                            Vazio
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Main Board Component
// ----------------------------------------------------------------------
export default function CRMPipelineBoard({ leads, onStatusChange }: CRMPipelineBoardProps) {
    const [activeLead, setActiveLead] = useState<Lead | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Avoid accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Group leads by status
    const columns = useMemo(() => {
        const grouped: Record<string, Lead[]> = {};
        COLUMNS.forEach(col => { grouped[col.id] = []; });

        leads.forEach(lead => {
            if (grouped[lead.status]) {
                grouped[lead.status].push(lead);
            } else {
                // Fallback for unknown status
                if (!grouped['new']) grouped['new'] = [];
                grouped['new'].push(lead);
            }
        });
        return grouped;
    }, [leads]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;

        if (active.data.current?.type === 'lead') {
            setActiveLead(active.data.current.lead as Lead);
        }
    };

    const handleDragOver = () => {
        // Only needed for reordering within same column or moving visual placeholder
        // Actual logic handled in DragEnd for status change
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveLead(null);

        if (!over) return;

        const activeLeadId = active.id as number;
        const overId = over.id; // Could be a lead ID or a column ID

        // Find the destination column
        let newStatus = '';

        // 1. Dropped directly on a column
        if (Object.keys(columns).includes(overId as string)) {
            newStatus = overId as string;
        }
        // 2. Dropped on another lead card
        else {
            const overLead = leads.find(l => l.id === overId);
            if (overLead) {
                newStatus = overLead.status;
            }
        }

        const currentLead = leads.find(l => l.id === activeLeadId);

        if (currentLead && newStatus && currentLead.status !== newStatus) {
            // Optimistic update should be handled by parent re-render, 
            // but we trigger the callback immediately
            await onStatusChange(activeLeadId, newStatus);
        }
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.4',
                },
            },
        }),
    };

    return (
        <div className="flex h-full overflow-x-auto gap-4 pb-4 items-start min-h-[500px]">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                {COLUMNS.map(col => (
                    <Column
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        color={col.color}
                        leads={columns[col.id] || []}
                    />
                ))}

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
