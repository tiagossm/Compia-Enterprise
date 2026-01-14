import { useState, useEffect } from 'react';
import {
  Brain,
  Loader2,
  FileText,
  Plus,
  AlertCircle,
  Target,
  Edit,
  Trash2,
  Upload,
  ImageIcon,
  Eye,
  EyeOff,
  Sparkles,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { InspectionMediaType } from '@/shared/types';
import { useToast } from '@/react-app/hooks/useToast';
import { fetchWithAuth } from '@/react-app/utils/auth';
import MediaUpload from './MediaUpload';

interface ChecklistItemAnalysisProps {
  itemId?: number;
  inspectionId: number;
  fieldId: number;
  fieldName: string;
  fieldType: string;
  responseValue: any;
  existingMedia?: InspectionMediaType[];
  onMediaUploaded: (media: InspectionMediaType) => void;
  onMediaDeleted: (mediaId: number) => void;
  onPreAnalysisGenerated: (analysis: string) => void;
  onActionCreated: (action: any) => void;

  preAnalysis?: string;
  hideMediaButton?: boolean;
}

interface ActionItem {
  id?: number;
  title: string;
  what_description?: string;
  where_location?: string;
  how_method?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  is_ai_generated: boolean;
}

export default function ChecklistItemAnalysis({
  itemId,
  inspectionId,
  fieldId,
  fieldName,
  fieldType,
  responseValue,
  existingMedia = [],
  onMediaUploaded,
  onMediaDeleted,
  onPreAnalysisGenerated,
  onActionCreated,
  preAnalysis,
  hideMediaButton = false
}: ChecklistItemAnalysisProps) {
  const { success, error: showError, warning, info } = useToast();

  // Estados dos processos de IA
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingAction, setIsCreatingAction] = useState(false);

  const [isDeletingAnalysis, setIsDeletingAnalysis] = useState(false);

  // Estados da interface
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Estados dos dados
  const [createdActions, setCreatedActions] = useState<ActionItem[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(preAnalysis || '');
  const [userPrompt, setUserPrompt] = useState('');

  // New States for Media Selection
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [pendingAction, setPendingAction] = useState<'analysis' | 'action_plan' | null>(null);

  // Initialize selected media when existingMedia changes
  useEffect(() => {
    if (existingMedia.length > 0) {
      setSelectedMediaIds(existingMedia.map(m => m.id).filter((id): id is number => id !== undefined));
    }
  }, [existingMedia]);

  // Cargar ações existentes
  useEffect(() => {
    if (itemId) {
      loadExistingActions();
    }
  }, [itemId]);

  useEffect(() => {
    setCurrentAnalysis(preAnalysis || '');
  }, [preAnalysis]);

  const loadExistingActions = async () => {
    if (!itemId) return;

    try {
      const response = await fetchWithAuth(`/api/inspection-items/${itemId}/actions`);
      if (response.ok) {
        const data = await response.json();
        setCreatedActions(data.actions || []);
      }
    } catch (error) {
      console.error('Erro ao carregar ações:', error);
    }
  };

  // Validar se há dados suficientes para análise
  const canAnalyze = () => {
    const hasResponse = responseValue !== null && responseValue !== undefined && responseValue !== '';
    const hasMedia = existingMedia.length > 0;
    return hasResponse || hasMedia;
  };

  // Otimizar mídia para análise (com filtragem)
  const prepareMediaForAI = () => {
    // Se houver seleção manual, usa apenas os selecionados
    const mediaToUse = existingMedia.filter(m =>
      m.id && selectedMediaIds.includes(m.id)
    );

    return mediaToUse.map(media => ({
      file_url: media.file_url,
      media_type: media.media_type,
      file_name: media.file_name,
      mime_type: media.mime_type || (media.media_type === 'audio' ? 'audio/webm' : undefined),
      description: media.description || null
    })).slice(0, 5); // Aumentado para 5 itens já que o usuário selecionou
  };

  // Formatar valor da resposta para exibição
  const formatResponseValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === '') return 'Não respondido';

    switch (type) {
      case 'boolean':
        return value ? 'Conforme' : 'Não Conforme';
      case 'rating':
        return `${value}/5 estrelas`;
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return String(value);
    }
  };

  // ========== FUNÇÕES DE IA ==========

  // Pré-análise usando IA (Initiator)
  const handlePreAnalysis = () => {
    if (existingMedia.length > 0) {
      setPendingAction('analysis');
      setShowMediaSelector(true);
    } else {
      executePreAnalysis();
    }
  };

  const executePreAnalysis = async () => {
    if (!itemId) {
      showError('Erro', 'Item de inspeção não encontrado');
      return;
    }

    if (!canAnalyze()) {
      warning('Atenção', 'É necessário ter uma resposta ou mídia anexada para analisar este item');
      return;
    }

    setIsAnalyzing(true);

    try {
      const mediaForAnalysis = prepareMediaForAI();

      // DEBUG: Log what media is being sent
      console.log('[PRE-ANALYSIS DEBUG] existingMedia:', existingMedia.length, 'items');
      console.log('[PRE-ANALYSIS DEBUG] mediaForAnalysis:', mediaForAnalysis.map(m => ({
        type: m.media_type,
        name: m.file_name,
        url_length: m.file_url?.length || 0,
        url_preview: m.file_url?.substring(0, 50) + '...'
      })));

      const response = await fetchWithAuth(`/api/inspection-items/${itemId}/pre-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: fieldId,
          field_name: fieldName,
          field_type: fieldType,
          response_value: responseValue,
          media_data: mediaForAnalysis,
          user_prompt: userPrompt.trim() || null
        })
      });

      if (response.ok) {
        const result = await response.json();

        // DEBUG: Log API response including debug info
        console.log('[PRE-ANALYSIS DEBUG] API Response:', result);
        if (result._debug) {
          console.log('[PRE-ANALYSIS DEBUG] Audio transcriptions:', result._debug.transcriptions);
          console.log('[PRE-ANALYSIS DEBUG] Prompt preview:', result._debug.prompt_preview);
        }

        const analysis = result.analysis || result.pre_analysis;
        if (analysis) {
          setCurrentAnalysis(analysis);
          onPreAnalysisGenerated(analysis);
          success('Pré-Análise Concluída', 'A análise inteligente foi gerada com sucesso');

          if (result.media_analyzed > 0) {
            info('Mídia Analisada', `${result.media_analyzed} mídia(s) foram analisadas pela IA`);
          }
        } else {
          throw new Error('Análise vazia retornada pela IA');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na pré-análise');
      }
    } catch (err) {
      console.error('Erro ao fazer pré-análise:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

      if (errorMessage.includes('timeout')) {
        showError('Timeout', 'A análise demorou muito. Tente com menos mídias ou aguarde alguns minutos.');
      } else if (errorMessage.includes('não disponível') || errorMessage.includes('quota') || errorMessage.includes('429')) {
        showError('Serviço Indisponível', 'O serviço de IA está temporariamente indisponível devido à alta demanda. Tente novamente em alguns minutos.');
      } else if (errorMessage.includes('500')) {
        showError('Erro do Servidor', 'Erro interno do servidor. Verifique sua conexão e tente novamente.');
      } else {
        showError('Erro na Pré-Análise', errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Criar ação corretiva usando IA (Initiator)
  const handleCreateAction = () => {
    if (existingMedia.length > 0) {
      setPendingAction('action_plan');
      setShowMediaSelector(true);
    } else {
      executeCreateAction();
    }
  };

  const executeCreateAction = async () => {
    if (!itemId) {
      showError('Erro', 'Item de inspeção não encontrado');
      return;
    }

    setIsCreatingAction(true);

    try {
      const mediaForAnalysis = prepareMediaForAI();

      const response = await fetchWithAuth(`/api/inspection-items/${itemId}/create-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: fieldId,
          field_name: fieldName,
          field_type: fieldType,
          response_value: responseValue,
          pre_analysis: currentAnalysis || null,
          media_data: mediaForAnalysis,
          user_prompt: userPrompt.trim() || null
        })
      });

      if (response.ok) {
        const result = await response.json();

        if (result.action.requires_action && result.action.id) {
          // Ação foi criada
          const actionWithStatus = { ...result.action, status: 'pending' };
          setCreatedActions(prev => [...prev, actionWithStatus]);
          onActionCreated(actionWithStatus);
          success('Ação Criada', 'Nova ação corretiva foi criada com base na análise da IA');
          setShowActions(true);
        } else {
          // Nenhuma ação necessária
          info('Análise Concluída', 'A IA determinou que não é necessária uma ação corretiva para este item com base nas evidências analisadas.');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar ação');
      }
    } catch (err) {
      console.error('Erro ao criar ação:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

      if (errorMessage.includes('timeout')) {
        showError('Timeout', 'A criação da ação demorou muito. Tente novamente com menos conteúdo.');
      } else if (errorMessage.includes('não disponível') || errorMessage.includes('quota') || errorMessage.includes('429')) {
        showError('Serviço Indisponível', 'O serviço de IA está temporariamente indisponível devido à alta demanda. Tente novamente em alguns minutos.');
      } else if (errorMessage.includes('500')) {
        showError('Erro do Servidor', 'Erro interno do servidor. Verifique sua conexão e tente novamente.');
      } else {
        showError('Erro ao Criar Ação', errorMessage);
      }
    } finally {
      setIsCreatingAction(false);
    }
  };



  // Excluir pré-análise
  const handleDeleteAnalysis = async () => {
    if (!itemId) return;

    if (confirm('Tem certeza que deseja excluir a pré-análise da IA?')) {
      setIsDeletingAnalysis(true);
      try {
        const response = await fetchWithAuth(`/api/inspection-items/${itemId}/pre-analysis`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setCurrentAnalysis('');
          onPreAnalysisGenerated('');
          success('Pré-Análise Excluída', 'A pré-análise foi removida com sucesso');
        } else {
          showError('Erro', 'Não foi possível excluir a pré-análise. Tente novamente.');
        }
      } catch (err) {
        console.error('Erro ao excluir pré-análise:', err);
        showError('Erro', 'Não foi possível excluir a pré-análise. Verifique sua conexão.');
      } finally {
        setIsDeletingAnalysis(false);
      }
    }
  };

  // Excluir ação
  const handleDeleteAction = async (actionId: number) => {
    if (confirm('Tem certeza que deseja excluir esta ação?')) {
      try {
        const response = await fetchWithAuth(`/api/action-items/${actionId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setCreatedActions(prev => prev.filter(action => action.id !== actionId));
          success('Ação Excluída', 'A ação foi removida com sucesso');
        } else {
          showError('Erro', 'Não foi possível excluir a ação. Tente novamente.');
        }
      } catch (err) {
        console.error('Erro ao excluir ação:', err);
        showError('Erro', 'Não foi possível excluir a ação. Verifique sua conexão.');
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-xl p-6 mt-6 border border-blue-100 shadow-sm ml-0 sm:ml-11 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-lg">Análise Inteligente</h4>
            <p className="text-sm text-slate-500">Análise multimodal com IA especializada</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className={`p-2 rounded-lg transition-colors ${showAdvancedOptions
              ? 'bg-blue-100 text-blue-700'
              : 'text-slate-500 hover:bg-slate-100'
              }`}
            title="Opções avançadas"
          >
            <Edit className="w-4 h-4" />
          </button>

          {!hideMediaButton && (
            <button
              type="button"
              onClick={() => setShowMediaUpload(!showMediaUpload)}
              className={`p-2 rounded-lg transition-colors ${showMediaUpload
                ? 'bg-green-100 text-green-700'
                : 'text-slate-500 hover:bg-slate-100'
                }`}
              title="Gerenciar mídias"
            >
              <Upload className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Resposta atual */}
      <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-slate-700">Campo: {fieldName}</span>
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-medium">Resposta atual:</span> {formatResponseValue(responseValue, fieldType)}
        </p>

        {/* Informações de mídia */}
        {existingMedia.length > 0 && (
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span>📷 {existingMedia.filter(m => m.media_type === 'image').length} foto(s)</span>
            <span>🎵 {existingMedia.filter(m => m.media_type === 'audio').length} áudio(s)</span>
            <span>🎥 {existingMedia.filter(m => m.media_type === 'video').length} vídeo(s)</span>
          </div>
        )}
      </div>

      {/* Opções avançadas */}
      {showAdvancedOptions && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Prompt personalizado (opcional)
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Ex: Focar na análise de EPIs, verificar conformidade com NR-6..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
        </div>
      )}

      {/* Botões de ação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">


        <button
          type="button"
          onClick={handlePreAnalysis}
          disabled={isAnalyzing || !canAnalyze()}
          className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 mr-2" />
          )}
          <span className="text-sm font-medium">
            {isAnalyzing ? 'Analisando...' : 'Pré-Análise'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleCreateAction}
          disabled={isCreatingAction}
          className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {isCreatingAction ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          <span className="text-sm font-medium">
            {isCreatingAction ? 'Criando...' : 'Criar Ação'}
          </span>
        </button>
      </div>

      {/* Upload de mídia */}
      {showMediaUpload && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-5 h-5 text-slate-600" />
            <h5 className="font-medium text-slate-900">Gerenciar Mídias</h5>
          </div>
          <MediaUpload
            inspectionId={inspectionId}
            inspectionItemId={itemId}
            onMediaUploaded={onMediaUploaded}
            existingMedia={existingMedia}
            onMediaDeleted={onMediaDeleted}
          />
        </div>
      )}

      {/* Pré-análise */}
      {currentAnalysis && (
        <div className="mb-6 p-5 bg-white rounded-xl border border-blue-100 shadow-sm relative group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Pré-Análise da IA</span>
            </div>
            <button
              onClick={handleDeleteAnalysis}
              disabled={isDeletingAnalysis}
              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
              title="Excluir pré-análise"
            >
              {isDeletingAnalysis ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {currentAnalysis}
            </p>
          </div>
        </div>
      )}

      {/* Ações criadas */}
      {createdActions.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-900">Ações Criadas pela IA</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                {createdActions.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowActions(!showActions)}
                className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                title={showActions ? "Ocultar ações" : "Mostrar ações"}
              >
                {showActions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <a
                href={`/inspections/${inspectionId}/action-plan`}
                className="flex items-center px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FileText className="w-3 h-3 mr-1" />
                Gerenciar
              </a>
            </div>
          </div>

          {showActions && (
            <div className="space-y-3">
              {createdActions.map((action) => (
                <div key={action.id} className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-medium text-slate-900 text-sm">{action.title}</h6>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        IA
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${action.priority === 'critica' ? 'bg-red-100 text-red-800' :
                        action.priority === 'alta' ? 'bg-orange-100 text-orange-800' :
                          action.priority === 'media' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                        }`}>
                        {action.priority}
                      </span>
                      <button
                        onClick={() => handleDeleteAction(action.id!)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Excluir ação"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {action.what_description && (
                      <div className="p-2 bg-slate-50 rounded">
                        <span className="font-medium text-red-600">O que:</span>
                        <p className="text-slate-700 mt-1">{action.what_description}</p>
                      </div>
                    )}
                    {action.where_location && (
                      <div className="p-2 bg-slate-50 rounded">
                        <span className="font-medium text-green-600">Onde:</span>
                        <p className="text-slate-700 mt-1">{action.where_location}</p>
                      </div>
                    )}
                    {action.how_method && (
                      <div className="p-2 bg-slate-50 rounded">
                        <span className="font-medium text-blue-600">Como:</span>
                        <p className="text-slate-700 mt-1">{action.how_method}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500 italic">
                      Complete os detalhes (Quem, Quando, Quanto) no Plano de Ação
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dicas de uso contextuais e relevantes */}
      {existingMedia.length === 0 && !currentAnalysis && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">💡 Para análise mais precisa:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Anexe fotos, áudios ou vídeos como evidências para análise multimodal</li>
                <li>A IA informará quando não há mídias disponíveis na análise</li>
                <li>Use o prompt personalizado para focar em normas específicas</li>
                {responseValue === false && (
                  <li className="text-amber-900 font-medium">⚠️ Item não conforme - análise e ação recomendadas</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dicas específicas quando há mídia mas sem análise */}
      {existingMedia.length > 0 && !currentAnalysis && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">🎯 Evidências carregadas - Pronto para análise:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>{existingMedia.length} mídia(s) disponível(is) - A análise mencionará essas evidências</li>
                <li>A pré-análise será baseada nas evidências anexadas</li>
                <li>Ações criadas refletirão os achados da análise de IA</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dicas para melhorar análise quando já existe */}
      {currentAnalysis && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">✅ Análise concluída:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>A análise mencionou a disponibilidade de evidências (mídias ou apenas resposta)</li>
                <li>Ações criadas serão coerentes com esta análise de IA</li>
                <li>Revise e complemente se necessário</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Mídia */}
      {showMediaSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Selecionar Evidências
              </h3>
              <button
                onClick={() => setShowMediaSelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-slate-600 mb-4">
                Selecione quais arquivos a IA deve analisar. Isso melhora a precisão e velocidade.
              </p>

              <div className="flex justify-end gap-2 mb-3 text-xs">
                <button
                  onClick={() => setSelectedMediaIds(existingMedia.map(m => m.id!).filter(Boolean))}
                  className="text-blue-600 hover:underline"
                >
                  Selecionar Todos
                </button>
                <button
                  onClick={() => setSelectedMediaIds([])}
                  className="text-slate-500 hover:underline"
                >
                  Limpar
                </button>
              </div>

              <div className="space-y-2">
                {existingMedia.map((media) => (
                  <div
                    key={media.id}
                    onClick={() => {
                      if (selectedMediaIds.includes(media.id!)) {
                        setSelectedMediaIds(prev => prev.filter(id => id !== media.id));
                      } else {
                        setSelectedMediaIds(prev => [...prev, media.id!]);
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedMediaIds.includes(media.id!)
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`flex-shrink-0 text-blue-600`}>
                      {selectedMediaIds.includes(media.id!) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {media.file_name || 'Arquivo sem nome'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="uppercase">{media.media_type}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">
                          {media.file_url ? '.../' + media.file_url.split('/').pop() : 'URL indisponível'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setShowMediaSelector(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowMediaSelector(false);
                  if (pendingAction === 'analysis') {
                    executePreAnalysis();
                  } else if (pendingAction === 'action_plan') {
                    executeCreateAction();
                  }
                  setPendingAction(null);
                }}
                disabled={selectedMediaIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Confirmar Seleção ({selectedMediaIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
