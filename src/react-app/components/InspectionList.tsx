import React from 'react';

interface InspectionListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    onFinalize?: () => void; // Now optional, handled by FloatingActionBar
    isSaving?: boolean;
    emptyMessage?: string;
}

export default function InspectionList<T>({
    items,
    renderItem,
    emptyMessage = "Nenhum item encontrado."
}: InspectionListProps<T>) {

    if (!items || items.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* List Container - Flat Style */}
            <div className="divide-y divide-slate-100 border-b border-slate-100">
                {items.map((item, index) => (
                    <div key={index} className="w-full bg-white">
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
            {/* Action buttons moved to FloatingActionBar */}
        </div>
    );
}
