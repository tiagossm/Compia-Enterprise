// ATA Preview and Editor Component
// Shows the generated ATA with options to edit, validate, download, and fill checklist

import { useState, useEffect } from 'react';
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
import DialogWrapper from '@/react-app/components/DialogWrapper';
import { useATADocument } from '@/react-app/hooks/useATADocument';

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
    onChecklistUpdate?: (updates: Array<{ item_id: number; status: string; observation: string; item_title?: string; confidence?: number }>) => void;
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
    const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'items'>('summary');

    const {
        ata,
        isProcessing,
        isGeneratingDoc,
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
        const styles: Record<string, string> = {
            validated: 'bg-green-100 text-green-700',
            draft: 'bg-blue-100 text-blue-700',
            processing: 'bg-yellow-100 text-yellow-700',
            recording: 'bg-red-100 text-red-700'
        };
        const labels: Record<string, string> = {
            validated: 'Validada',
            draft: 'Rascunho',
            processing: 'Processando',
            recording: 'Gravando'
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
                {labels[status] || status}
            </span>
        );
    };

    // Count statistics
    const stats = ata?.identified_items ? {
        total: ata.identified_items.length,
        conformes: ata.identified_items.filter(i => i.status === 'C').length,
        naoConformes: ata.identified_items.filter(i => i.status === 'NC').length,
        naoAplicaveis: ata.identified_items.filter(i => i.status === 'NA').length
    } : { total: 0, conformes: 0, naoConformes: 0, naoAplicaveis: 0 };

    if (!isOpen) return null;

    return (
        <DialogWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={`ATA da Inspeção #${inspectionId}`}
            maxWidth="max-w-4xl"
        >
            <div className="flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-semibold">ATA da Inspeção #{inspectionId}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                {ata && getStatusBadge(ata.status)}
                                {ata && (
                                    <span className="text-sm text-gray-600">
                                        • {formatDuration(ata.total_duration_seconds)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {/* Loading / Processing state */}
                    {isProcessing && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                            <h3 className="text-lg font-semibold">Processando ATA...</h3>
                            <p className="text-gray-600 mt-2">
                                A IA está transcrevendo o áudio e gerando a ATA.
                                Isso pode levar alguns minutos.
                            </p>
                        </div>
                    )}

                    {/* Error state */}
                    {error && !isProcessing && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                            <h3 className="text-lg font-semibold text-red-700">Erro ao processar ATA</h3>
                            <p className="text-gray-600 mt-2 text-center max-w-md">
                                {error}
                            </p>
                            <button
                                onClick={handleGenerateATA}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {/* Need to generate state */}
                    {ata && ata.status === 'recording' && !isProcessing && !error && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <FileText className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold">ATA pronta para processamento</h3>
                            <p className="text-gray-600 mt-2 text-center max-w-md">
                                A gravação foi finalizada. Clique no botão abaixo para
                                gerar a transcrição e o resumo da ATA.
                            </p>
                            <button
                                onClick={handleGenerateATA}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Loader2 className="h-4 w-4" />
                                Processar ATA
                            </button>
                        </div>
                    )}

                    {/* Content when ATA is ready */}
                    {ata && (ata.status === 'draft' || ata.status === 'validated') && !isProcessing && (
                        <div>
                            {/* Tabs */}
                            <div className="flex border-b mb-4">
                                <button
                                    onClick={() => setActiveTab('summary')}
                                    className={`px-4 py-2 border-b-2 font-medium text-sm ${
                                        activeTab === 'summary'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Resumo
                                </button>
                                <button
                                    onClick={() => setActiveTab('transcript')}
                                    className={`px-4 py-2 border-b-2 font-medium text-sm ${
                                        activeTab === 'transcript'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Transcrição
                                </button>
                                <button
                                    onClick={() => setActiveTab('items')}
                                    className={`px-4 py-2 border-b-2 font-medium text-sm ${
                                        activeTab === 'items'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Itens ({stats.total})
                                </button>
                            </div>

                            {/* Summary Tab */}
                            {activeTab === 'summary' && (
                                <div className="space-y-4">
                                    {/* Info cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="h-4 w-4" />
                                                Data
                                            </div>
                                            <div className="font-medium mt-1">
                                                {inspectionData?.info?.scheduled_date ||
                                                    new Date(ata.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                        <div className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Clock className="h-4 w-4" />
                                                Duração
                                            </div>
                                            <div className="font-medium mt-1">
                                                {formatDuration(ata.total_duration_seconds)}
                                            </div>
                                        </div>
                                        <div className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <MapPin className="h-4 w-4" />
                                                Local
                                            </div>
                                            <div className="font-medium mt-1 truncate">
                                                {inspectionData?.info?.location || 'Não informado'}
                                            </div>
                                        </div>
                                        <div className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <User className="h-4 w-4" />
                                                Inspetor
                                            </div>
                                            <div className="font-medium mt-1 truncate">
                                                {inspectionData?.info?.inspector_name || 'Não informado'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Statistics */}
                                    <div className="border rounded-lg p-4">
                                        <h3 className="text-sm font-medium mb-3">Resultado Geral</h3>
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
                                    </div>

                                    {/* Summary text */}
                                    <div className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-medium">Resumo Executivo</h3>
                                            {ata.status === 'draft' && (
                                                <button
                                                    onClick={() => setIsEditing(!isEditing)}
                                                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    {isEditing ? 'Cancelar' : 'Editar'}
                                                </button>
                                            )}
                                        </div>
                                        {isEditing ? (
                                            <textarea
                                                value={editedSummary}
                                                onChange={(e) => setEditedSummary(e.target.value)}
                                                rows={6}
                                                className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                                {ata.summary || 'Resumo não disponível.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Transcript Tab */}
                            {activeTab === 'transcript' && (
                                <div className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-medium">Transcrição Completa</h3>
                                        {ata.status === 'draft' && !isEditing && (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                                            >
                                                <Edit className="h-4 w-4" />
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <textarea
                                            value={editedTranscript}
                                            onChange={(e) => setEditedTranscript(e.target.value)}
                                            rows={15}
                                            className="w-full p-3 border rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg max-h-96 overflow-auto">
                                            {ata.transcript || 'Transcrição não disponível.'}
                                        </pre>
                                    )}
                                </div>
                            )}

                            {/* Items Tab */}
                            {activeTab === 'items' && (
                                <div className="border rounded-lg p-4">
                                    <h3 className="text-sm font-medium mb-3">Itens Identificados</h3>
                                    {ata.identified_items && ata.identified_items.length > 0 ? (
                                        <div className="space-y-3">
                                            {ata.identified_items.map((item, index) => {
                                                const ctxItem = inspectionData?.items?.find(i => i.id === item.item_id);
                                                const title = item.item_title || ctxItem?.title || ctxItem?.description || '';
                                                const confidence = typeof item.confidence === 'number' ? item.confidence : null;

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`p-3 rounded-lg border ${
                                                            item.status === 'NC' ? 'border-red-200 bg-red-50' :
                                                            item.status === 'C' ? 'border-green-200 bg-green-50' :
                                                            'border-gray-200 bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="font-medium text-sm">
                                                                    Item #{item.item_id}{title ? ` — ${title}` : ''}
                                                                </div>
                                                                {confidence !== null && (
                                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                                        Confiança: {(confidence * 100).toFixed(0)}%
                                                                    </div>
                                                                )}
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {item.observation}
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={`px-2 py-1 text-xs rounded-full ${
                                                                    item.status === 'NC' ? 'bg-red-100 text-red-700' :
                                                                    item.status === 'C' ? 'bg-green-100 text-green-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                                }`}
                                                            >
                                                                {item.status === 'C' ? 'Conforme' :
                                                                    item.status === 'NC' ? 'Não Conforme' :
                                                                        'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600 text-center py-8">
                                            Nenhum item identificado na ATA.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                {ata && (ata.status === 'draft' || ata.status === 'validated') && !isProcessing && (
                    <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                        <div>
                            {isEditing && (
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Save className="h-4 w-4" />
                                    Salvar alterações
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {ata.status === 'draft' && !isEditing && (
                                <button
                                    onClick={handleValidate}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Validar ATA
                                </button>
                            )}
                            <button
                                onClick={handleDownload}
                                disabled={isGeneratingDoc}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                            >
                                {isGeneratingDoc ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                Baixar .DOC
                            </button>
                            {stats.total > 0 && (
                                <button
                                    onClick={handleFillChecklist}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    Preencher Checklist
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DialogWrapper>
    );
}

export default ATAPreview;
