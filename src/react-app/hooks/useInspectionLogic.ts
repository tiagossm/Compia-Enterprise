import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { syncService } from '@/lib/sync-service';
import { useToast } from '@/react-app/hooks/useToast';
import { InspectionType, InspectionItemType, InspectionMediaType } from '@/shared/types';
import { FieldResponse } from '@/shared/checklist-types';

export function useInspectionLogic(id: string | undefined) {
    const navigate = useNavigate();
    const { success, error, warning } = useToast();

    const [inspection, setInspection] = useState<InspectionType | null>(null);
    const [items, setItems] = useState<InspectionItemType[]>([]);
    const [templateItems, setTemplateItems] = useState<any[]>([]);
    const [media, setMedia] = useState<InspectionMediaType[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [actionPlan, setActionPlan] = useState<any>(null);
    const [actionItems, setActionItems] = useState<any[]>([]);
    const [signatures, setSignatures] = useState<{ inspector?: string; responsible?: string }>({});
    const [responses, setResponses] = useState<Record<number, any>>({});
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReopening, setIsReopening] = useState(false);

    useEffect(() => {
        if (id && id !== 'undefined') {
            fetchInspectionDetails();
        } else {
            console.warn('[useInspectionLogic] Invalid inspection ID:', id);
            setLoading(false);
            navigate('/inspections');
        }
    }, [id]);

    const fetchInspectionDetails = async () => {
        try {
            const response = await fetchWithAuth(`/api/inspections/${id}`);
            if (response.ok) {
                const data = await response.json();
                setInspection(data.inspection);

                const allItems = data.items || [];
                const manualItems = allItems.filter((item: any) => !item.template_id);
                const templateBasedItems = allItems.filter((item: any) => item.template_id);

                setItems(manualItems);
                setTemplateItems(templateBasedItems);
                setMedia(data.media || []);

                if (data.inspection.action_plan) {
                    try {
                        setActionPlan(JSON.parse(data.inspection.action_plan));
                    } catch (error) {
                        console.error('Error parsing action plan:', error);
                    }
                }

                try {
                    const actionItemsResponse = await fetchWithAuth(`/api/inspections/${id}/action-items`);
                    if (actionItemsResponse.ok) {
                        const actionItemsData = await actionItemsResponse.json();
                        const inspectionActionItems = Array.isArray(actionItemsData) ? actionItemsData : (actionItemsData.action_items || []);
                        setActionItems(inspectionActionItems);
                    }
                } catch (actionItemsError) {
                    console.error('Error loading action items:', actionItemsError);
                }

                const signaturesResponse = await fetchWithAuth(`/api/inspections/${id}/signatures?_t=${Date.now()}`);
                if (signaturesResponse.ok) {
                    const signaturesData = await signaturesResponse.json();
                    setSignatures({
                        inspector: signaturesData.inspector_signature,
                        responsible: signaturesData.responsible_signature
                    });
                }

                // Parse template responses
                const templateResponses = templateBasedItems.reduce((acc: Record<number, any>, item: any) => {
                    if (item.field_responses) {
                        try {
                            const fieldData = JSON.parse(item.field_responses);
                            let parsedValue = fieldData.response_value;

                            if (parsedValue === null || parsedValue === undefined) {
                                switch (fieldData.field_type) {
                                    case 'boolean': parsedValue = null; break;
                                    case 'multiselect': parsedValue = []; break;
                                    default: parsedValue = null;
                                }
                            } else {
                                if (fieldData.field_type === 'boolean') {
                                    if (typeof parsedValue === 'string') {
                                        parsedValue = parsedValue.toLowerCase() === 'true' || parsedValue === '1';
                                    } else if (typeof parsedValue === 'number') parsedValue = parsedValue === 1;
                                } else if (fieldData.field_type === 'multiselect') {
                                    if (typeof parsedValue === 'string') {
                                        try {
                                            const parsed = JSON.parse(parsedValue);
                                            parsedValue = Array.isArray(parsed) ? parsed : parsedValue.split(',').map((s: string) => s.trim()).filter(Boolean);
                                        } catch {
                                            parsedValue = parsedValue.split(',').map((s: string) => s.trim()).filter(Boolean);
                                        }
                                    } else if (!Array.isArray(parsedValue)) parsedValue = [];
                                }
                            }
                            acc[item.id] = parsedValue;
                        } catch (error) {
                            console.error('[TEMPLATE-RESPONSE] Error parsing field response:', error);
                        }
                    }
                    return acc;
                }, {});
                setResponses(templateResponses);
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (itemId: number, isTemplateItem: boolean = false) => {
        if (!confirm('Tem certeza que deseja excluir este item? ' + (isTemplateItem ? 'Isso removerá a pergunta do relatório.' : ''))) return;

        try {
            const response = await fetchWithAuth(`/api/inspection-items/${itemId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao excluir item');

            setItems(prev => prev.filter(i => i.id !== itemId));
            setTemplateItems(prev => prev.filter(i => i.id !== itemId));
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Erro ao excluir item: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleAddItem = async (newItem: any) => {
        setIsSubmitting(true);
        try {
            const response = await fetchWithAuth(`/api/inspections/${id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newItem, inspection_id: parseInt(id!) })
            });

            if (response.ok) {
                success('Item adicionado', 'Item foi adicionado com sucesso ao checklist');
                fetchInspectionDetails();
                return true;
            } else {
                error('Erro ao adicionar item', 'Não foi possível adicionar o item. Tente novamente.');
                return false;
            }
        } catch (err) {
            console.error('Erro ao adicionar item:', err);
            error('Erro ao adicionar item', 'Ocorreu um erro inesperado. Tente novamente.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateItemCompliance = async (itemId: number, isCompliant: boolean) => {
        try {
            const item = items.find(i => i.id === itemId);
            if (!item) return;

            await fetchWithAuth(`/api/inspection-items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, is_compliant: isCompliant })
            });

            fetchInspectionDetails();
        } catch (error) {
            console.error('Erro ao atualizar item:', error);
        }
    };

    const updateItemAnalysis = async (itemId: number, analysis: string | null) => {
        try {
            if (analysis === null) {
                await fetchWithAuth(`/api/inspection-items/${itemId}/pre-analysis`, { method: 'DELETE' });
            } else {
                await fetchWithAuth(`/api/inspection-items/${itemId}/analysis`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ analysis })
                });
            }
            setTemplateItems(prev => prev.map(item => item.id === itemId || item.id === String(itemId) ? { ...item, ai_pre_analysis: analysis } : item));
        } catch (err) {
            console.error('Erro ao atualizar análise:', err);
            error('Erro', 'Não foi possível atualizar a análise.');
        }
    };

    const handleFormSubmit = async (formResponses: FieldResponse[]) => {
        setIsSubmitting(true);
        try {
            const responseUpdates: Record<string, any> = {};
            formResponses.forEach((response) => {
                const item = templateItems.find(i => {
                    try { return JSON.parse(i.field_responses).field_id === response.field_id; } catch { return false; }
                });
                if (item?.id) {
                    try {
                        const fieldData = JSON.parse(item.field_responses);
                        fieldData.response_value = response.value;
                        responseUpdates[item.id] = fieldData;
                    } catch (error) { console.error('Error preparing field data:', error); }
                }
            });

            await syncService.enqueueMutation(
                `/api/inspections/${id}/template-responses`, 'POST', { responses: responseUpdates }
            );

            const newResponses = formResponses.reduce((acc, response) => {
                acc[response.field_id] = response.value;
                return acc;
            }, {} as Record<number, any>);
            setResponses(prev => ({ ...prev, ...newResponses }));
            success('Respostas salvas', 'Respostas salvas (Sincronizando...)');
        } catch (err) {
            console.error('Erro ao salvar respostas:', err);
            error('Erro ao salvar', 'Erro ao processar salvamento local.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignatureSaved = async (type: 'inspector' | 'responsible', signature: string, signerData?: { name: string; email?: string; role: string }) => {
        if (signature && signature.length > 0) {
            setSignatures(prev => ({ ...prev, [type]: signature }));
            if (type === 'responsible' && signerData) {
                setInspection(prev => prev ? ({ ...prev, responsible_name: signerData.name, responsible_email: signerData.email, responsible_role: signerData.role }) : null);
            }
            success('Assinatura salva', `Assinatura do ${type === 'inspector' ? 'inspetor' : 'responsável'} foi capturada com sucesso`);

            try {
                await syncService.enqueueMutation(
                    `/api/inspections/${id}/signatures`, 'POST', {
                    inspector_signature: type === 'inspector' ? signature : signatures.inspector,
                    responsible_signature: type === 'responsible' ? signature : signatures.responsible,
                    responsible_name: type === 'responsible' ? (signerData?.name || inspection?.responsible_name) : undefined,
                    responsible_email: type === 'responsible' ? (signerData?.email || inspection?.responsible_email) : undefined,
                    responsible_role: type === 'responsible' ? (signerData?.role || inspection?.responsible_role) : undefined
                }
                );
            } catch (saveError) { console.error('Error queuing signature save:', saveError); }
            return true;
        } else {
            error('Erro na assinatura', 'Não foi possível capturar a assinatura. Tente novamente.');
            return false;
        }
    };

    const handleFinalizeInspection = async () => {
        const missingItems = templateItems.filter(item => {
            const val = responses[item.id];
            const isValid = val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
            return !isValid;
        });

        if (missingItems.length > 0) {
            warning('Itens Pendentes', `Você precisa responder ${missingItems.length} itens antes de finalizar a inspeção.`);
            return false;
        }

        const hasInspectorSignature = signatures.inspector && signatures.inspector.trim() !== '';
        const hasResponsibleSignature = signatures.responsible && signatures.responsible.trim() !== '';

        if (!hasInspectorSignature || !hasResponsibleSignature) {
            warning('Assinaturas obrigatórias', 'É necessário ter as assinaturas para finalizar.');
            return false;
        }

        setIsSubmitting(true);
        try {
            await syncService.enqueueMutation(
                `/api/inspections/${id}/finalize`, 'POST', {
                inspector_signature: signatures.inspector,
                responsible_signature: signatures.responsible,
                responsible_name: inspection?.responsible_name,
                responsible_email: inspection?.responsible_email,
                responsible_role: inspection?.responsible_role
            }
            );

            success('Inspeção finalizada', 'Inspeção marcada como concluída (Sincronização pendente).');
            setInspection(prev => prev ? { ...prev, status: 'concluida', completed_date: new Date().toISOString() } : null);
            return true;
        } catch (err) {
            console.error('Erro ao finalizar inspeção:', err);
            error('Erro ao finalizar', 'Erro crítico ao salvar finalização localmente.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReopenInspection = async (justification: string) => {
        if (!justification.trim()) {
            warning('Justificativa obrigatória', 'Por favor, informe o motivo para reabrir a inspeção.');
            return false;
        }

        setIsReopening(true);
        try {
            const response = await fetchWithAuth(`/api/inspections/${id}/reopen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ justification: justification.trim() })
            });

            if (!response.ok) throw new Error('Erro ao reabrir inspeção');

            success('Inspeção reaberta', 'A inspeção foi reaberta e está pronta para edição.');
            await fetchInspectionDetails();
            return true;
        } catch (err) {
            console.error('Erro ao reabrir inspeção:', err);
            error('Erro ao reabrir', 'Não foi possível reabrir a inspeção.');
            return false;
        } finally {
            setIsReopening(false);
        }
    };

    const handleMediaUploaded = (newMedia: InspectionMediaType) => setMedia(prev => [newMedia, ...prev]);
    const handleMediaDeleted = (mediaId: number) => setMedia(prev => prev.filter(m => m.id !== mediaId));

    const handleCreateManualAction = async (newAction: any) => {
        setIsSubmitting(true);
        try {
            const response = await fetchWithAuth(`/api/inspections/${id}/action-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newAction, inspection_id: parseInt(id!) })
            });

            if (response.ok) {
                success('Ação criada', 'Ação manual foi criada com sucesso!');
                await fetchInspectionDetails();
                return true;
            } else {
                throw new Error('Erro ao criar ação');
            }
        } catch (err) {
            console.error('Erro ao criar ação:', err);
            error('Erro ao criar ação', 'Não foi possível criar a ação. Tente novamente.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateAIAnalysis = async () => {
        if (!inspection) return;
        setAiAnalyzing(true);
        try {
            const nonCompliantItems = items
                .filter(item => item.is_compliant === false)
                .map(item => `${item.category}: ${item.item_description}${item.observations ? ` (${item.observations})` : ''}`);

            if (nonCompliantItems.length === 0) {
                warning('Análise IA não disponível', 'Nenhum item não conforme encontrado para análise');
                return;
            }

            const mediaUrls = media.map(m => m.file_url);
            const response = await fetchWithAuth(`/api/inspections/${id}/ai-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inspection_id: parseInt(id!),
                    media_urls: mediaUrls,
                    inspection_context: `Inspeção: ${inspection.title} - Local: ${inspection.location} - Empresa: ${inspection.company_name || 'N/A'}`,
                    non_compliant_items: nonCompliantItems
                })
            });

            if (response.ok) {
                const result = await response.json();
                setActionPlan(result.action_plan);
                success('Plano de ação gerado', 'Análise da IA foi concluída e plano de ação foi gerado!');
                window.dispatchEvent(new Event('ai_usage_updated'));
                await fetchInspectionDetails();
            } else {
                throw new Error('Erro na análise de IA');
            }
        } catch (err) {
            console.error('Erro ao gerar análise:', err);
            error('Erro na análise IA', 'Não foi possível gerar a análise.');
        } finally {
            setAiAnalyzing(false);
        }
    };

    const fetchAuditLogs = async () => {
        if (id && id !== 'undefined') {
            try {
                const res = await fetchWithAuth(`/api/inspections/${id}/history`);
                const data = await res.json();
                if (data.history) {
                    setAuditLogs(data.history);
                }
            } catch (err) {
                console.error('Error fetching logs', err);
            }
        }
    };


    const handleAutoSave = async (formResponses: Record<string, any>, comments: Record<string, any>, complianceStatuses?: Record<string, any>) => {
        if (isSubmitting) return;

        try {
            const responseUpdates: Record<string, any> = {};

            Object.keys({ ...formResponses, ...comments, ...(complianceStatuses || {}) }).forEach((itemId) => {
                const item = templateItems.find(ti => String(ti.id) === itemId || ti.id === parseInt(itemId));
                if (item) {
                    try {
                        const fieldData = JSON.parse(item.field_responses);
                        if (formResponses[itemId] !== undefined) fieldData.response_value = formResponses[itemId];
                        if (comments[itemId] !== undefined) fieldData.comment = comments[itemId];
                        if (complianceStatuses && complianceStatuses[itemId] !== undefined) fieldData.compliance_status = complianceStatuses[itemId];
                        responseUpdates[item.id] = fieldData;
                    } catch (e) {
                        console.error('[AUTO-SAVE] Error parsing field_responses:', e);
                    }
                }
            });

            if (Object.keys(responseUpdates).length === 0) return;

            const response = await fetchWithAuth(`/api/inspections/${id}/template-responses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses: responseUpdates })
            });

            if (!response.ok) {
                console.error('[AUTO-SAVE] Failed:', response.status);
            } else {
                setResponses(prev => ({ ...prev, ...formResponses }));
            }
        } catch (error) {
            console.error('[AUTO-SAVE] Error:', error);
        }
    };


    return {
        inspection, items, templateItems, media, responses, signatures, actionPlan, actionItems, auditLogs, loading, aiAnalyzing, isSubmitting, isReopening,
        fetchInspectionDetails, handleDeleteItem, handleAddItem, updateItemCompliance, updateItemAnalysis, handleFormSubmit, handleSignatureSaved,
        handleFinalizeInspection, handleReopenInspection, handleMediaUploaded, handleMediaDeleted, handleCreateManualAction, generateAIAnalysis, fetchAuditLogs, handleAutoSave
    };
}
