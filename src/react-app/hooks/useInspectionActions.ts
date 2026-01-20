
import { useState } from 'react';
import { inspectionService } from '@/services/inspectionService';
import { useToast } from '@/react-app/hooks/useToast';
import { InspectionItemType, InspectionMediaType } from '@/shared/types';
import { FieldResponse } from '@/shared/checklist-types';

export function useInspectionActions(
    id: string | undefined,
    callbacks: {
        setItems: React.Dispatch<React.SetStateAction<InspectionItemType[]>>;
        setTemplateItems: React.Dispatch<React.SetStateAction<any[]>>;
        setResponses: React.Dispatch<React.SetStateAction<Record<number, any>>>;
        setMedia: React.Dispatch<React.SetStateAction<InspectionMediaType[]>>;
        refresh: () => void;
        templateItems: any[]; // Needed for form submit lookup
    }
) {
    const { success, error } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDeleteItem = async (itemId: number, isTemplateItem: boolean = false) => {
        if (!confirm('Tem certeza que deseja excluir este item? ' + (isTemplateItem ? 'Isso removerá a pergunta do relatório.' : ''))) return;
        try {
            await inspectionService.deleteItem(itemId);
            callbacks.setItems(prev => prev.filter(i => i.id !== itemId));
            callbacks.setTemplateItems(prev => prev.filter(i => i.id !== itemId));
        } catch (err) {
            console.error(err);
            error('Erro', 'Erro ao excluir item.');
        }
    };

    const handleAddItem = async (newItem: any) => {
        setIsSubmitting(true);
        try {
            await inspectionService.addItem(parseInt(id!), newItem);
            success('Item adicionado', 'Item foi adicionado com sucesso');
            callbacks.refresh();
            return true;
        } catch (err) {
            console.error(err);
            error('Erro', 'Não foi possível adicionar o item.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateItemCompliance = async (itemId: number, currentItem: InspectionItemType | undefined, isCompliant: boolean) => {
        try {
            if (!currentItem) return;
            await inspectionService.updateItemCompliance(itemId, currentItem, isCompliant);
            callbacks.refresh();
        } catch (err) { console.error(err); }
    };

    const updateItemAnalysis = async (itemId: number, analysis: string | null) => {
        try {
            await inspectionService.updateAnalysis(itemId, analysis);
            callbacks.setTemplateItems(prev => prev.map(item => item.id === itemId ? { ...item, ai_pre_analysis: analysis } : item));
        } catch (err) { console.error(err); error('Erro', 'Falha ao atualizar análise.'); }
    };

    const handleCreateManualAction = async (newAction: any) => {
        setIsSubmitting(true);
        try {
            await inspectionService.createActionItem(parseInt(id!), newAction);
            success('Ação criada', 'Ação manual criada com sucesso!');
            callbacks.refresh();
            return true;
        } catch (err) {
            console.error(err);
            error('Erro', 'Falha ao criar ação.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormSubmit = async (formResponses: FieldResponse[]) => {
        setIsSubmitting(true);
        try {
            const responseUpdates: Record<string, any> = {};
            formResponses.forEach((response) => {
                // Logic to find item by field_id match
                const item = callbacks.templateItems.find(i => {
                    try { return JSON.parse(i.field_responses).field_id === response.field_id; } catch { return false; }
                });
                if (item?.id) {
                    try {
                        const fieldData = JSON.parse(item.field_responses);
                        fieldData.response_value = response.value;
                        responseUpdates[item.id] = fieldData;
                    } catch { }
                }
            });

            await inspectionService.saveTemplateResponses(id!, responseUpdates);

            const newResponses = formResponses.reduce((acc, response) => {
                acc[response.field_id] = response.value;
                return acc;
            }, {} as Record<number, any>);

            callbacks.setResponses(prev => ({ ...prev, ...newResponses }));
            success('Salvo', 'Respostas salvas.');
        } catch (err) {
            console.error(err);
            error('Erro', 'Falha ao salvar respostas.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-save logic
    const handleAutoSave = async (formResponses: Record<string, any>, comments: Record<string, any>, complianceStatuses?: Record<string, any>) => {
        if (isSubmitting) return;
        try {
            // Reconstruct updates
            const responseUpdates: Record<string, any> = {};
            // Helper to iterate safe
            Object.keys({ ...formResponses, ...comments, ...(complianceStatuses || {}) }).forEach((itemId) => {
                const item = callbacks.templateItems.find(ti => String(ti.id) === itemId || ti.id === parseInt(itemId));
                if (item) {
                    try {
                        const fieldData = JSON.parse(item.field_responses);
                        if (formResponses[itemId] !== undefined) fieldData.response_value = formResponses[itemId];
                        if (comments[itemId] !== undefined) fieldData.comment = comments[itemId];
                        if (complianceStatuses && complianceStatuses[itemId] !== undefined) fieldData.compliance_status = complianceStatuses[itemId];
                        responseUpdates[item.id] = fieldData;
                    } catch { }
                }
            });

            if (Object.keys(responseUpdates).length > 0) {
                await inspectionService.saveTemplateResponses(id!, responseUpdates);
                callbacks.setResponses(prev => ({ ...prev, ...formResponses }));
            }
        } catch (e) { console.error('AutoSave Error', e); }
    };

    const handleMediaUploaded = (newMedia: InspectionMediaType) => callbacks.setMedia(prev => [newMedia, ...prev]);
    const handleMediaDeleted = (mediaId: number) => callbacks.setMedia(prev => prev.filter(m => m.id !== mediaId));

    return {
        isSubmitting,
        handleDeleteItem,
        handleAddItem,
        updateItemCompliance,
        updateItemAnalysis,
        handleCreateManualAction,
        handleFormSubmit,
        handleAutoSave,
        handleMediaUploaded,
        handleMediaDeleted
    };
}
