import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { InspectionType } from '@/shared/types';
import InspectionStatusBadge from '@/react-app/components/InspectionStatusBadge';

interface InspectionHeaderProps {
    inspection: InspectionType;
}

export default function InspectionHeader({ inspection }: InspectionHeaderProps) {
    const navigate = useNavigate();



    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'baixa': return 'bg-green-100 text-green-800';
            case 'media': return 'bg-yellow-100 text-yellow-800';
            case 'alta': return 'bg-orange-100 text-orange-800';
            case 'critica': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button
                onClick={() => navigate('/inspections')}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
                <h1 className="font-heading text-3xl font-bold text-slate-900">
                    {inspection.title}
                </h1>
                <p className="text-slate-600 mt-1">Detalhes da inspeção</p>
            </div>
            <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(inspection.priority)}`}>
                    {inspection.priority.charAt(0).toUpperCase() + inspection.priority.slice(1)}
                </span>
                <InspectionStatusBadge status={inspection.status} size="md" />
            </div>
        </div>
    );
}
