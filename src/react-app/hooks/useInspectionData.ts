
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '@/services/inspectionService';
import { InspectionType, InspectionItemType, InspectionMediaType } from '@/shared/types';

export function useInspectionData(id: string | undefined) {
    const navigate = useNavigate();
    const [inspection, setInspection] = useState<InspectionType | null>(null);
    const [items, setItems] = useState<InspectionItemType[]>([]);
    const [templateItems, setTemplateItems] = useState<any[]>([]);
    const [media, setMedia] = useState<InspectionMediaType[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionPlan, setActionPlan] = useState<any>(null);
    const [actionItems, setActionItems] = useState<any[]>([]);
    const [signatures, setSignatures] = useState<{ inspector?: string; responsible?: string }>({});
    const [responses, setResponses] = useState<Record<number, any>>({});
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    const fetchInspectionDetails = useCallback(async () => {
        if (!id || id === 'undefined') {
            setLoading(false);
            return;
        }
        try {
            const data = await inspectionService.fetchDetails(id);
            setInspection(data.inspection);

            const allItems = data.items || [];
            setItems(allItems.filter((item: any) => !item.template_id));
            const tItems = allItems.filter((item: any) => item.template_id);
            setTemplateItems(tItems);
            setMedia(data.media || []);

            // Parse Action Plan
            if (data.inspection.action_plan) {
                try {
                    setActionPlan(JSON.parse(data.inspection.action_plan));
                } catch (e) { console.error('Error parsing action plan', e); }
            }

            // Parse Template Responses
            const templateResponses = tItems.reduce((acc: Record<number, any>, item: any) => {
                if (item.field_responses) {
                    try {
                        const fieldData = JSON.parse(item.field_responses);
                        let parsedValue = fieldData.response_value;

                        // Normalization Logic moved here logic from original hook
                        if (parsedValue === null || parsedValue === undefined) {
                            if (fieldData.field_type === 'multiselect') parsedValue = [];
                            else parsedValue = null;
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
                    } catch (e) {
                        console.error('Error parsing response', e);
                    }
                }
                return acc;
            }, {});
            setResponses(templateResponses);

            // Fetch other resources in parallel
            try {
                const actionItemsData = await inspectionService.fetchActionItems(id);
                const items = Array.isArray(actionItemsData) ? actionItemsData : (actionItemsData.action_items || []);
                setActionItems(items);
            } catch (e) { console.error('Error fetching action items', e); }

            try {
                const sigData = await inspectionService.fetchSignatures(id);
                setSignatures({
                    inspector: sigData.inspector_signature,
                    responsible: sigData.responsible_signature
                });
            } catch (e) { console.error('Error fetching signatures', e); }

            try {
                const historyData = await inspectionService.fetchHistory(id);
                setAuditLogs(historyData.history || []);
            } catch (e) { console.error('Error fetching history', e); }

        } catch (error) {
            console.error('Error fetching details:', error);
            navigate('/inspections'); // Redirect on error?
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (id && id !== 'undefined') {
            fetchInspectionDetails();
        } else {
            setLoading(false);
        }
    }, [id, fetchInspectionDetails]);

    // Setters exposed for optimistic updates from other hooks
    return {
        inspection, items, templateItems, media, responses, signatures, actionPlan, actionItems, auditLogs, loading,
        setInspection, setItems, setTemplateItems, setMedia, setResponses, setSignatures, setActionPlan, setActionItems, setAuditLogs,
        fetchInspectionDetails
    };
}
