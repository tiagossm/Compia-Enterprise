// ATA Recording Component
// Allows continuous audio recording with pause/resume functionality

import { useState } from 'react';
import {
    Mic,
    Pause,
    Play,
    Square,
    Trash2,
    FileText,
    ChevronDown,
    ChevronUp,
    Save,
    AlertCircle
} from 'lucide-react';
import { useATARecording } from '@/react-app/hooks/useATARecording';
import ConfirmDialog from '@/react-app/components/ConfirmDialog';

interface InspectionATARecorderProps {
    inspectionId: number;
    organizationId: number;
    onATAReady?: (ataId: number) => void;
    onViewATA?: (ataId: number) => void;
}

export function InspectionATARecorder({
    inspectionId,
    organizationId,
    onATAReady,
    onViewATA
}: InspectionATARecorderProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const {
        ata,
        isRecording,
        isPaused,
        currentSegment,
        totalDuration,
        lastSaved,
        hasUnsavedData,
        segments,
        error,
        startRecording,
        pauseRecording,
        resumeRecording,
        finalizeRecording,
        discardRecording,
        formatDuration
    } = useATARecording({ inspectionId, organizationId });

    const handleFinalize = async () => {
        const finalizedATA = await finalizeRecording();
        if (finalizedATA && onATAReady) {
            onATAReady(finalizedATA.id);
        }
    };

    const handleDiscard = async () => {
        await discardRecording();
        setShowDiscardDialog(false);
    };

    const handleViewATA = () => {
        if (ata && onViewATA) {
            onViewATA(ata.id);
        }
    };

    // If ATA exists and is not recording, show view button
    if (ata && !isRecording && ata.status !== 'recording') {
        return (
            <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">ATA da Inspeção</h3>
                    <span className="ml-auto px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        {ata.status === 'validated' ? 'Validada' :
                         ata.status === 'draft' ? 'Rascunho' :
                         ata.status === 'processing' ? 'Processando' : 'Gravando'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Duração: {formatDuration(ata.total_duration_seconds)}
                        {ata.validated_at && (
                            <span className="ml-2">
                                • Validada em {new Date(ata.validated_at).toLocaleDateString('pt-BR')}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleViewATA}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <FileText className="h-4 w-4" />
                        Ver ATA
                    </button>
                </div>
            </div>
        );
    }

    // Minimized state while recording
    if (isMinimized && isRecording) {
        return (
            <div className="border border-red-200 bg-red-50 rounded-xl p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"}`} />
                        <span className="font-medium">
                            {isPaused ? 'ATA Pausada' : 'Gravando ATA'}
                        </span>
                        <span className="text-gray-600">
                            {formatDuration(totalDuration)}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="p-1 hover:bg-red-100 rounded"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    // Determine card style
    let cardClasses = "border rounded-xl p-4 transition-colors";
    if (isRecording && !isPaused) {
        cardClasses += " border-red-200 bg-red-50";
    } else if (isPaused) {
        cardClasses += " border-yellow-200 bg-yellow-50";
    } else if (!isRecording && !ata) {
        cardClasses += " border-dashed border-gray-300";
    } else {
        cardClasses += " border-gray-200";
    }

    return (
        <>
            <div className={cardClasses}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Mic className={`h-5 w-5 ${
                            isRecording && !isPaused ? "text-red-500" :
                            isPaused ? "text-yellow-500" : "text-gray-500"
                        }`} />
                        <h3 className="font-medium">ATA da Inspeção</h3>
                    </div>
                    {isRecording && (
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-100 p-2 rounded">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {/* Not recording state */}
                    {!isRecording && (!ata || ata.status === 'recording') && (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Grave toda a inspeção em um único áudio contínuo.
                                A IA irá transcrever e gerar a ATA automaticamente.
                            </p>
                            {ata?.status === 'recording' && (
                                <p className="text-xs text-yellow-700 bg-yellow-100 inline-block px-3 py-1 rounded mb-3">
                                    Existe uma ATA em status “gravando” que não foi finalizada. Você pode continuar a gravação ou descartar.
                                </p>
                            )}
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={startRecording}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Mic className="h-4 w-4" />
                                    {ata?.status === 'recording' ? 'Continuar Gravação da ATA' : 'Iniciar Gravação da ATA'}
                                </button>
                                {ata?.status === 'recording' && (
                                    <button
                                        onClick={() => setShowDiscardDialog(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Descartar
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recording state */}
                    {isRecording && (
                        <>
                            {/* Status and timer */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"}`} />
                                    <span className="text-2xl font-mono font-bold">
                                        {formatDuration(totalDuration)}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {lastSaved ? (
                                        <span className="flex items-center gap-1">
                                            <Save className="h-3 w-3" />
                                            Salvo há {Math.floor((Date.now() - lastSaved.getTime()) / 1000)}s
                                        </span>
                                    ) : hasUnsavedData ? (
                                        <span className="text-yellow-600">Salvando...</span>
                                    ) : null}
                                </div>
                            </div>

                            {/* Segments indicator */}
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-600">Segmentos:</span>
                                <div className="flex gap-1">
                                    {segments.map((seg, idx) => (
                                        <span
                                            key={seg.id}
                                            className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"
                                        >
                                            {idx + 1} ✓
                                        </span>
                                    ))}
                                    {isRecording && (
                                        <span
                                            className={`px-2 py-0.5 text-xs rounded-full ${
                                                isPaused
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                            {currentSegment} {isPaused ? '⏸' : '🔴'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Control buttons */}
                            <div className="flex items-center justify-center gap-3">
                                {/* Pause/Resume button */}
                                {isPaused ? (
                                    <button
                                        onClick={resumeRecording}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        <Play className="h-5 w-5" />
                                        Continuar
                                    </button>
                                ) : (
                                    <button
                                        onClick={pauseRecording}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        <Pause className="h-5 w-5" />
                                        Pausar
                                    </button>
                                )}

                                {/* Finalize button */}
                                <button
                                    onClick={handleFinalize}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <Square className="h-5 w-5" />
                                    Finalizar
                                </button>

                                {/* Discard button */}
                                <button
                                    onClick={() => setShowDiscardDialog(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-100 rounded-lg"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Warning for long recordings */}
                            {totalDuration >= 30 * 60 && (
                                <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded text-center">
                                    ⚠️ Gravação longa. Considere finalizar em breve.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Discard confirmation dialog */}
            <ConfirmDialog
                isOpen={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                onConfirm={handleDiscard}
                title="Descartar gravação?"
                message="Esta ação não pode ser desfeita. Todos os segmentos de áudio gravados serão permanentemente excluídos."
                confirmText="Descartar"
                cancelText="Cancelar"
                variant="danger"
            />
        </>
    );
}

export default InspectionATARecorder;
