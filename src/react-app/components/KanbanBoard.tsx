import { useState, useEffect, useMemo } from 'react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react';

// Types
interface KanbanColumnType {
    id: number;
    title: string;
    status_key: string;
    color: string;
}

interface KanbanItemType {
    id: number;
    title: string;
    status: string;
    priority: string;
    [key: string]: any; // Allow other properties
}

interface KanbanBoardProps {
    items: KanbanItemType[];
    orgId: number;
    onItemMove: (itemId: number, newStatus: string) => void;
    onColumnChange: () => void; // Refresh columns
}

// --- Sortable Item Component ---
function SortableItem({ item }: { item: KanbanItemType }) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: item.id,
        data: {
            type: 'Item',
            item,
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-slate-50 opacity-40 border border-dashed border-slate-300 rounded-lg h-24 mb-3"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-grab mb-3 group"
        >
            <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.priority === 'alta' ? 'bg-red-100 text-red-800' :
                    item.priority === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                    {item.priority?.toUpperCase()}
                </span>
                <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">{item.title}</h4>
            {/* Add more item details here if needed */}
        </div>
    );
}

// --- Sortable Column Component ---
function SortableColumn({ column, items }: { column: KanbanColumnType, items: KanbanItemType[] }) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const itemsIds = useMemo(() => items.map(i => i.id), [items]);

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-slate-100 opacity-40 border-2 border-dashed border-slate-300 rounded-xl w-[300px] h-[500px] flex-shrink-0 mr-4"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-slate-50 w-[300px] rounded-xl flex flex-col h-full border border-slate-200 flex-shrink-0 mr-4"
        >
            {/* Column Header */}
            <div
                {...attributes}
                {...listeners}
                className={`p-4 rounded-t-xl cursor-grab flex items-center justify-between border-b border-slate-100 ${column.color || 'bg-slate-100'}`}
            >
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{column.title}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-slate-500 border border-slate-200 shadow-sm">
                        {items.length}
                    </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            {/* Items Container */}
            <div className="flex-1 p-3 overflow-y-auto min-h-[100px]">
                <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                    {items.map(item => (
                        <SortableItem key={item.id} item={item} />
                    ))}
                </SortableContext>
            </div>
            <div className="p-3 border-t border-slate-100">
                <button className="w-full py-2 flex items-center justify-center gap-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium">
                    <Plus size={16} /> Adicionar Item
                </button>
            </div>
        </div>
    );
}

// --- Main Kanban Board Component ---
export default function KanbanBoard({ items, orgId, onItemMove, onColumnChange }: KanbanBoardProps) {
    const [columns, setColumns] = useState<KanbanColumnType[]>([]);
    const [activeDragItem, setActiveDragItem] = useState<any>(null);
    const [activeDragColumn, setActiveDragColumn] = useState<any>(null);
    const [isCreatingColumn, setIsCreatingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');

    const handleCreateColumn = async () => {
        if (!newColumnTitle.trim()) return;
        try {
            const response = await fetch(`/api/kanban/${orgId}/columns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newColumnTitle.trim() })
            });

            if (response.ok) {
                setNewColumnTitle('');
                setIsCreatingColumn(false);
                onColumnChange(); // Refresh parent
                fetchColumns(); // Refresh local list
            } else {
                console.error("Failed to create column");
            }
        } catch (error) {
            console.error("Error creating column:", error);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10, // Must drag 10px to start (prevents accidental clicks)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (orgId) {
            fetchColumns();
        }
    }, [orgId]);

    const fetchColumns = async () => {
        try {
            const response = await fetch(`/api/kanban/${orgId}/columns`);
            if (response.ok) {
                const data = await response.json();
                setColumns(data.columns || []);
            }
        } catch (error) {
            console.error("Error fetching columns:", error);
        }
    }

    const columnsIds = useMemo(() => columns.map(c => c.id), [columns]);

    // Drag Handlers
    function onDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === 'Column') {
            setActiveDragColumn(event.active.data.current.column);
            return;
        }
        if (event.active.data.current?.type === 'Item') {
            setActiveDragItem(event.active.data.current.item);
            return;
        }
    }

    function onDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveAColumn = active.data.current?.type === 'Column';
        // const isOverAColumn = over.data.current?.type === 'Column';

        if (isActiveAColumn) return; // Column sorting handled in DragEnd

        // Item Sorting logic (Visual Only here if needed, but we rely on simple status change)
        // If over a column container or another item in a different column
    }

    // IMPORTANT: Final drop logic
    function onDragEnd(event: DragEndEvent) {
        setActiveDragColumn(null);
        setActiveDragItem(null);

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Is it a Column Drag?
        if (active.data.current?.type === 'Column') {
            if (activeId !== overId) {
                const oldIndex = columns.findIndex((c) => c.id === activeId);
                const newIndex = columns.findIndex((c) => c.id === overId);
                const newColumns = arrayMove(columns, oldIndex, newIndex);
                setColumns(newColumns);
                // Sync new order to backend
                updateColumnOrder(newColumns);
            }
            return;
        }

        // Is it an Item Drag?
        if (active.data.current?.type === 'Item') {
            // Find target column status
            // If dropped over a Column directly
            let targetStatus = '';

            if (over.data.current?.type === 'Column') {
                targetStatus = over.data.current.column.status_key;
            } else if (over.data.current?.type === 'Item') {
                // If dropped over an item, find that item's column status
                // We need to know which column the overItem belongs to.
                // Since we don't store columnId in item, we derive it from status...
                // WARNING: 'status' in item matches 'status_key' in column.
                const overItem = over.data.current.item;
                targetStatus = overItem.status; // Start with same status

                // But wait, if we drop over an item in a different column?
                // The `over` item has the *new* status we want (usually).
                // However, if we drag item A (pending) over item B (in_progress), target is in_progress.
                // But items array passed to this component is the GLOBAL list.
                // We don't change the list order here, specific implementation uses status filtering.
            }

            if (targetStatus && targetStatus !== active.data.current.item.status) {
                onItemMove(Number(activeId), targetStatus);
            }
        }
    }

    const updateColumnOrder = async (newCols: KanbanColumnType[]) => {
        try {
            await fetch(`/api/kanban/${orgId}/columns/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columnIds: newCols.map(c => c.id) })
            });
        } catch (error) {
            console.error("Error reordering columns:", error);
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
            <div className="flex h-full overflow-x-auto pb-4 px-2">
                <SortableContext items={columnsIds} strategy={horizontalListSortingStrategy}>
                    {columns.map(col => (
                        <SortableColumn
                            key={col.id}
                            column={col}
                            items={items.filter(i => i.status === col.status_key)}
                        />
                    ))}
                </SortableContext>
                {/* Add New Column Button / Form */}
                {isCreatingColumn ? (
                    <div className="min-w-[300px] h-auto p-4 bg-slate-50 border border-slate-300 rounded-xl flex flex-col gap-3 shadow-lg">
                        <h4 className="font-bold text-slate-700 text-sm">Nova Etapa</h4>
                        <input
                            type="text"
                            value={newColumnTitle}
                            onChange={(e) => setNewColumnTitle(e.target.value)}
                            placeholder="Nome da etapa..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsCreatingColumn(false)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateColumn}
                                disabled={!newColumnTitle.trim()}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={() => setIsCreatingColumn(true)}
                        className="min-w-[300px] h-[100px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <button className="flex items-center gap-2 text-slate-500 font-medium">
                            <Plus size={20} /> Nova Etapa
                        </button>
                    </div>
                )}
            </div>

            {createPortal(
                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                    {activeDragColumn && (
                        <div className="bg-slate-50 w-[300px] rounded-xl flex flex-col h-[500px] border border-slate-200 shadow-xl opacity-80 cursor-grabbing">
                            <div className={`p-4 rounded-t-xl flex items-center justify-between border-b border-slate-100 ${activeDragColumn.color}`}>
                                <h3 className="font-bold text-slate-700">{activeDragColumn.title}</h3>
                            </div>
                        </div>
                    )}
                    {activeDragItem && (
                        <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200 w-[280px] cursor-grabbing transform rotate-2">
                            <h4 className="font-semibold text-slate-800 text-sm mb-1">{activeDragItem.title}</h4>
                        </div>
                    )}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
