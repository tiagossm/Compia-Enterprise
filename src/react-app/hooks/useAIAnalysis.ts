
import { useState } from 'react';
import { inspectionService } from '@/services/inspectionService';
import { useToast } from '@/react-app/hooks/useToast';
import { InspectionType, InspectionItemType, InspectionMediaType } from '@/shared/types';

export function useAIAnalysis(
    id: string | undefined,
    data: {
        inspection: InspectionType | null;
        items: InspectionItemType[];
        media: InspectionMediaType[];
    },
    callbacks: {
        setActionPlan: React.Dispatch<any>;
        refresh: () => void;
    }
) {
    const { success, error, warning } = useToast();
    const [aiAnalyzing, setAiAnalyzing] = useState(false);

    const generateAIAnalysis = async () => {
        if (!data.inspection) return;

        const nonCompliantItems = data.items
            .filter(item => item.is_compliant === false)
            .map(item => `${item.category}: ${item.item_description}${item.observations ? ` (${item.observations})` : ''}`);

        if (nonCompliantItems.length === 0) {
            warning('Info', 'Nenhum item não conforme para analisar.');
            return;
        }

        setAiAnalyzing(true);
        try {
            const mediaUrls = data.media.map(m => m.file_url);
            const response = await inspectionService.generateAIAnalysis(parseInt(id!), {
                inspection_id: parseInt(id!),
                media_urls: mediaUrls,
                inspection_context: `Inspeção: ${data.inspection.title} - Local: ${data.inspection.location} - Empresa: ${data.inspection.company_name || 'N/A'}`,
                non_compliant_items: nonCompliantItems
            });

            if (response.ok) {
                const result = await response.json();
                callbacks.setActionPlan(result.action_plan);
                success('Sucesso', 'Plano de ação gerado pela IA.');
                window.dispatchEvent(new Event('ai_usage_updated'));
                callbacks.refresh();
            } else {
                throw new Error('Falha na resposta da IA');
            }
        } catch (err) {
            console.error(err);
            error('Erro', 'Falha na análise IA.');
        } finally {
            setAiAnalyzing(false);
        }
    };

    const processAudioNote = async (audioBlob: Blob) => {
        setAiAnalyzing(true);
        try {
            // 1. Upload to Supabase Storage
            const { supabase } = await import('@/react-app/lib/supabase');
            const filename = `${id}_${Date.now()}.webm`;
            const { error: uploadError } = await supabase.storage
                .from('inspection-audio')
                .upload(filename, audioBlob);

            if (uploadError) throw uploadError;

            // 2. Create Signed URL for the Edge Function
            const { data: signedUrlData } = await supabase.storage
                .from('inspection-audio')
                .createSignedUrl(filename, 60);

            if (!signedUrlData?.signedUrl) throw new Error('Failed to sign URL');

            // 3. Process with Edge Function
            const response = await inspectionService.processAudio({
                inspection_id: parseInt(id!),
                audio_url: signedUrlData.signedUrl
            });

            if (response.ok) {
                const result = await response.json();
                success('Sucesso', 'Áudio processado. Sugestões geradas.');
                return result;
            } else {
                throw new Error('Falha no processamento de áudio');
            }

        } catch (err) {
            console.error(err);
            error('Erro', 'Falha ao processar áudio.');
            return null;
        } finally {
            setAiAnalyzing(false);
        }
    };

    return {
        aiAnalyzing,
        generateAIAnalysis,
        processAudioNote
    };
}
