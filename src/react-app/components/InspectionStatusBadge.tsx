
import { Clock, Play, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface InspectionStatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export default function InspectionStatusBadge({ status, size = 'sm', showIcon = true }: InspectionStatusBadgeProps) {
    // Normalize status to handle varied backend values
    const normalizedStatus = status?.toLowerCase().trim() || 'pendente';

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'scheduled':
            case 'agendada':
                return {
                    label: 'Agendada',
                    icon: Calendar,
                    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                    iconColor: 'text-indigo-600'
                };
            case 'pendente':
            case 'pending':
                return {
                    label: 'Pendente',
                    icon: Clock,
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    iconColor: 'text-yellow-600'
                };
            case 'em_andamento':
            case 'in_progress':
                return {
                    label: 'Em Andamento',
                    icon: Play,
                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                    iconColor: 'text-blue-600'
                };
            case 'concluida':
            case 'concluido':
            case 'completed':
                return {
                    label: 'Concluída',
                    icon: CheckCircle2,
                    color: 'bg-green-100 text-green-800 border-green-200',
                    iconColor: 'text-green-600'
                };
            case 'cancelada':
            case 'cancelled':
            case 'canceled':
                return {
                    label: 'Cancelada',
                    icon: AlertCircle,
                    color: 'bg-red-100 text-red-800 border-red-200',
                    iconColor: 'text-red-600'
                };
            default:
                return {
                    label: s, // Fallback to original if not mapped
                    icon: Clock,
                    color: 'bg-slate-100 text-slate-800 border-slate-200',
                    iconColor: 'text-slate-500'
                };
        }
    };

    const config = getStatusConfig(normalizedStatus);
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.color} ${sizeClasses[size]}`}>
            {showIcon && <Icon className={`${iconSizes[size]} ${config.iconColor}`} />}
            <span className="capitalize">{config.label}</span>
        </span>
    );
}
