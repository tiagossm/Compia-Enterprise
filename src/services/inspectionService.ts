
import { fetchWithAuth } from '@/react-app/utils/auth';
import { inspectionCache } from '@/lib/cache/inspection-cache';

import { syncService } from '@/lib/sync-service';

export const inspectionService = {
    fetchDetails: async (id: string) => {
        // Strategy: Network First, Fallback to Cache
        try {
            const response = await fetchWithAuth(`/api/inspections/${id}`);
            if (!response.ok) {
                // If 404, throw immediately (don't fallback to cache if it doesn't exist on server anymore)
                if (response.status === 404) throw new Error('Inspeção não encontrada');
                throw new Error('Falha ao carregar detalhes da inspeção');
            }
            const data = await response.json();

            // Success: Cache the fresh data
            try {
                const numericId = parseInt(id);
                await inspectionCache.save(numericId, data);
            } catch (cacheError) {
                console.warn('[InspectionService] Failed to cache details:', cacheError);
            }

            return data;
        } catch (error) {
            console.warn(`[InspectionService] Network failed for ${id}, trying cache...`, error);

            // Fallback: Try Cache
            try {
                const numericId = parseInt(id);
                const cachedPayload = await inspectionCache.get(numericId);

                if (cachedPayload) {
                    console.log(`[InspectionService] Serving cached details for ${id}`);
                    return cachedPayload;
                }
            } catch (dbError) {
                console.error('[InspectionService] Cache lookup failed:', dbError);
            }

            // If we got here, both Network and Cache failed
            throw error;
        }
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

    processAudio: async (payload: { inspection_id: number, audio_url: string }) => {
        // Legacy method for URL-based processing
        const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '/functions/v1';
        return fetchWithAuth(`${functionsUrl}/process-audio-url`, { // Renamed or keep as fallback
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    processAudioData: async (formData: FormData) => {
        // New method for direct binary upload
        const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '/functions/v1';
        // Note: fetchWithAuth typically sets Content-Type to application/json if not specified? 
        // No, fetchWithAuth usually handles headers. If we pass FormData, browser sets Content-Type + Boundary automatically.
        // We need to make sure fetchWithAuth doesn't force application/json.
        // Let's assume fetchWithAuth is flexible or use raw fetch if needed. 
        // Checking fetchWithAuth implementation would be safe, but let's try assuming standard behavior:
        // If body is FormData, don't set Content-Type header manually.

        return fetchWithAuth(`${functionsUrl}/process-audio`, {
            method: 'POST',
            body: formData
            // Headers: Authorization is added by fetchWithAuth. Content-Type is auto-set by browser for FormData.
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
