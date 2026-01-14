import { useState, useRef, useEffect } from 'react';
import {
    Camera,
    Mic,
    Paperclip,
    Sparkles,
    Zap,
    RotateCw,
    X,
    FileText,
    Bot,
    RefreshCw,
    Trash2,
    Image,
    FileAudio,
    Square,
    ThumbsUp,
    ThumbsDown,
    Minus,
    ChevronDown,
    Edit3,
    ExternalLink,
    EyeOff,
    Eye,
    Download,
    FileSpreadsheet,
    File,
    MapPin
} from 'lucide-react';
import { InspectionMediaType } from '@/shared/types';
import { ComplianceMode } from '@/shared/checklist-types';

type ComplianceStatus = 'compliant' | 'non_compliant' | 'not_applicable' | 'unanswered';

interface InspectionItemProps {
    item: {
        id: number;
        description: string;
        category?: string;
        response?: string;
        comment?: string;
        aiAnalysis?: string;
        field_type?: string;
    };
    media: InspectionMediaType[];
    // Configuração de conformidade
    complianceEnabled?: boolean;
    complianceMode?: ComplianceMode;
    complianceStatus?: ComplianceStatus;
    onComplianceChange?: (status: ComplianceStatus) => void;
    onCommentChange: (value: string) => void;
    isUploading?: boolean;
    onMediaUpload: (type: 'image' | 'audio' | 'video' | 'file', source?: 'camera' | 'upload') => void;
    onMediaDelete?: (mediaId: number) => void;
    onAiAnalysisRequest: (selectedMediaIds: number[]) => void;
    onAiAnalysisUpdate?: (analysis: string | null) => void;
    onAiActionPlanRequest: (selectedMediaIds: number[]) => void;
    onManualActionSave?: (actionData: ManualActionData) => void;
    onActionPlanEdit?: (actionPlan: any) => void;
    onActionPlanDelete?: (actionPlanId: number) => void;
    actionPlan?: any;
    isAiAnalyzing?: boolean;
    isCreatingAction?: boolean;
    isRecording?: boolean;
    recordingTime?: number;
    index?: number;
    children?: React.ReactNode;
}

interface ManualActionData {
    title: string;
    priority: 'baixa' | 'media' | 'alta';
    what_description?: string;
}

export default function InspectionItem({
    item,
    media,
    complianceStatus,
    onComplianceChange,
    onCommentChange,
    isUploading = false,
    onMediaUpload,
    onMediaDelete,
    onAiAnalysisRequest,
    onAiAnalysisUpdate,
    onAiActionPlanRequest,
    onManualActionSave,
    onActionPlanEdit,
    onActionPlanDelete,
    actionPlan,
    isAiAnalyzing = false,
    isCreatingAction = false,
    isRecording = false,
    recordingTime = 0,
    index,
    children
}: InspectionItemProps) {
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [showActionForm, setShowActionForm] = useState(false);
    const [actionMode, setActionMode] = useState<'manual' | 'ai'>('manual');
    const [selectedAiMedia,] = useState<number[]>([]);
    const [viewingImage, setViewingImage] = useState<{ url: string; index: number } | null>(null);
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [showActionPlanExpanded, setShowActionPlanExpanded] = useState(false);

    const [hideActionPlan, setHideActionPlan] = useState(false);
    const [editedFields, setEditedFields] = useState<Partial<any>>({});
    const [editingAnalysis, setEditingAnalysis] = useState(false);
    const [tempAnalysis, setTempAnalysis] = useState('');

    // Synchronized priority state
    const [currentPriority, setCurrentPriority] = useState(actionPlan?.priority || 'media');

    // Context flags for 5W2H AI generation
    const [contextFlags, setContextFlags] = useState({
        useResponse: true,
        useObservation: true,
        useAiAnalysis: false
    });

    // Sync priority when actionPlan changes
    useEffect(() => {
        if (actionPlan?.priority) {
            setCurrentPriority(editedFields.priority || actionPlan.priority);
        }
    }, [actionPlan?.priority, editedFields.priority]);

    const [manualAction, setManualAction] = useState<ManualActionData>({
        title: '',
        priority: 'media',
        what_description: ''
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    useEffect(() => adjustTextareaHeight(), [item.comment]);

    useEffect(() => {
        const handleClickOutside = () => {
            setShowPhotoMenu(false);
            setShowAudioMenu(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Helper to get document icon based on file extension
    const getDocIcon = (fileName: string) => {
        const ext = fileName?.split('.').pop()?.toLowerCase() || '';
        switch (ext) {
            case 'pdf':
                return <FileText size={14} className="text-red-500" />;
            case 'doc':
            case 'docx':
                return <FileText size={14} className="text-blue-500" />;
            case 'xls':
            case 'xlsx':
            case 'csv':
                return <FileSpreadsheet size={14} className="text-green-500" />;
            case 'ppt':
            case 'pptx':
                return <File size={14} className="text-orange-500" />;
            case 'txt':
                return <FileText size={14} className="text-slate-500" />;
            default:
                return <File size={14} className="text-slate-400" />;
        }
    };

    // Download file helper
    const downloadFile = (url: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleManualActionSubmit = () => {
        if (manualAction.title.trim() && onManualActionSave) {
            onManualActionSave(manualAction);
            setManualAction({ title: '', priority: 'media', what_description: '' });
            setShowActionForm(false);
        }
    };

    const handleToggleAi = () => {
        if (!isAiOpen) setShowActionForm(false);
        setIsAiOpen(!isAiOpen);
    };

    const handleToggleAction = () => {
        if (!showActionForm) setIsAiOpen(false);
        setShowActionForm(!showActionForm);
    };

    const isImage = (m: InspectionMediaType) => m.media_type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(m.file_name || '');
    const imageMedia = media.filter(isImage);
    const audioMedia = media.filter(m => m.media_type === 'audio');
    const docMedia = media.filter(m => !isImage(m) && m.media_type !== 'audio');

    return (
        <div className="py-3 px-2 border-b border-slate-100 last:border-0">
            {/* Header */}
            <div className="mb-2">
                {item.category && (
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">
                        {item.category}
                    </span>
                )}
                <h3 className="text-sm font-medium text-slate-800 leading-snug">
                    {index !== undefined && <span className="text-slate-400 mr-1">{index + 1}.</span>}
                    {item.description}
                </h3>
            </div>

            {/* Response */}
            <div className="mb-2">{children}</div>

            {/* Compliance Status Selector - híbrido por tipo de campo */}
            {/* TIPOS AUTOMÁTICOS (não mostra seletor): boolean, checkbox */}
            {/* TIPOS MANUAL (mostra seletor): text, textarea, file, select, radio, multiselect, number, rating */}
            {/* TIPOS N/A (não mostra seletor): date, time */}
            {onComplianceChange &&
                !['date', 'time', 'boolean', 'checkbox'].includes(item.field_type || '') && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs text-slate-500">
                            Avaliação
                            {['text', 'textarea', 'file'].includes(item.field_type || '') ? ' (manual)' : ''}
                            :
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => onComplianceChange('compliant')}
                                title="Conforme"
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all ${complianceStatus === 'compliant'
                                    ? 'bg-green-600 border-green-600 text-white font-medium'
                                    : 'border-slate-200 text-slate-500 hover:border-green-300 hover:bg-green-50'
                                    }`}
                            >
                                <ThumbsUp size={12} />
                                <span>C</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onComplianceChange('non_compliant')}
                                title="Não Conforme"
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all ${complianceStatus === 'non_compliant'
                                    ? 'bg-red-600 border-red-600 text-white font-medium'
                                    : 'border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50'
                                    }`}
                            >
                                <ThumbsDown size={12} />
                                <span>NC</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onComplianceChange('not_applicable')}
                                title="Não Aplicável"
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all ${complianceStatus === 'not_applicable'
                                    ? 'bg-slate-600 border-slate-600 text-white font-medium'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <Minus size={12} />
                                <span>N/A</span>
                            </button>
                        </div>
                    </div>
                )}

            {/* Observation */}
            <textarea
                ref={textareaRef}
                value={item.comment || ''}
                onChange={(e) => { onCommentChange(e.target.value); adjustTextareaHeight(); }}
                placeholder="Observação..."
                rows={1}
                className="w-full py-1 text-slate-600 text-xs placeholder:text-slate-400 border-none focus:ring-0 resize-none bg-transparent"
            />

            {/* Media Previews - Compact */}
            {media.length > 0 && (
                <div className="mb-2 space-y-1.5">
                    {/* Images */}
                    {imageMedia.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {/* Removed redundant counter label */}
                            {imageMedia.map((m, idx) => (
                                <div key={m.id} className="relative group flex flex-col items-center">
                                    {/* Image thumbnail - 40x40 */}
                                    <div
                                        className={`w-10 h-10 rounded border cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow
                                            ${selectedAiMedia.includes(m.id!) ? 'border-blue-500 ring-1 ring-blue-300' : 'border-slate-200'}`}
                                        onClick={() => setViewingImage({ url: m.file_url, index: idx })}
                                    >
                                        <img src={m.file_url} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    {/* GPS Coordinates - show if available */}
                                    {m.latitude && m.longitude && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${m.latitude},${m.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-0.5 text-[8px] text-blue-500 hover:underline mt-0.5 max-w-[60px] truncate"
                                            title={`GPS: ${Number(m.latitude).toFixed(6)}, ${Number(m.longitude).toFixed(6)}`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MapPin size={8} className="flex-shrink-0" />
                                            <span className="truncate">{Number(m.latitude).toFixed(4)}</span>
                                        </a>
                                    )}
                                    {/* Delete Button - hidden until hover */}
                                    {onMediaDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if (m.id) onMediaDelete(m.id); }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Excluir"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Audio - Native player */}
                    {audioMedia.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {audioMedia.map((m) => (
                                <div key={m.id} className="relative group flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-white border-slate-200 min-w-[180px]">
                                    {/* Delete button - hidden until hover */}
                                    {onMediaDelete && (
                                        <button
                                            onClick={() => { if (m.id) onMediaDelete(m.id); }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Excluir"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                    <Mic size={14} className="text-slate-400 flex-shrink-0" />
                                    <audio controls src={m.file_url} className="h-7 w-full" style={{ maxWidth: '150px' }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Documents - Compact inline */}
                    {docMedia.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {/* Removed redundant counter label */}
                            {docMedia.map((m) => (
                                <div
                                    key={m.id}
                                    className="relative group flex items-center gap-1.5 px-2 py-1 rounded border bg-white border-slate-200 hover:border-slate-300"
                                >
                                    {/* Icon by type */}
                                    {getDocIcon(m.file_name || '')}

                                    {/* Filename - truncated */}
                                    <span className="truncate text-[10px] text-slate-600 max-w-[120px]" title={m.file_name}>
                                        {m.file_name || 'Documento'}
                                    </span>

                                    {/* Download */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); downloadFile(m.file_url, m.file_name || 'download'); }}
                                        className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                        title="Baixar"
                                    >
                                        <Download size={12} />
                                    </button>

                                    {/* Delete - hidden until hover */}
                                    {onMediaDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if (m.id) onMediaDelete(m.id); }}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Excluir"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Compact Toolbar */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-0.5">
                    {/* Photo */}
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowPhotoMenu(!showPhotoMenu); setShowAudioMenu(false); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                            <Camera size={16} />
                            {/* Badge para quantidade de fotos */}
                            {imageMedia.length > 0 && (
                                <span className={`absolute -top-1 -right-1 text-[9px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-1 ${imageMedia.length >= 20 ? 'bg-red-500 text-white' :
                                    imageMedia.length >= 10 ? 'bg-amber-500 text-white' :
                                        'bg-slate-400 text-white'
                                    }`}>
                                    {imageMedia.length}
                                </span>
                            )}
                        </button>
                        {showPhotoMenu && (
                            <div className="absolute top-full left-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg py-0.5 z-20 min-w-[160px]">
                                {/* Aviso de limite - só mostra a partir de 10 fotos */}
                                {imageMedia.length >= 20 ? (
                                    <div className="px-2 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
                                        <span className="font-medium">⛔ Limite atingido</span>
                                        <p className="text-[10px] mt-0.5">Máximo de 20 fotos por pergunta</p>
                                    </div>
                                ) : imageMedia.length >= 10 ? (
                                    <div className="px-2 py-1.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
                                        <span className="font-medium">⚠️ {imageMedia.length}/20 fotos</span>
                                        <p className="text-[10px]">Pode impactar o relatório PDF</p>
                                    </div>
                                ) : null}

                                {/* Botões de ação - desabilitados se >= 20 */}
                                <button
                                    onClick={() => { if (imageMedia.length < 20) { onMediaUpload('image', 'camera'); setShowPhotoMenu(false); } }}
                                    disabled={imageMedia.length >= 20}
                                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-xs ${imageMedia.length >= 20 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <Camera size={12} /> Câmera
                                </button>
                                <button
                                    onClick={() => { if (imageMedia.length < 20) { onMediaUpload('image', 'upload'); setShowPhotoMenu(false); } }}
                                    disabled={imageMedia.length >= 20}
                                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-xs ${imageMedia.length >= 20 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <Image size={12} /> Upload
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Audio */}
                    <div className="relative">
                        {isRecording ? (
                            <button
                                onClick={() => onMediaUpload('audio', 'camera')}
                                disabled={isUploading}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isUploading ? 'bg-slate-300 cursor-not-allowed' : 'bg-red-500 text-white'}`}
                            >
                                {isUploading ? (
                                    <>
                                        <RotateCw size={10} className="animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Square size={10} />
                                        <span>{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (audioMedia.length >= 4) return;
                                        setShowAudioMenu(!showAudioMenu);
                                        setShowPhotoMenu(false);
                                    }}
                                    disabled={isUploading}
                                    className={`p-1.5 rounded relative ${isUploading ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Mic size={16} />
                                    {/* Badge for audio count */}
                                    {audioMedia.length > 0 && (
                                        <span className={`absolute -top-1 -right-1 text-[9px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-1 ${audioMedia.length >= 4 ? 'bg-red-500 text-white' : 'bg-slate-400 text-white'
                                            }`}>
                                            {audioMedia.length}
                                        </span>
                                    )}
                                </button>
                                {showAudioMenu && (
                                    <div className="absolute top-full left-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg py-0.5 z-20 min-w-[120px]">
                                        {audioMedia.length >= 4 ? (
                                            <div className="px-2 py-1.5 text-xs text-red-600 bg-red-50 border-b border-red-100">
                                                <span className="font-medium">⛔ Max 4 áudios</span>
                                            </div>
                                        ) : null}
                                        <button
                                            onClick={() => { if (audioMedia.length < 4) { onMediaUpload('audio', 'camera'); setShowAudioMenu(false); } }}
                                            disabled={audioMedia.length >= 4}
                                            className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-xs ${audioMedia.length >= 4 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <Mic size={12} /> Gravar
                                        </button>
                                        <button
                                            onClick={() => { if (audioMedia.length < 4) { onMediaUpload('audio', 'upload'); setShowAudioMenu(false); } }}
                                            disabled={audioMedia.length >= 4}
                                            className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-xs ${audioMedia.length >= 4 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <FileAudio size={12} /> Upload
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Document */}
                    <div className="relative">
                        <button
                            onClick={() => { if (docMedia.length < 4) onMediaUpload('file', 'upload'); }}
                            disabled={isUploading || docMedia.length >= 4}
                            className={`p-1.5 rounded relative ${isUploading || docMedia.length >= 4 ? 'text-slate-300' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                            title={docMedia.length >= 4 ? 'Limite de 4 documentos atingido' : 'Anexar documento'}
                        >
                            <Paperclip size={16} />
                            {/* Badge for doc count */}
                            {docMedia.length > 0 && (
                                <span className={`absolute -top-1 -right-1 text-[9px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-1 ${docMedia.length >= 4 ? 'bg-red-500 text-white' : 'bg-slate-400 text-white'
                                    }`}>
                                    {docMedia.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={handleToggleAction} className={`relative flex items-center gap-1 px-2 py-1 rounded text-xs ${showActionForm ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Zap size={12} />
                        <span className="hidden sm:inline">Ação</span>
                        {actionPlan && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-1 bg-amber-500 text-white shadow-sm border border-white">
                                1
                            </span>
                        )}
                    </button>
                    <button onClick={handleToggleAi} className={`relative flex items-center gap-1 px-2 py-1 rounded text-xs ${isAiOpen ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Sparkles size={12} />
                        <span>IA</span>
                        {item.aiAnalysis && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-1 bg-purple-600 text-white shadow-sm border border-white">
                                1
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Action Form - Ultra Compact Inline */}
            {showActionForm && (
                <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    {/* Header inline with tabs */}
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200 bg-white">
                        <div className="flex items-center gap-1">
                            <Zap size={10} className="text-amber-500" />
                            <span className="text-[10px] font-medium text-slate-600">Nova Ação</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setActionMode('manual')}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${actionMode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                Manual
                            </button>
                            <button
                                onClick={() => setActionMode('ai')}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${actionMode === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                5W2H IA
                            </button>
                            <button onClick={() => setShowActionForm(false)} className="ml-1 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                                <X size={10} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-2">
                        {actionMode === 'manual' ? (
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={manualAction.title}
                                    onChange={(e) => setManualAction(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="O que fazer?"
                                    className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                <select
                                    value={manualAction.priority}
                                    onChange={(e) => setManualAction(prev => ({ ...prev, priority: e.target.value as any }))}
                                    className="px-1.5 py-1 bg-white border border-slate-200 rounded text-[10px] w-16"
                                >
                                    <option value="baixa">Baixa</option>
                                    <option value="media">Média</option>
                                    <option value="alta">Alta</option>
                                </select>
                                <button
                                    onClick={handleManualActionSubmit}
                                    disabled={!manualAction.title.trim()}
                                    className="px-2 py-1 bg-slate-700 text-white text-[10px] rounded disabled:opacity-50 hover:bg-slate-800"
                                >
                                    Salvar
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Context flags */}
                                <div className="flex flex-wrap items-center gap-3 text-[10px]">
                                    <span className="text-slate-500">Contexto:</span>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={contextFlags.useResponse}
                                            onChange={(e) => setContextFlags(prev => ({ ...prev, useResponse: e.target.checked }))}
                                            className="w-3 h-3 rounded border-slate-300"
                                        />
                                        <span className="text-slate-600">Resposta</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={contextFlags.useObservation}
                                            onChange={(e) => setContextFlags(prev => ({ ...prev, useObservation: e.target.checked }))}
                                            className="w-3 h-3 rounded border-slate-300"
                                        />
                                        <span className="text-slate-600">Observação</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={contextFlags.useAiAnalysis}
                                            onChange={(e) => setContextFlags(prev => ({ ...prev, useAiAnalysis: e.target.checked }))}
                                            className="w-3 h-3 rounded border-slate-300"
                                        />
                                        <span className="text-slate-600">Análise IA</span>
                                    </label>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => onAiActionPlanRequest([])}
                                        disabled={isCreatingAction}
                                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-[10px] rounded disabled:opacity-50 hover:bg-blue-700"
                                    >
                                        {isCreatingAction ? <RotateCw size={10} className="animate-spin" /> : <Bot size={10} />}
                                        {isCreatingAction ? 'Gerando...' : 'Gerar 5W2H'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Panel - Compact */}
            {isAiOpen && (
                <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Sparkles size={10} /> Análise IA
                        </span>
                        {item.aiAnalysis && !editingAnalysis && onAiAnalysisUpdate && (
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                <button
                                    onClick={() => onAiAnalysisRequest && onAiAnalysisRequest(media.map(m => m.id!))}
                                    className="text-slate-500 hover:text-blue-600 transition-colors"
                                    title="Gerar Novamente"
                                >
                                    <RefreshCw size={14} />
                                </button>
                                <div className="w-px h-3 bg-slate-200" />
                                <button
                                    onClick={() => { setTempAnalysis(item.aiAnalysis || ''); setEditingAnalysis(true); }}
                                    className="text-slate-500 hover:text-indigo-600 transition-colors"
                                    title="Editar Texto"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <div className="w-px h-3 bg-slate-200" />
                                <button
                                    onClick={() => { if (confirm('Excluir análise?')) onAiAnalysisUpdate(null); }}
                                    className="text-slate-500 hover:text-red-600 transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {isAiAnalyzing ? (
                        <div className="flex items-center gap-1 py-2 text-xs text-slate-600"><RotateCw size={12} className="animate-spin" /> Analisando...</div>
                    ) : editingAnalysis ? (
                        <div className="space-y-2">
                            <textarea
                                value={tempAnalysis}
                                onChange={(e) => setTempAnalysis(e.target.value)}
                                className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none resize-none bg-white"
                                rows={4}
                                placeholder="Edite a análise IA..."
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingAnalysis(false)} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
                                <button onClick={() => { if (onAiAnalysisUpdate) onAiAnalysisUpdate(tempAnalysis); setEditingAnalysis(false); }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                            </div>
                        </div>
                    ) : item.aiAnalysis ? (
                        <div className="bg-white rounded p-1.5 text-xs text-slate-700 whitespace-pre-line border border-slate-100">{item.aiAnalysis}</div>
                    ) : (
                        <div>
                            <p className="text-[10px] text-slate-500 mb-1">
                                {selectedAiMedia.length > 0
                                    ? `${selectedAiMedia.length} mídia(s) selecionada(s)`
                                    : 'Analisa a resposta (selecione mídias para incluí-las)'}
                            </p>
                            <button onClick={() => onAiAnalysisRequest(selectedAiMedia)} className="w-full py-1.5 bg-slate-700 text-white text-xs rounded hover:bg-slate-800 flex items-center justify-center gap-1">
                                <Sparkles size={12} /> Analisar com IA
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Show hidden action plan indicator */}
            {actionPlan && hideActionPlan && (
                <div className="mt-2 flex items-center gap-1">
                    <button
                        onClick={() => setHideActionPlan(false)}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                        <Eye size={10} />
                        Mostrar plano de ação
                    </button>
                </div>
            )}

            {/* Action Plan Inline Display - Compact & Minimal */}
            {actionPlan && !hideActionPlan && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                    {/* Header compacto */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowActionPlanExpanded(!showActionPlanExpanded)}
                            className="flex items-center gap-1.5 flex-1 text-left text-xs text-slate-600 hover:text-slate-800"
                        >
                            <Zap size={12} className="text-amber-500" />
                            <span className="font-medium truncate">{actionPlan.title || 'Plano de Ação'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${currentPriority === 'alta' || currentPriority === 'critica' ? 'bg-red-100 text-red-700' :
                                currentPriority === 'media' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {currentPriority?.toUpperCase() || 'MÉDIA'}
                            </span>
                            <ChevronDown size={12} className={`transition-transform ${showActionPlanExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Action buttons - always visible */}
                        <div className="flex items-center gap-0.5">
                            {onActionPlanEdit && (
                                <button
                                    onClick={() => onActionPlanEdit(actionPlan)}
                                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                    title="Editar"
                                >
                                    <Edit3 size={12} />
                                </button>
                            )}
                            <a
                                href={`/action-plans${actionPlan.id ? `?highlight=${actionPlan.id}` : ''}`}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                title="Ver na página de Planos"
                            >
                                <ExternalLink size={12} />
                            </a>
                            <button
                                onClick={() => setHideActionPlan(true)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                title="Ocultar"
                            >
                                <EyeOff size={12} />
                            </button>
                            {onActionPlanDelete && actionPlan.id && (
                                <button
                                    onClick={() => {
                                        if (confirm('Excluir este plano de ação?')) {
                                            onActionPlanDelete(actionPlan.id);
                                        }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    title="Excluir"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Expanded content - All editable, neutral colors */}
                    {showActionPlanExpanded && (
                        <div className="mt-2 pl-3 text-[11px] space-y-2 text-slate-600 border-l-2 border-slate-200">
                            {/* Reference to question */}
                            <div className="text-[10px] text-slate-400 italic">
                                Ref: {index !== undefined ? `#${index + 1} - ` : ''}{item.description}
                            </div>

                            {/* Status indicator */}
                            {actionPlan.status === 'suggested' && (
                                <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded text-[10px]">
                                    <Zap size={10} />
                                    <span>Sugestão IA - edite os campos conforme necessário</span>
                                </div>
                            )}

                            {/* Editable: What */}
                            <div className="space-y-0.5">
                                <label className="text-slate-500 font-medium">O quê:</label>
                                <textarea
                                    defaultValue={actionPlan.what_description || editedFields.what_description || ''}
                                    onChange={(e) => setEditedFields(prev => ({ ...prev, what_description: e.target.value }))}
                                    placeholder="Descreva a ação necessária..."
                                    rows={2}
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-slate-400 outline-none resize-none"
                                />
                            </div>

                            {/* Editable: Why */}
                            <div className="space-y-0.5">
                                <label className="text-slate-500 font-medium">Por quê:</label>
                                <textarea
                                    defaultValue={actionPlan.why_reason || actionPlan.why_description || editedFields.why_reason || ''}
                                    onChange={(e) => setEditedFields(prev => ({ ...prev, why_reason: e.target.value }))}
                                    placeholder="Justificativa da ação..."
                                    rows={2}
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-slate-400 outline-none resize-none"
                                />
                            </div>

                            {/* Editable: Where (read-only, from location) */}
                            <div className="flex items-center gap-2">
                                <label className="text-slate-500 font-medium w-12">Onde:</label>
                                <span className="text-slate-600">{actionPlan.where_location || actionPlan.where_description || 'Não especificado'}</span>
                            </div>

                            {/* Editable: When */}
                            <div className="flex items-center gap-2">
                                <label className="text-slate-500 font-medium w-12">Quando:</label>
                                <input
                                    type="date"
                                    defaultValue={actionPlan.when_deadline || editedFields.when_deadline || ''}
                                    onChange={(e) => setEditedFields(prev => ({ ...prev, when_deadline: e.target.value }))}
                                    className="px-2 py-1 border border-slate-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-slate-400 outline-none"
                                />
                            </div>

                            {/* Editable: Who */}
                            <div className="flex items-center gap-2">
                                <label className="text-slate-500 font-medium w-12">Quem:</label>
                                <input
                                    type="text"
                                    defaultValue={actionPlan.who_responsible || editedFields.who_responsible || ''}
                                    onChange={(e) => setEditedFields(prev => ({ ...prev, who_responsible: e.target.value }))}
                                    placeholder="Responsável pela ação"
                                    className="flex-1 px-2 py-1 border border-slate-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-slate-400 outline-none"
                                />
                            </div>

                            {/* Editable: How */}
                            <div className="space-y-0.5">
                                <label className="text-slate-500 font-medium">Como:</label>
                                <textarea
                                    defaultValue={actionPlan.how_method || actionPlan.how_description || editedFields.how_method || ''}
                                    onChange={(e) => setEditedFields(prev => ({ ...prev, how_method: e.target.value }))}
                                    placeholder="Método de execução..."
                                    rows={2}
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-slate-400 outline-none resize-none"
                                />
                            </div>

                            {/* Editable: How much */}
                            <div className="flex items-center gap-2">
                                <label className="text-slate-500 font-medium w-12">Quanto:</label>
                                <input
                                    type="text"
                                    defaultValue={actionPlan.how_much_cost || editedFields.how_much_cost || ''}
                                    onChange={(e) => setEditedFields(prev => ({ ...prev, how_much_cost: e.target.value }))}
                                    placeholder="Custo estimado"
                                    className="w-32 px-2 py-1 border border-slate-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-slate-400 outline-none"
                                />
                            </div>

                            {/* Editable: Priority */}
                            <div className="flex items-center gap-2">
                                <label className="text-slate-500 font-medium w-12">Prioridade:</label>
                                <select
                                    value={currentPriority}
                                    onChange={(e) => {
                                        setCurrentPriority(e.target.value);
                                        setEditedFields(prev => ({ ...prev, priority: e.target.value }));
                                    }}
                                    className="px-2 py-1 border border-slate-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-slate-400 outline-none"
                                >
                                    <option value="baixa">Baixa</option>
                                    <option value="media">Média</option>
                                    <option value="alta">Alta</option>
                                    <option value="critica">Crítica</option>
                                </select>
                            </div>

                            {/* Save button when fields edited */}
                            {Object.keys(editedFields).length > 0 && (
                                <div className="pt-2 flex gap-2">
                                    <button
                                        onClick={() => {
                                            // TODO: Implement save API call
                                            console.log('Save edited fields:', editedFields);
                                            setEditedFields({});
                                        }}
                                        className="px-3 py-1 bg-slate-700 text-white text-[10px] rounded hover:bg-slate-800"
                                    >
                                        Salvar alterações
                                    </button>
                                    <button
                                        onClick={() => setEditedFields({})}
                                        className="px-3 py-1 border border-slate-300 text-slate-600 text-[10px] rounded hover:bg-slate-50"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            {/* Status badge */}
                            <div className="pt-1 flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] ${actionPlan.status === 'suggested' ? 'bg-slate-100 text-slate-600' :
                                    actionPlan.status === 'pending' ? 'bg-slate-100 text-slate-600' :
                                        actionPlan.status === 'in_progress' ? 'bg-slate-200 text-slate-700' :
                                            'bg-slate-300 text-slate-800'
                                    }`}>
                                    {actionPlan.status === 'suggested' ? '⚡ Sugestão' :
                                        actionPlan.status === 'pending' ? 'Pendente' :
                                            actionPlan.status === 'in_progress' ? 'Em Andamento' :
                                                actionPlan.status === 'completed' ? 'Concluído' : actionPlan.status || 'Pendente'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Image Viewer Modal */}
            {viewingImage && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setViewingImage(null)}>
                    <button
                        onClick={() => setViewingImage(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                    >
                        <X size={24} />
                    </button>

                    {/* Navigation */}
                    {imageMedia.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const prev = viewingImage.index === 0 ? imageMedia.length - 1 : viewingImage.index - 1;
                                    setViewingImage({ url: imageMedia[prev].file_url, index: prev });
                                }}
                                className="absolute left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                            >
                                ←
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const next = viewingImage.index === imageMedia.length - 1 ? 0 : viewingImage.index + 1;
                                    setViewingImage({ url: imageMedia[next].file_url, index: next });
                                }}
                                className="absolute right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                            >
                                →
                            </button>
                        </>
                    )}

                    <img
                        src={viewingImage.url}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        alt=""
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                        {viewingImage.index + 1} / {imageMedia.length}
                    </div>
                </div>
            )}
        </div>
    );
}
