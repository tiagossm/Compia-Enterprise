
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
            // 1. Prepare Context (Items)
            const simplifiedItems = data.items.map(item => ({
                id: item.id,
                title: `${item.category}: ${item.item_description}`,
                description: item.item_description
            }));

            // 2. Build FormData
            const formData = new FormData();
            formData.append('file', audioBlob); // Audio file
            formData.append('items', JSON.stringify(simplifiedItems)); // Context
            formData.append('inspection_id', id || '0');

            // 3. Send to Backend
            const response = await inspectionService.processAudioData(formData);

            if (response.ok) {
                const result = await response.json();

                // 4. Process Updates
                // The result should contain { summary, updates: [{ item_id, status, observation }] }
                if (result.updates && Array.isArray(result.updates)) {
                    // Iterate and apply updates optimistically
                    // We need a way to batch these or call updateItem functions?
                    // For now, let's return the result and let the UI/Component handle or auto-apply.
                    // Actually, let's try to apply them here if we have the callbacks/methods.
                    // We don't have direct updateItem methods here, but we can emit an event or return them.

                    // For now: Notify user and return result
                    success('Sucesso', 'Áudio processado! Verificando itens...');
                    return { suggestions: result };
                }

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
