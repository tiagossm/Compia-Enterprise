import { Building2, MapPin, Navigation, User, Calendar } from 'lucide-react';
import { InspectionType } from '@/shared/types';

interface InspectionInfoCardsProps {
    inspection: InspectionType;
}

export default function InspectionInfoCards({ inspection }: InspectionInfoCardsProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {inspection.company_name && (
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-sm text-slate-500">Empresa</p>
                            <p className="font-medium text-slate-900">{inspection.company_name}</p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                        <p className="text-sm text-slate-500">Local</p>
                        <p className="font-medium text-slate-900">{inspection.location}</p>
                        {inspection.address && (
                            <p className="text-sm text-slate-500">{inspection.address}</p>
                        )}
                    </div>
                </div>
                {(inspection.latitude && inspection.longitude) && (
                    <div className="flex items-center gap-3">
                        <Navigation className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-sm text-slate-500">Coordenadas GPS</p>
                            <p className="font-medium text-slate-900 text-xs">
                                {Number(inspection.latitude).toFixed(6)}, {Number(inspection.longitude).toFixed(6)}
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    {inspection.inspector_avatar_url ? (
                        <img src={inspection.inspector_avatar_url} alt={inspection.inspector_name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <User className="w-5 h-5 text-slate-400" />
                        </div>
                    )}
                    <div>
                        <p className="text-sm text-slate-500">Inspetor</p>
                        <p className="font-medium text-slate-900">{inspection.inspector_name}</p>
                        {inspection.inspector_email && (
                            <p className="text-sm text-slate-500">{inspection.inspector_email}</p>
                        )}
                    </div>
                </div>
                {inspection.scheduled_date && (
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-sm text-slate-500">Data Agendada</p>
                            <p className="font-medium text-slate-900">
                                {new Date(inspection.scheduled_date).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                )}
                {inspection.cep && (
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-sm text-slate-500">CEP</p>
                            <p className="font-medium text-slate-900">{inspection.cep}</p>
                        </div>
                    </div>
                )}
            </div>
            {inspection.description && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-500 mb-2">Descrição</p>
                    <p className="text-slate-700">{inspection.description}</p>
                </div>
            )}
        </div>
    );
}
