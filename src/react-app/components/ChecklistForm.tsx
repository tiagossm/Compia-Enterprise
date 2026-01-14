import { useState, useRef, useEffect, useCallback } from 'react';
import { ChecklistField, FieldResponse } from '@/shared/checklist-types';
import { calculateAutoCompliance } from '@/shared/compliance-utils';
import { useMediaHandling } from '@/react-app/hooks/useMediaHandling';
import { fetchWithAuth } from '@/react-app/utils/auth';
import InspectionList from './InspectionList';
import InspectionItem from './InspectionItem';
import CameraModal from './CameraModal';
import AIContextSelectionModal, { MediaItem } from './AIContextSelectionModal';
import {
  Star, Upload, CheckCircle, ThumbsUp, ThumbsDown, Save, Loader2
} from 'lucide-react';

interface ChecklistFormProps {
  fields: ChecklistField[];
  onSubmit: (responses: FieldResponse[]) => void;
  initialValues?: Record<number, any>;
  readonly?: boolean;
  inspectionId?: number;
  inspectionItems?: any[];
  initialMedia?: Record<number, any[]>; // Media grouped by field.id
  onAutoSave?: (responses: Record<string, any>, comments: Record<string, any>, complianceStatuses?: Record<string, any>) => Promise<void>;
  onSaveSuccess?: () => void;
  showComplianceSelector?: boolean;
  onUpdateAiAnalysis?: (itemId: number, analysis: string | null) => Promise<void>;
}

export default function ChecklistForm({
  fields,
  onSubmit,
  initialValues = {},
  inspectionId,
  initialMedia = {},
  showComplianceSelector = true,
  onAutoSave,
  onUpdateAiAnalysis
}: ChecklistFormProps) {

  // Debug log - Mount only
  useEffect(() => {
    console.log('[CHECKLIST] ChecklistForm MOUNTED', {
      fieldsCount: fields.length,
      hasOnAutoSave: !!onAutoSave
    });

    // Check render count
    return () => console.log('[CHECKLIST] ChecklistForm UNMOUNTED');
  }, []);

  // State
  const [responses, setResponses] = useState<Record<number, any>>(initialValues);
  const [itemsComments, setItemsComments] = useState<Record<number, string>>({});
  const [complianceStatuses, setComplianceStatuses] = useState<Record<number, string>>({});
  const [itemsMedia, setItemsMedia] = useState<Record<number, any[]>>(initialMedia);
  const [generatingResponse, setGeneratingResponse] = useState<Record<number, boolean>>({});
  const [itemsAnalysis, setItemsAnalysis] = useState<Record<number, string>>({});
  const [creatingAction, setCreatingAction] = useState<Record<number, boolean>>({});
  const [itemsActionPlan, setItemsActionPlan] = useState<Record<number, any>>({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // State for AI Context Selection
  const [contextSelection, setContextSelection] = useState<{
    isOpen: boolean;
    fieldId: number | null;
    media: MediaItem[];
    itemName: string;
  }>({ isOpen: false, fieldId: null, media: [], itemName: '' });

  // Initialize state from fields (responses, comments, compliance status, and AI analysis)
  // Track previous inspection ID to prevent state reset on auto-save updates
  const prevInspectionIdRef = useRef<number | undefined>(undefined);

  // Initialize state from fields (responses, comments, compliance status, and AI analysis)
  useEffect(() => {
    // Only re-initialize if inspectionId changes (navigation) or if it's the first mount.
    // We ignore updates to 'initialValues' alone because they often come from our own auto-save,
    // and resetting state would overwrite user input that happened during the save (race condition).
    const currentId = inspectionId || 0;
    if (prevInspectionIdRef.current !== undefined && prevInspectionIdRef.current === currentId) {
      return;
    }
    prevInspectionIdRef.current = currentId;

    const initResponses: Record<number, any> = {};
    const initComments: Record<number, string> = {};
    const initStatuses: Record<number, string> = {};
    const initAnalysis: Record<number, string> = {};

    fields.forEach(field => {
      if (!field.id) return;

      // Initialize response
      if (initialValues[field.id] !== undefined) {
        initResponses[field.id] = initialValues[field.id];
      } else if (field.initial_value !== undefined) {
        initResponses[field.id] = field.initial_value;
      }

      // Initialize comments
      if (field.initial_comment) {
        initComments[field.id] = field.initial_comment;
      }

      // Initialize compliance status
      if (field.initial_compliance_status) {
        initStatuses[field.id] = field.initial_compliance_status;
      }

      // Initialize AI Analysis
      if (field.initial_ai_analysis) {
        initAnalysis[field.id] = field.initial_ai_analysis;
      }
    });

    setResponses(initResponses);
    setItemsComments(initComments);
    setComplianceStatuses(initStatuses);
    setItemsAnalysis(initAnalysis);
  }, [fields, initialValues, inspectionId]);

  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Media Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeMediaFieldId = useRef<number | null>(null);
  const activeMediaType = useRef<string>('image');

  // Debounced auto-save function
  const triggerAutoSave = useCallback((newResponses: Record<number, any>, newComments: Record<number, string>, newStatuses: Record<number, any>) => {
    console.log('[CHECKLIST] triggerAutoSave called', {
      hasOnAutoSave: !!onAutoSave,
      autoSaveEnabled,
      responsesCount: Object.keys(newResponses).length
    });

    if (!onAutoSave || !autoSaveEnabled) {
      console.log('[CHECKLIST] Auto-save skipped:', { hasOnAutoSave: !!onAutoSave, autoSaveEnabled });
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce: wait 500ms before saving
    saveTimeoutRef.current = setTimeout(async () => {
      console.log('[CHECKLIST] Executing auto-save...');
      setSaveStatus('saving');
      try {
        await onAutoSave(newResponses, newComments, newStatuses);
        console.log('[CHECKLIST] Auto-save success!');
        setSaveStatus('saved');
        setLastSaveTime(new Date());
        // Reset to idle after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('[CHECKLIST] Auto-save failed:', error);
        setSaveStatus('idle');
      }
    }, 500);
  }, [onAutoSave, autoSaveEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const updateResponse = (fieldId: number, value: any) => {
    console.log('[CHECKLIST] updateResponse called', { fieldId, value });
    const field = fields.find(f => f.id === fieldId);

    setResponses(prev => {
      const next = { ...prev, [fieldId]: value };

      // Calcular conformidade automaticamente se o campo tiver modo 'auto'
      if (field && field.compliance_enabled !== false && field.compliance_mode !== 'manual') {
        const autoStatus = calculateAutoCompliance(field, value);
        if (autoStatus) {
          setComplianceStatuses(prevStatus => {
            const nextStatus = { ...prevStatus, [fieldId]: autoStatus };
            triggerAutoSave(next, itemsComments, nextStatus);
            return nextStatus;
          });
          return next;
        }
      }

      triggerAutoSave(next, itemsComments, complianceStatuses);
      return next;
    });
  };

  const updateComment = (fieldId: number, comment: string) => {
    setItemsComments(prev => {
      const next = { ...prev, [fieldId]: comment };
      triggerAutoSave(responses, next, complianceStatuses);
      return next;
    });
  };

  const updateComplianceStatus = (fieldId: number, status: string) => {
    setComplianceStatuses(prev => {
      const next = { ...prev, [fieldId]: status };
      triggerAutoSave(responses, itemsComments, next);
      return next;
    });
  };

  // --- Media Logic ---
  const { uploadFile, startAudioRecording, stopRecording, recording, recordingTime, uploading } = useMediaHandling({
    inspectionId: inspectionId || 0,
    onMediaUploaded: (media) => {
      const fieldId = activeMediaFieldId.current;
      if (fieldId) {
        setItemsMedia(prev => ({
          ...prev,
          [fieldId]: [...(prev[fieldId] || []), media]
        }));
      }
    }
  });

  const handleMediaRequest = async (fieldId: number, type: 'image' | 'audio' | 'video' | 'file', source?: 'camera' | 'upload') => {
    activeMediaFieldId.current = fieldId;
    activeMediaType.current = type;

    if (type === 'image') {
      if (source === 'camera') {
        setIsCameraOpen(true);
      } else {
        if (fileInputRef.current) {
          fileInputRef.current.accept = 'image/*';
          fileInputRef.current.removeAttribute('capture');
          fileInputRef.current.click();
        }
      }
    } else if (type === 'audio') {
      if (source === 'camera') {
        if (recording === 'audio') {
          // Stop recording and upload the blob
          const blob = await stopRecording();
          if (blob && fieldId) {
            const audioFile = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
            await uploadFile(audioFile, fieldId, 'audio');
          }
        } else {
          activeMediaFieldId.current = fieldId;
          await startAudioRecording();
        }
      } else {
        if (fileInputRef.current) {
          fileInputRef.current.accept = 'audio/*';
          fileInputRef.current.removeAttribute('capture');
          fileInputRef.current.click();
        }
      }
    } else if (type === 'file') {
      if (fileInputRef.current) {
        fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
        fileInputRef.current.removeAttribute('capture');
        fileInputRef.current.click();
      }
    } else if (type === 'video') {
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'video/*';
        fileInputRef.current.removeAttribute('capture');
        fileInputRef.current.click();
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const fieldId = activeMediaFieldId.current;
    const type = activeMediaType.current;

    if (files && files.length > 0 && fieldId && type) {
      const currentMedia = itemsMedia[fieldId] || [];

      // Calculate current count based on type logic from InspectionItem
      const currentCount = currentMedia.filter(m => {
        if (type === 'image') return m.media_type === 'image';
        if (type === 'audio') return m.media_type === 'audio';
        if (type === 'file' || type === 'document') return m.media_type === 'file' || m.media_type === 'document';
        return false;
      }).length;

      const maxLimit = type === 'image' ? 20 : 4;

      // Convert FileList to Array and slice to fit remaining slots
      const filesArray = Array.from(files);
      const remainingSlots = Math.max(0, maxLimit - currentCount);
      const itemsToUpload = filesArray.slice(0, remainingSlots);

      if (itemsToUpload.length < filesArray.length) {
        alert(`Limite de upload atingido (${maxLimit}). Apenas ${itemsToUpload.length} arquivo(s) serão enviados.`);
      }

      if (itemsToUpload.length > 0) {
        // Sequentially upload to prevent browser overload
        for (const file of itemsToUpload) {
          // Force type 'document' to be 'file' for API consistency if needed, but 'file' type handles both in frontend filter
          await uploadFile(file, fieldId, type as any);
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMediaDelete = async (fieldId: number, mediaId: number) => {
    try {
      const response = await fetchWithAuth(`/api/media/${inspectionId}/media/${mediaId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setItemsMedia(prev => ({
          ...prev,
          [fieldId]: (prev[fieldId] || []).filter(m => m.id !== mediaId)
        }));
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Erro ao excluir mídia');
      }
    } catch (error) {
      console.error('Delete media error:', error);
      alert('Erro ao excluir mídia');
    }
  };

  // --- AI Logic ---
  const handleAiAnalysisRequest = async (fieldId: number, mediaIds: number[] = []) => {
    if (!fieldId) return;
    setGeneratingResponse(prev => ({ ...prev, [fieldId]: true }));

    try {
      const currentMedia = itemsMedia[fieldId] || [];
      const relevantMedia = mediaIds.length > 0
        ? currentMedia.filter(m => m.id && mediaIds.includes(m.id))
        : currentMedia;

      const mediaData = relevantMedia.map(m => ({
        file_url: m.file_url,
        media_type: m.media_type,
        file_name: m.file_name
      }));

      const response = await fetchWithAuth(`/api/inspection-items/${fieldId}/pre-analysis`, {
        method: 'POST',
        body: JSON.stringify({
          inspection_id: inspectionId,
          field_name: fields.find(f => f.id === fieldId)?.field_name || '',
          response_value: responses[fieldId] || '',
          media_data: mediaData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setItemsAnalysis(prev => ({ ...prev, [fieldId]: data.pre_analysis || data.analysis || 'Análise concluída.' }));
        if (onUpdateAiAnalysis) {
          onUpdateAiAnalysis(fieldId, data.pre_analysis || data.analysis || 'Análise concluída.');
        }
        console.log('[AI-USAGE] ✅ Analysis generated. Full Response:', JSON.stringify(data));
        console.log('[AI-USAGE] Usage increment flag:', data.ai_usage_incremented);
        window.dispatchEvent(new Event('ai_usage_updated'));
      } else {
        console.error("AI Analysis failed", response.statusText);
        alert("Erro ao gerar análise IA. Tente novamente.");
      }
    } catch (error) {
      console.error("AI Error", error);
      alert("Erro de conexão ao gerar análise.");
    } finally {
      setGeneratingResponse(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  // --- AI UX Handler ---
  const startAiAnalysis = (fieldId: number) => {
    const media = itemsMedia[fieldId] || [];
    if (media.length === 0) {
      // No media, proceed directly (text-only analysis)
      handleAiAnalysisRequest(fieldId);
    } else {
      // Open selection modal
      const fieldName = fields.find(f => f.id === fieldId)?.field_name || '';
      setContextSelection({
        isOpen: true,
        fieldId,
        media: media as MediaItem[], // Cast assuming consistent shape
        itemName: fieldName
      });
    }
  };

  const handleConfirmContext = (selectedIds: number[]) => {
    if (contextSelection.fieldId) {
      handleAiAnalysisRequest(contextSelection.fieldId, selectedIds);
    }
    setContextSelection(prev => ({ ...prev, isOpen: false }));
  };



  const handleAiActionPlanRequest = async (fieldId: number, mediaIds: number[] = []) => {
    if (!fieldId) return;
    setCreatingAction(prev => ({ ...prev, [fieldId]: true }));

    try {
      const currentMedia = itemsMedia[fieldId] || [];
      const relevantMedia = mediaIds.length > 0
        ? currentMedia.filter(m => m.id && mediaIds.includes(m.id))
        : currentMedia;

      const mediaData = relevantMedia.map(m => ({
        file_url: m.file_url,
        media_type: m.media_type,
        file_name: m.file_name
      }));

      const field = fields.find(f => f.id === fieldId);

      const response = await fetchWithAuth(`/api/inspection-items/${fieldId}/create-action`, {
        method: 'POST',
        body: JSON.stringify({
          inspection_id: inspectionId,
          field_name: field?.field_name || '',
          field_type: field?.field_type || 'text',
          response_value: responses[fieldId] || '',
          comment: itemsComments[fieldId] || '',
          compliance_status: complianceStatuses[fieldId] || 'unanswered',
          pre_analysis: itemsAnalysis[fieldId] || null,
          media_data: mediaData
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Store action plan for inline display
        if (data.action_item) {
          setItemsActionPlan(prev => ({ ...prev, [fieldId]: data.action_item }));
        }
        console.log('[AI-USAGE] ✅ 5W2H Action Plan generated. Backend confirmed usage increment:', data.ai_usage_incremented);
        window.dispatchEvent(new Event('ai_usage_updated'));
      } else {
        const err = await response.json().catch(() => ({}));
        console.error("AI Action Plan failed", err);
        alert(err.error || "Erro ao gerar plano 5W2H. Tente novamente.");
      }
    } catch (error) {
      console.error("AI Error", error);
      alert("Erro de conexão ao gerar plano.");
    } finally {
      setCreatingAction(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const handleManualActionSave = async (fieldId: number, actionData: { title: string; priority: string; what_description?: string }) => {
    if (!inspectionId) return;

    try {
      const response = await fetchWithAuth(`/api/inspections/${inspectionId}/action-items`, {
        method: 'POST',
        body: JSON.stringify({
          inspection_id: inspectionId,
          inspection_item_id: fieldId,
          title: actionData.title,
          what_description: actionData.what_description || '',
          priority: actionData.priority,
          status: 'pending',
          is_ai_generated: false
        })
      });

      if (response.ok) {
        alert('✅ Ação manual criada com sucesso!');
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Erro ao criar ação manual.');
      }
    } catch (error) {
      console.error('Manual Action Error', error);
      alert('Erro de conexão.');
    }
  };

  const handleFinalize = () => {
    // Collect responses with compliance status
    const submitData: FieldResponse[] = Object.keys(responses).map(key => {
      const fid = Number(key);
      const field = fields.find(f => f.id === fid);
      if (!field) return null;

      return {
        field_id: fid,
        field_name: field.field_name,
        field_type: field.field_type,
        value: responses[fid],
        comment: itemsComments[fid],
        compliance_status: complianceStatuses[fid] || 'unanswered'
      } as FieldResponse;
    }).filter((item): item is FieldResponse => item !== null);

    onSubmit(submitData);
  };

  const renderInput = (field: ChecklistField) => {
    const value = responses[field.id!];
    const update = (val: any) => updateResponse(field.id!, val);

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={e => update(e.target.value)}
            className="w-full border-b border-slate-200 py-3 text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none bg-transparent transition-colors"
            placeholder="Digite a resposta..."
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={e => {
              update(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            rows={1}
            className="w-full border-b border-slate-200 py-3 text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none bg-transparent transition-colors resize-none overflow-hidden"
            placeholder="Digite a resposta detalhada..."
          />
        );

      case 'select':
      case 'radio': {
        let options: string[] = ['Opção 1', 'Opção 2'];
        if (field.options) {
          try {
            const parsed = JSON.parse(field.options);
            if (Array.isArray(parsed)) options = parsed;
            else options = field.options.split('|').map(s => s.trim());
          } catch {
            options = field.options.split('|').map(s => s.trim());
          }
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => update(opt)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${value === opt ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }

      case 'multiselect':
      case 'checkbox': {
        let options: string[] = ['Opção A', 'Opção B'];
        try {
          if (field.options) {
            try {
              const parsed = JSON.parse(field.options);
              if (Array.isArray(parsed)) options = parsed;
              else options = field.options.split('|').map(s => s.trim());
            } catch {
              options = field.options.split('|').map(s => s.trim());
            }
          }
        } catch (e) { console.error("Error parsing options", e); }
        const currentValues = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : []);

        const toggleOption = (opt: string) => {
          const newValues = currentValues.includes(opt)
            ? currentValues.filter((v: string) => v !== opt)
            : [...currentValues, opt];
          update(newValues);
        };

        return (
          <div className="flex flex-wrap gap-2">
            {options.map(opt => {
              const isActive = currentValues.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  {isActive && <CheckCircle size={12} />}
                  {opt}
                </button>
              );
            })}
          </div>
        );
      }

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={e => update(e.target.value)}
            className="border-b border-slate-200 py-2 px-2 text-slate-800 focus:border-blue-600 focus:outline-none bg-transparent max-w-[160px] cursor-pointer"
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={value || ''}
            onChange={e => update(e.target.value)}
            className="border-b border-slate-200 py-2 px-2 text-slate-800 focus:border-blue-600 focus:outline-none bg-transparent max-w-[120px] cursor-pointer"
          />
        );

      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => update(star)}
                className="p-1 hover:scale-110 transition-transform focus:outline-none"
              >
                <Star
                  size={24}
                  className={`${(Number(value) || 0) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                />
              </button>
            ))}
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
              onClick={() => {
                alert("Upload de arquivo de resposta (Simulação)");
                update("arquivo_simulado.pdf");
              }}
            >
              <Upload size={16} />
              {value ? 'Substituir Arquivo' : 'Carregar Arquivo'}
            </button>
            {value && <span className="text-sm text-blue-600 underline truncate max-w-[200px]">{value}</span>}
          </div>
        );

      case 'boolean':
        return (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${value === true ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-green-300 hover:bg-green-50'}`}
            >
              <ThumbsUp size={14} />
              <span>Conforme</span>
            </button>
            <button
              type="button"
              onClick={() => update(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${value === false ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:bg-red-50'}`}
            >
              <ThumbsDown size={14} />
              <span>Não Conforme</span>
            </button>
          </div>
        );

      default:
        // Default to text if type not recognized
        return (
          <input
            type="text"
            value={value || ''}
            onChange={e => update(e.target.value)}
            className="w-full border-b border-slate-200 py-3 text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none bg-transparent transition-colors"
            placeholder="Digite a resposta..."
          />
        );
    }
  };

  return (
    <>
      {/* Auto-save toggle bar */}
      <div className="flex items-center justify-between mb-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-slate-600">Auto-salvar</span>
        </label>

        {/* Save status indicator - always show last save time */}
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={14} className="animate-spin text-blue-500" />
              <span className="text-blue-500">Salvando...</span>
            </>
          )}
          {saveStatus === 'saved' && lastSaveTime && (
            <>
              <Save size={14} className="text-green-500" />
              <span className="text-green-600">
                Salvo às {lastSaveTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
          {saveStatus === 'idle' && lastSaveTime && autoSaveEnabled && (
            <>
              <Save size={14} className="text-slate-400" />
              <span className="text-slate-500">
                Última alteração: {lastSaveTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
          {saveStatus === 'idle' && !lastSaveTime && autoSaveEnabled && (
            <span className="text-slate-400">Nenhuma alteração</span>
          )}
          {!autoSaveEnabled && (
            <span className="text-amber-500">Auto-save desativado</span>
          )}
        </div>
      </div>

      {/* Hidden File Input for Media Actions */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileChange}
      />

      <InspectionList
        items={fields}
        onFinalize={handleFinalize}
        renderItem={(field, index) => {
          if (!field.id) return null;

          // Construct Item Object for UI
          const itemData = {
            id: field.id,
            description: field.field_name,
            category: 'Geral', // Assuming 'Geral' or a function like getCategoryForField(field) if defined elsewhere
            response: responses[field.id],
            comment: itemsComments[field.id],
            aiAnalysis: itemsAnalysis[field.id],
            field_type: field.field_type
          };

          return (
            <InspectionItem
              key={field.id}
              item={itemData}
              media={itemsMedia[field.id] || []}
              complianceEnabled={field.compliance_enabled !== false}
              complianceMode={field.compliance_mode || 'auto'}
              complianceStatus={complianceStatuses[field.id] as any}
              onComplianceChange={showComplianceSelector ? (status: any) => updateComplianceStatus(field.id!, status) : undefined}
              onCommentChange={(val: string) => updateComment(field.id!, val)}
              isUploading={uploading}
              onMediaUpload={(type: 'image' | 'audio' | 'video' | 'file', source?: 'camera' | 'upload') => handleMediaRequest(field.id!, type, source)}
              onMediaDelete={(mediaId: number) => handleMediaDelete(field.id!, mediaId)}


              onAiAnalysisRequest={() => startAiAnalysis(field.id!)}
              onAiAnalysisUpdate={onUpdateAiAnalysis ? (analysis) => {
                setItemsAnalysis(prev => ({ ...prev, [field.id!]: analysis || '' }));
                onUpdateAiAnalysis(field.id!, analysis);
              } : undefined}
              onAiActionPlanRequest={(ids: number[]) => handleAiActionPlanRequest(field.id!, ids)}
              onManualActionSave={(data: { title: string; priority: string; what_description?: string }) => handleManualActionSave(field.id!, data)}
              actionPlan={itemsActionPlan[field.id] || null}
              isAiAnalyzing={generatingResponse[field.id]}
              isCreatingAction={creatingAction[field.id]}
              isRecording={isCameraOpen === false && activeMediaFieldId.current === field.id && recording === 'audio'}
              recordingTime={recordingTime}
              index={index}
            >
              {renderInput(field)}
            </InspectionItem>
          );
        }}
      />

      {/* Embedded Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(blob, coords) => {
          const fieldId = activeMediaFieldId.current;
          if (fieldId) {
            // Find field metadata for naming
            const fieldIndex = fields.findIndex(f => f.id === fieldId);
            const field = fields[fieldIndex];
            const indexStr = (fieldIndex + 1).toString().padStart(2, '0');

            // Clean strings for filename
            const clean = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_") : 'Item';

            const getCategoryForField = (f: any) => f.category || 'Geral';

            const category = clean(getCategoryForField(field));
            const itemName = clean(field?.field_name || '');
            const insId = inspectionId ? `INS-${inspectionId}` : 'INS';
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, 19);

            // Add GPS to filename if available
            const gpsStr = coords ? `_${coords.latitude.toFixed(6)}_${coords.longitude.toFixed(6)}` : '';

            // Pattern: 01_Categoria_Item_INS-123_2025-12-22_14-30-00_Lat_Lng.jpg
            const fileName = `${indexStr}_${category}_${itemName}_${insId}_${dateStr}${gpsStr}.jpg`;

            const file = new File([blob], fileName, { type: 'image/jpeg' });
            uploadFile(file, fieldId, 'image', coords);
          }
        }}
      />

      {/* AI Media Selection Modal */}
      <AIContextSelectionModal
        isOpen={contextSelection.isOpen}
        onClose={() => setContextSelection(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmContext}
        media={contextSelection.media}
        itemName={contextSelection.itemName}
      />

      {/* AI Media Selection Modal */}
      <AIContextSelectionModal
        isOpen={contextSelection.isOpen}
        onClose={() => setContextSelection(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmContext}
        media={contextSelection.media}
        itemName={contextSelection.itemName}
      />
    </>
  );
}
