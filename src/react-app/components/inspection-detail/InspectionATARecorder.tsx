// ATA Recording Component
// Allows continuous audio recording with pause/resume functionality

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Mic,
    MicOff,
    Pause,
    Play,
    Square,
    Trash2,
    FileText,
    ChevronDown,
    ChevronUp,
    Save,
    Loader2,
    AlertCircle
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useATARecording } from '@/react-app/hooks/useATARecording';
import { cn } from '@/lib/utils';

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
            <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        ATA da Inspeção
                        <Badge variant="outline" className="ml-auto bg-green-100 text-green-700">
                            {ata.status === 'validated' ? 'Validada' :
                             ata.status === 'draft' ? 'Rascunho' :
                             ata.status === 'processing' ? 'Processando' : 'Gravando'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Duração: {formatDuration(ata.total_duration_seconds)}
                            {ata.validated_at && (
                                <span className="ml-2">
                                    • Validada em {new Date(ata.validated_at).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleViewATA}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver ATA
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Minimized state while recording
    if (isMinimized && isRecording) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-3 h-3 rounded-full",
                                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                            )} />
                            <span className="font-medium">
                                {isPaused ? 'ATA Pausada' : 'Gravando ATA'}
                            </span>
                            <span className="text-muted-foreground">
                                {formatDuration(totalDuration)}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMinimized(false)}
                        >
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className={cn(
                "transition-colors",
                isRecording && !isPaused && "border-red-200 bg-red-50",
                isPaused && "border-yellow-200 bg-yellow-50",
                !isRecording && !ata && "border-dashed"
            )}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Mic className={cn(
                                "h-5 w-5",
                                isRecording && !isPaused && "text-red-500",
                                isPaused && "text-yellow-500"
                            )} />
                            ATA da Inspeção
                        </CardTitle>
                        {isRecording && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(true)}
                            >
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-100 p-2 rounded">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {/* Not recording state */}
                    {!isRecording && !ata && (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                Grave toda a inspeção em um único áudio contínuo.
                                A IA irá transcrever e gerar a ATA automaticamente.
                            </p>
                            <Button onClick={startRecording} className="gap-2">
                                <Mic className="h-4 w-4" />
                                Iniciar Gravação da ATA
                            </Button>
                        </div>
                    )}

                    {/* Recording state */}
                    {isRecording && (
                        <>
                            {/* Status and timer */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-3 h-3 rounded-full",
                                        isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                                    )} />
                                    <span className="text-2xl font-mono font-bold">
                                        {formatDuration(totalDuration)}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
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
                                <span className="text-muted-foreground">Segmentos:</span>
                                <div className="flex gap-1">
                                    {segments.map((seg, idx) => (
                                        <Badge
                                            key={seg.id}
                                            variant="outline"
                                            className="bg-green-100 text-green-700"
                                        >
                                            {idx + 1} ✓
                                        </Badge>
                                    ))}
                                    {isRecording && (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                isPaused
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-red-100 text-red-700"
                                            )}
                                        >
                                            {currentSegment} {isPaused ? '⏸' : '🔴'}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Control buttons */}
                            <div className="flex items-center justify-center gap-3">
                                {/* Pause/Resume button */}
                                {isPaused ? (
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={resumeRecording}
                                        className="gap-2"
                                    >
                                        <Play className="h-5 w-5" />
                                        Continuar
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={pauseRecording}
                                        className="gap-2"
                                    >
                                        <Pause className="h-5 w-5" />
                                        Pausar
                                    </Button>
                                )}

                                {/* Finalize button */}
                                <Button
                                    variant="default"
                                    size="lg"
                                    onClick={handleFinalize}
                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                >
                                    <Square className="h-5 w-5" />
                                    Finalizar
                                </Button>

                                {/* Discard button */}
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={() => setShowDiscardDialog(true)}
                                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-100"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Warning for long recordings */}
                            {totalDuration >= 30 * 60 && (
                                <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded text-center">
                                    ⚠️ Gravação longa. Considere finalizar em breve.
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Discard confirmation dialog */}
            <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Descartar gravação?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todos os segmentos de áudio
                            gravados serão permanentemente excluídos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDiscard}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Descartar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default InspectionATARecorder;
