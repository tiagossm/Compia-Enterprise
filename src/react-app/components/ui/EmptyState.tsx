import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = ""
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl ${className}`}>
            {Icon && (
                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <Icon className="w-8 h-8 text-slate-400" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
            {action && (
                <div className="flex gap-3">
                    {action}
                </div>
            )}
        </div>
    );
}
