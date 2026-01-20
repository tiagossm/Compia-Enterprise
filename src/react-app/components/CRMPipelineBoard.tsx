
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
import { User, Clock, Pencil, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

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
    onEdit?: (lead: Lead) => void;
    onDelete?: (leadId: number, companyName: string) => void;
}

// ----------------------------------------------------------------------
// Sortable Lead Card Item
// ----------------------------------------------------------------------
function LeadCard({ lead, isOverlay = false, onEdit, onDelete }: { lead: Lead, isOverlay?: boolean, onEdit?: (lead: Lead) => void, onDelete?: (leadId: number, name: string) => void }) {
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

    const daysInStage = differenceInDays(new Date(), parseISO(lead.status_updated_at || lead.created_at || new Date().toISOString()));
    const isRotting = daysInStage > 30;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative
                ${isOverlay ? 'shadow-xl rotate-2 scale-105 cursor-grabbing' : ''}
                ${isRotting && !isDragging ? 'border-l-4 border-l-red-500' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="font-semibold text-slate-800 text-sm truncate pr-2">{lead.company_name}</div>
                {isRotting && (
                    <div className="text-[10px] text-red-500 flex items-center bg-red-50 px-1 rounded whitespace-nowrap" title={`${daysInStage} dias neste estágio`}>
                        <Clock className="w-3 h-3 mr-1" />
                        {daysInStage}d
                    </div>
                )}
            </div>

            {lead.contact_name && (
                <div className="flex items-center text-xs text-slate-500 mb-2">
                    <User className="w-3 h-3 mr-1" />
                    {lead.contact_name}
                </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    {lead.probability ? `${lead.probability}%` : '0%'}
                </span>
                <div className="text-xs font-bold text-emerald-600">
                    {lead.deal_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                </div>
            </div>

            {/* Action Buttons */}
            {(onEdit || onDelete) && !isOverlay && (
                <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-100">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(lead.id, lead.company_name); }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Column Container
// ----------------------------------------------------------------------
function Column({ id, title, color, leads, onEdit, onDelete }: { id: string, title: string, color: string, leads: Lead[], onEdit?: (lead: Lead) => void, onDelete?: (leadId: number, name: string) => void }) {
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
                <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mb-1">
                        {leads.length}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                        {leads.reduce((acc, curr) => acc + (curr.deal_value || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            <div className="p-2 flex-1 overflow-y-auto min-h-[150px]">
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    {leads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} />
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
export default function CRMPipelineBoard({ leads, onStatusChange, onEdit, onDelete }: CRMPipelineBoardProps) {
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
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
