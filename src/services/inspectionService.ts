
import { fetchWithAuth } from '@/react-app/utils/auth';

import { syncService } from '@/lib/sync-service';

export const inspectionService = {
    fetchDetails: async (id: string) => {
        const response = await fetchWithAuth(`/api/inspections/${id}`);
        if (!response.ok) throw new Error('Failed to fetch inspection details');
        return response.json();
    },

    fetchActionItems: async (id: string) => {
        const response = await fetchWithAuth(`/api/inspections/${id}/action-items`);
        if (!response.ok) throw new Error('Failed to fetch action items');
        return response.json();
    },

    fetchSignatures: async (id: string) => {
        const response = await fetchWithAuth(`/api/inspections/${id}/signatures?_t=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch signatures');
        return response.json();
    },

    fetchHistory: async (id: string) => {
        const response = await fetchWithAuth(`/api/inspections/${id}/history`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return response.json();
    },

    deleteItem: async (itemId: number) => {
        return fetchWithAuth(`/api/inspection-items/${itemId}`, { method: 'DELETE' });
    },

    addItem: async (id: number, item: any) => {
        return fetchWithAuth(`/api/inspections/${id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, inspection_id: id })
        });
    },

    updateItemCompliance: async (itemId: number, item: any, isCompliant: boolean) => {
        return fetchWithAuth(`/api/inspection-items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, is_compliant: isCompliant })
        });
    },

    updateAnalysis: async (itemId: number, analysis: string | null) => {
        if (analysis === null) {
            return fetchWithAuth(`/api/inspection-items/${itemId}/pre-analysis`, { method: 'DELETE' });
        } else {
            return fetchWithAuth(`/api/inspection-items/${itemId}/analysis`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysis })
            });
        }
    },

    createActionItem: async (id: number, action: any) => {
        return fetchWithAuth(`/api/inspections/${id}/action-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...action, inspection_id: id })
        });
    },

    generateAIAnalysis: async (id: number, payload: any) => {
        return fetchWithAuth(`/api/inspections/${id}/ai-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    reopen: async (id: number, justification: string) => {
        return fetchWithAuth(`/api/inspections/${id}/reopen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ justification })
        });
    },

    // Sync Service Wrappers
    saveTemplateResponses: async (id: string, responses: Record<string, any>) => {
        return syncService.enqueueMutation(
            `/api/inspections/${id}/template-responses`, 'POST', { responses }
        );
    },

    saveSignatures: async (id: string, signatureData: any) => {
        return syncService.enqueueMutation(
            `/api/inspections/${id}/signatures`, 'POST', signatureData
        );
    },

    finalize: async (id: string, finalizeData: any) => {
        return syncService.enqueueMutation(
            `/api/inspections/${id}/finalize`, 'POST', finalizeData
        );
    }
};
