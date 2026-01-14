import { Image as ImageIcon, Map } from 'lucide-react';
import MediaUpload from '@/react-app/components/MediaUpload';
import { InspectionMediaType } from '@/shared/types';

interface InspectionMediaSectionProps {
    media: InspectionMediaType[];
    inspectionId: number;
    inspectionTitle: string;
    handleMediaUploaded: (newMedia: any) => Promise<void> | void;
    handleMediaDeleted: (mediaId: number) => Promise<void> | void;
    onOpenHeatmap: () => void;
}

export default function InspectionMediaSection({
    media,
    inspectionId,
    inspectionTitle,
    handleMediaUploaded,
    handleMediaDeleted,
    onOpenHeatmap
}: InspectionMediaSectionProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-slate-600" />
                    <h2 className="font-heading text-xl font-semibold text-slate-900">
                        Mídias da Inspeção
                    </h2>
                </div>
                {/* Botão Mapa de Calor - só mostra se existirem mídias com GPS */}
                {media.some(m => m.latitude && m.longitude) && (
                    <button
                        onClick={onOpenHeatmap}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-orange-600 transition-all shadow-sm"
                        title="Ver mapa de calor com localizações das fotos"
                    >
                        <Map className="w-4 h-4" />
                        Mapa de Calor
                        <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                            {media.filter(m => m.latitude && m.longitude).length}
                        </span>
                    </button>
                )}
            </div>
            <MediaUpload
                inspectionId={inspectionId}
                onMediaUploaded={handleMediaUploaded}
                existingMedia={media}
                onMediaDeleted={handleMediaDeleted}
                inspectionTitle={inspectionTitle}
            />
        </div>
    );
}
