// ATA Preview and Editor Component
// Shows the generated ATA with options to edit, validate, download, and fill checklist

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    FileText,
    Download,
    CheckCircle,
    ClipboardList,
    Edit,
    Save,
    Loader2,
    AlertTriangle,
    Clock,
    MapPin,
    User,
    Calendar,
    RefreshCw,
    X
} from 'lucide-react';
import { useATADocument } from '@/react-app/hooks/useATADocument';
import { ATA } from '@/services/ataService';
import { cn } from '@/lib/utils';

interface ATAPreviewProps {
    ataId: number;
    inspectionId: number;
    isOpen: boolean;
    onClose: () => void;
    inspectionData?: {
        items: Array<{ id: number; title: string; description?: string; category?: string }>;
        info: {
            project_name?: string;
            location?: string;
            inspector_name?: string;
            scheduled_date?: string;
            id?: number;
        };
    };
    onChecklistUpdate?: (updates: Array<{ item_id: number; status: string; observation: string }>) => void;
}

export function ATAPreview({
    ataId,
    inspectionId,
    isOpen,
    onClose,
    inspectionData,
    onChecklistUpdate
}: ATAPreviewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedSummary, setEditedSummary] = useState('');
    const [editedTranscript, setEditedTranscript] = useState('');

    const {
        ata,
        isProcessing,
        isGeneratingDoc,
        generateResult,
        error,
        loadATA,
        generateATA,
        updateATA,
        validateATA,
        fillChecklist,
        downloadDoc
    } = useATADocument({
        inspectionId,
        inspectionData,
        onChecklistUpdate
    });

    // Load ATA when dialog opens
    useEffect(() => {
        if (isOpen && ataId) {
            loadATA(ataId);
        }
    }, [isOpen, ataId, loadATA]);

    // Initialize edit fields when ATA loads
    useEffect(() => {
        if (ata) {
            setEditedSummary(ata.summary || '');
            setEditedTranscript(ata.transcript || '');
        }
    }, [ata]);

    const handleGenerateATA = async () => {
        await generateATA(ataId);
    };

    const handleSaveEdit = async () => {
        await updateATA({
            summary: editedSummary,
            transcript: editedTranscript
        });
        setIsEditing(false);
    };

    const handleValidate = async () => {
        await validateATA();
    };

    const handleFillChecklist = async () => {
        await fillChecklist();
    };

    const handleDownload = async () => {
        await downloadDoc();
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}min ${secs}s`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'validated':
                return <Badge className="bg-green-100 text-green-700">Validada</Badge>;
            case 'draft':
                return <Badge className="bg-blue-100 text-blue-700">Rascunho</Badge>;
            case 'processing':
                return <Badge className="bg-yellow-100 text-yellow-700">Processando</Badge>;
            case 'recording':
                return <Badge className="bg-red-100 text-red-700">Gravando</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Count statistics
    const stats = ata?.identified_items ? {
        total: ata.identified_items.length,
        conformes: ata.identified_items.filter(i => i.status === 'C').length,
        naoConformes: ata.identified_items.filter(i => i.status === 'NC').length,
        naoAplicaveis: ata.identified_items.filter(i => i.status === 'NA').length
    } : { total: 0, conformes: 0, naoConformes: 0, naoAplicaveis: 0 };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-primary" />
                            <div>
                                <DialogTitle className="text-xl">
                                    ATA da Inspeção #{inspectionId}
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-2 mt-1">
                                    {ata && getStatusBadge(ata.status)}
                                    {ata && (
                                        <span className="text-muted-foreground">
                                            • {formatDuration(ata.total_duration_seconds)}
                                        </span>
                                    )}
                                </DialogDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Loading / Processing state */}
                {isProcessing && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <h3 className="text-lg font-semibold">Processando ATA...</h3>
                        <p className="text-muted-foreground mt-2">
                            A IA está transcrevendo o áudio e gerando a ATA.
                            Isso pode levar alguns minutos.
                        </p>
                    </div>
                )}

                {/* Error state */}
                {error && !isProcessing && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-red-700">Erro ao processar ATA</h3>
                        <p className="text-muted-foreground mt-2 text-center max-w-md">
                            {error}
                        </p>
                        <Button onClick={handleGenerateATA} className="mt-4 gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {/* Need to generate state */}
                {ata && ata.status === 'recording' && !isProcessing && !error && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">ATA pronta para processamento</h3>
                        <p className="text-muted-foreground mt-2 text-center max-w-md">
                            A gravação foi finalizada. Clique no botão abaixo para
                            gerar a transcrição e o resumo da ATA.
                        </p>
                        <Button onClick={handleGenerateATA} className="mt-4 gap-2">
                            <Loader2 className="h-4 w-4" />
                            Processar ATA
                        </Button>
                    </div>
                )}

                {/* Content when ATA is ready */}
                {ata && (ata.status === 'draft' || ata.status === 'validated') && !isProcessing && (
                    <ScrollArea className="flex-1 pr-4">
                        <Tabs defaultValue="summary" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="summary">Resumo</TabsTrigger>
                                <TabsTrigger value="transcript">Transcrição</TabsTrigger>
                                <TabsTrigger value="items">
                                    Itens ({stats.total})
                                </TabsTrigger>
                            </TabsList>

                            {/* Summary Tab */}
                            <TabsContent value="summary" className="space-y-4 mt-4">
                                {/* Info cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <Card>
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                Data
                                            </div>
                                            <div className="font-medium mt-1">
                                                {inspectionData?.info?.scheduled_date ||
                                                    new Date(ata.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                Duração
                                            </div>
                                            <div className="font-medium mt-1">
                                                {formatDuration(ata.total_duration_seconds)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-4 w-4" />
                                                Local
                                            </div>
                                            <div className="font-medium mt-1 truncate">
                                                {inspectionData?.info?.location || 'Não informado'}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <User className="h-4 w-4" />
                                                Inspetor
                                            </div>
                                            <div className="font-medium mt-1 truncate">
                                                {inspectionData?.info?.inspector_name || 'Não informado'}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Statistics */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Resultado Geral</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                                <span className="text-sm">
                                                    Conformes: <strong>{stats.conformes}</strong>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                                <span className="text-sm">
                                                    Não Conformes: <strong>{stats.naoConformes}</strong>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-gray-400" />
                                                <span className="text-sm">
                                                    N/A: <strong>{stats.naoAplicaveis}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Summary text */}
                                <Card>
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm">Resumo Executivo</CardTitle>
                                        {ata.status === 'draft' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsEditing(!isEditing)}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                {isEditing ? 'Cancelar' : 'Editar'}
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {isEditing ? (
                                            <Textarea
                                                value={editedSummary}
                                                onChange={(e) => setEditedSummary(e.target.value)}
                                                rows={6}
                                                className="resize-none"
                                            />
                                        ) : (
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                {ata.summary || 'Resumo não disponível.'}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Transcript Tab */}
                            <TabsContent value="transcript" className="mt-4">
                                <Card>
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm">Transcrição Completa</CardTitle>
                                        {ata.status === 'draft' && !isEditing && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsEditing(true)}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Editar
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {isEditing ? (
                                            <Textarea
                                                value={editedTranscript}
                                                onChange={(e) => setEditedTranscript(e.target.value)}
                                                rows={15}
                                                className="resize-none font-mono text-sm"
                                            />
                                        ) : (
                                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                                                {ata.transcript || 'Transcrição não disponível.'}
                                            </pre>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Items Tab */}
                            <TabsContent value="items" className="mt-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Itens Identificados</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {ata.identified_items && ata.identified_items.length > 0 ? (
                                            <div className="space-y-3">
                                                {ata.identified_items.map((item, index) => (
                                                    <div
                                                        key={index}
                                                        className={cn(
                                                            "p-3 rounded-lg border",
                                                            item.status === 'NC' && "border-red-200 bg-red-50",
                                                            item.status === 'C' && "border-green-200 bg-green-50",
                                                            item.status === 'NA' && "border-gray-200 bg-gray-50"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="font-medium text-sm">
                                                                    Item #{item.item_id}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {item.observation}
                                                                </p>
                                                            </div>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    item.status === 'NC' && "bg-red-100 text-red-700",
                                                                    item.status === 'C' && "bg-green-100 text-green-700",
                                                                    item.status === 'NA' && "bg-gray-100 text-gray-700"
                                                                )}
                                                            >
                                                                {item.status === 'C' ? 'Conforme' :
                                                                 item.status === 'NC' ? 'Não Conforme' :
                                                                 'N/A'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                Nenhum item identificado na ATA.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>
                )}

                {/* Footer actions */}
                {ata && (ata.status === 'draft' || ata.status === 'validated') && !isProcessing && (
                    <DialogFooter className="flex-shrink-0 border-t pt-4">
                        <div className="flex w-full justify-between">
                            <div className="flex gap-2">
                                {isEditing && (
                                    <Button onClick={handleSaveEdit} className="gap-2">
                                        <Save className="h-4 w-4" />
                                        Salvar alterações
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {ata.status === 'draft' && !isEditing && (
                                    <Button
                                        variant="outline"
                                        onClick={handleValidate}
                                        className="gap-2"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Validar ATA
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={handleDownload}
                                    disabled={isGeneratingDoc}
                                    className="gap-2"
                                >
                                    {isGeneratingDoc ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    Baixar .DOC
                                </Button>
                                {stats.total > 0 && (
                                    <Button
                                        onClick={handleFillChecklist}
                                        className="gap-2"
                                    >
                                        <ClipboardList className="h-4 w-4" />
                                        Preencher Checklist
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default ATAPreview;
