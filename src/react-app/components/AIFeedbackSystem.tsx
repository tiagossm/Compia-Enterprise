import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, X } from 'lucide-react';
import { useToast } from '@/react-app/hooks/useToast';

interface AIFeedbackSystemProps {
  aiResponseType: 'pre_analysis' | 'action_plan' | 'field_response';
  aiResponseId: string;
  itemId?: number;
  onFeedbackSubmitted?: (feedback: any) => void;
}

export default function AIFeedbackSystem({
  aiResponseType,
  aiResponseId,
  itemId,
  onFeedbackSubmitted
}: AIFeedbackSystemProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const handleFeedbackClick = (type: 'positive' | 'negative') => {
    setFeedbackType(type);
    setShowFeedback(true);
  };

  const submitFeedback = async () => {
    if (!feedbackType) return;

    setSubmitting(true);
    try {
      const feedbackData = {
        response_type: aiResponseType,
        response_id: aiResponseId,
        feedback_type: feedbackType,
        comment: comment.trim(),
        item_id: itemId,
        created_at: new Date().toISOString()
      };

      // For now, we'll just log the feedback and show success
      // In production, you'd send this to your analytics/feedback endpoint
      console.log('AI Feedback submitted:', feedbackData);

      success(
        'Feedback Enviado', 
        feedbackType === 'positive' 
          ? 'Obrigado pelo feedback positivo! Isso nos ajuda a melhorar a IA.' 
          : 'Obrigado pelo feedback! Usaremos isso para aprimorar nossas análises.'
      );

      // Reset state
      setShowFeedback(false);
      setFeedbackType(null);
      setComment('');
      
      // Call callback if provided
      onFeedbackSubmitted?.(feedbackData);

    } catch (err) {
      console.error('Error submitting AI feedback:', err);
      error('Erro', 'Não foi possível enviar o feedback. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (showFeedback && feedbackType) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-900 text-sm flex items-center gap-2">
            {feedbackType === 'positive' ? (
              <>
                <ThumbsUp className="w-4 h-4 text-green-600" />
                Feedback Positivo
              </>
            ) : (
              <>
                <ThumbsDown className="w-4 h-4 text-red-600" />
                Como podemos melhorar?
              </>
            )}
          </h4>
          <button
            onClick={() => setShowFeedback(false)}
            className="text-slate-500 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              {feedbackType === 'positive' 
                ? 'O que mais gostou na análise da IA? (opcional)'
                : 'O que pode ser melhorado na análise da IA?'
              }
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                feedbackType === 'positive'
                  ? 'Ex: A análise foi precisa e detalhada...'
                  : 'Ex: Faltou considerar o equipamento de segurança...'
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              maxLength={300}
            />
            <div className="text-xs text-slate-500 mt-1">
              {comment.length}/300 caracteres
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={submitFeedback}
              disabled={submitting}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Feedback
                </>
              )}
            </button>
            <button
              onClick={() => setShowFeedback(false)}
              className="px-4 py-2 text-slate-600 border border-slate-300 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-600">Esta análise foi útil?</span>
      <button
        onClick={() => handleFeedbackClick('positive')}
        className="flex items-center px-2 py-1 text-green-600 hover:bg-green-50 border border-green-200 rounded text-xs transition-colors"
        title="Feedback positivo"
      >
        <ThumbsUp className="w-3 h-3 mr-1" />
        Sim
      </button>
      <button
        onClick={() => handleFeedbackClick('negative')}
        className="flex items-center px-2 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded text-xs transition-colors"
        title="Feedback negativo"
      >
        <ThumbsDown className="w-3 h-3 mr-1" />
        Não
      </button>
    </div>
  );
}
