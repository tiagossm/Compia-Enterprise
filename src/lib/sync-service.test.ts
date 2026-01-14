import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';

// 1. Define getters for navigator to allow runtime changes
let isOnline = true;
const navigatorMock = {
    get onLine() { return isOnline; }
};

vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
});
vi.stubGlobal('navigator', navigatorMock);

describe('SyncService (Offline Engine)', async () => {
    // Dynamic import to ensure globals are used during instantiation
    const { syncService } = await import('./sync-service');

    beforeEach(async () => {
        await db.mutation_queue.clear();
        vi.clearAllMocks();
        isOnline = true; // Reset to online
        (syncService as any).online = true; // Sync internal state
    });

    it('should queue mutations when offline', async () => {
        // SET OFFLINE
        isOnline = false;
        (syncService as any).online = false; // Force internal state update

        // Enqueue
        await syncService.enqueueMutation('/api/inspections', 'POST', { name: 'Offline Test' }, -123);

        // Since offline, it should NOT process queue.
        // Verify queue count
        const count = await db.mutation_queue.count();
        expect(count).toBe(1);

        const stored = await db.mutation_queue.toArray();
        expect(stored[0].url).toBe('/api/inspections');
        expect(stored[0].tempId).toBe(-123);
    });

    it('should process queue when online', async () => {
        // Online default
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ id: 100 })
        });

        await db.mutation_queue.add({
            url: '/api/something',
            method: 'POST',
            body: {},
            timestamp: 1,
            retryCount: 0,
            status: 'pending'
        });

        await syncService.processQueue();

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should resolve dependencies (Temp ID -> Real ID)', async () => {
        // SCENARIO: Offline -> Create Parent -> Create Child -> Online -> Sync

        // 1. Go OFFLINE to queue items
        // Important: Offline ensures enqueueMutation does NOT call processQueue immediately.
        isOnline = false;
        (syncService as any).online = false;

        // 2. Add Mutations
        await syncService.enqueueMutation('/api/inspections', 'POST', {}, -1);
        // Child item referencing Parent -1
        await syncService.enqueueMutation('/api/inspections/-1/items', 'POST', { inspection_id: -1 }, undefined);

        // Verify they are both pending in queue
        const initial = await db.mutation_queue.toArray();
        expect(initial.length).toBe(2);
        expect(initial[0].tempId).toBe(-1); // Parent
        expect(initial[1].url).toContain('-1'); // Child

        // 3. Go ONLINE
        isOnline = true;
        (syncService as any).online = true;

        // Define Mock Implementation (for when fetch happens)
        (global.fetch as any).mockImplementation(async (url: string) => {
            console.log('Mock Fetch Called with:', url);

            // Call 1: Create Inspection -> Returns ID 500
            if (url === '/api/inspections') {
                return { ok: true, json: async () => ({ id: 500 }) };
            }
            // Call 2: Create Item -> Returns ID 999
            // NOTE: We check for "items" but ensure it's NOT the old URL
            if (url.includes('items')) {
                return { ok: true, json: async () => ({ id: 999 }) };
            }
            return { ok: true, json: async () => ({}) };
        });

        // 4. Trigger Sync
        await syncService.processQueue();

        // 5. Verification
        // Expect calls:
        // 1. POST /api/inspections
        // 2. POST /api/inspections/500/items (AFTER resolution)

        expect(global.fetch).toHaveBeenCalledTimes(2);

        // Check Call 1
        expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/inspections', expect.anything());

        // Check Call 2 arguments
        const secondCallArgs = (global.fetch as any).mock.calls[1];
        if (!secondCallArgs) {
            throw new Error('Second fetch call did not happen');
        }
        const secondUrl = secondCallArgs[0];
        const secondBody = JSON.parse(secondCallArgs[1].body);

        console.log('Second Call URL:', secondUrl);

        // Assertions
        expect(secondUrl).toContain('/api/inspections/500/items');
        expect(String(secondBody.inspection_id)).toBe('500');
    });
});
