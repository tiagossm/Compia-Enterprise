
import { db } from '@/lib/db';

export const inspectionCache = {
    /**
     * Cache the full inspection details into Dexie.
     * Upserts the inspection record with the full payload.
     */
    save: async (id: number, data: any) => {
        try {
            const existing = await db.inspections.get(id);

            await db.inspections.put({
                id: id,
                organization_id: data.inspection.organization_id || existing?.organization_id || 0,
                user_id: data.inspection.user_id || existing?.user_id || 'unknown',
                status: data.inspection.status,
                started_at: data.inspection.started_at || existing?.started_at || new Date().toISOString(),
                synced_at: Date.now(),
                template_id: data.inspection.template_id || existing?.template_id || 0,
                full_details_payload: data // Cache full payload
            });
            console.log(`[InspectionCache] Saved details for ${id}`);
        } catch (error) {
            console.error(`[InspectionCache] Failed to save ${id}:`, error);
            throw error;
        }
    },

    /**
     * Retrieve full inspection details from cache.
     */
    get: async (id: number) => {
        try {
            const cached = await db.inspections.get(id);
            if (cached && cached.full_details_payload) {
                return cached.full_details_payload;
            }
            return null;
        } catch (error) {
            console.error(`[InspectionCache] Failed to get ${id}:`, error);
            return null;
        }
    }
};
