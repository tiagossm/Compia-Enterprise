import { db, SyncMutation } from './db';

class SyncService {
    private isSyncing = false;
    private online = navigator.onLine;
    private listeners: ((status: 'idle' | 'syncing' | 'offline' | 'error') => void)[] = [];

    constructor() {
        window.addEventListener('online', () => {
            this.online = true;
            this.notifyListeners();
            this.processQueue();
        });
        window.addEventListener('offline', () => {
            this.online = false;
            this.notifyListeners();
        });
    }

    subscribe(callback: (status: 'idle' | 'syncing' | 'offline' | 'error') => void) {
        this.listeners.push(callback);
        callback(this.getStatus()); // Initial state
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notifyListeners() {
        const status = this.getStatus();
        this.listeners.forEach(l => l(status));
    }

    getStatus() {
        if (!this.online) return 'offline';
        if (this.isSyncing) return 'syncing';
        return 'idle';
    }

    /**
     * Add a mutation to the queue and try to sync immediately if online.
     */
    async enqueueMutation(url: string, method: 'POST' | 'PUT' | 'DELETE' | 'PATCH', body: any, tempId?: number) {
        await db.mutation_queue.add({
            url,
            method,
            body,
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending',
            tempId
        });
        this.processQueue();
    }

    /**
     * Process the queue sequentially.
     */
    async processQueue() {
        if (this.isSyncing || !this.online) return;

        this.isSyncing = true;
        this.notifyListeners(); // Update UI to "syncing"

        try {
            // Get all pending mutations sorted by ID (FIFO)
            const mutations = await db.mutation_queue
                .where('status')
                .equals('pending')
                .sortBy('id');

            for (const mutationItem of mutations) {
                console.log(`[Sync] Processing queue item: ${mutationItem.id}`);
                if (!this.online) {
                    console.log('[Sync] Offline, stopping queue.');
                    break;
                }

                // Refetch mutation to get latest state (in case dependency resolution updated it)
                const mutation = await db.mutation_queue.get(mutationItem.id!);
                if (!mutation) {
                    console.log(`[Sync] Mutation ${mutationItem.id} not found/deleted.`);
                    continue;
                }

                try {
                    await this.syncItem(mutation);
                    // On success, delete from queue
                    if (mutation.id) {
                        await db.mutation_queue.delete(mutation.id);
                    }
                } catch (error) {
                    console.error(`Sync failed for mutation ${mutation.id}:`, error);
                    // Retries and error handling would go here (e.g. max retries -> failed status)
                }
            }
        } finally {
            this.isSyncing = false;
            this.notifyListeners(); // Update UI to "idle"
        }
    }

    private async syncItem(mutation: SyncMutation) {
        // Mark as processing (optional, UI feedback)
        // await db.mutation_queue.update(mutation.id!, { status: 'processing' });

        // Use native fetch to avoid circular dependency with auth.ts
        // Authorization header is usually injected by fetch-setup.ts monkey patch
        const response = await fetch(mutation.url, {
            method: mutation.method,
            body: JSON.stringify(mutation.body),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // If 4xx (client error), maybe mark as failed permanently?
            // If 5xx or network, throw to retry later
            if (response.status >= 500 || response.status === 408) {
                throw new Error(`Server Error: ${response.status}`);
            }
            // For now, simple throw to keep in queue (needs better strategy later)
            throw new Error(`Request failed: ${response.statusText}`);
        }

        // --- ID Resolution Logic ---
        if (mutation.tempId) {
            try {
                const data = await response.json();
                if (data && data.id) {
                    await this.resolveDependencies(mutation.tempId, data.id);
                }
            } catch (e) {
                // Ignore
            }
        }
    }

    private async resolveDependencies(tempId: number, realId: number) {
        const pending = await db.mutation_queue
            .where('status')
            .equals('pending')
            .toArray();

        for (const m of pending) {
            let changed = false;
            let newUrl = m.url;
            let newBody = m.body;

            // Replace in URL
            if (newUrl.includes(String(tempId))) {
                newUrl = newUrl.replace(String(tempId), String(realId));
                changed = true;
            }

            // Replace in Body (JSON string replace for simplicity/robustness with unique tempIds)
            try {
                const bodyStr = JSON.stringify(newBody);
                if (bodyStr.includes(String(tempId))) {
                    const newBodyStr = bodyStr.replace(new RegExp(String(tempId), 'g'), String(realId));
                    newBody = JSON.parse(newBodyStr);
                    changed = true;
                }
            } catch (e) {
                console.error('Error parsing body for ID resolution', e);
            }

            if (changed) {
                await db.mutation_queue.update(m.id!, {
                    url: newUrl,
                    body: newBody
                });
                console.log(`[Sync] Resolved dependency: ${tempId} -> ${realId} in mutation ${m.id}`);
            }
        }
    }
    /**
     * Download all data for offline use (Prefetch).
     */
    async syncDown(organizationId: number) {
        if (!this.online) {
            throw new Error('Cannot download data while offline.');
        }

        this.isSyncing = true;
        this.notifyListeners();

        try {
            console.log('[Sync] Starting prefetch...');

            // 1. Fetch Inspections
            // Note: We depend on the global fetch being authenticated (e.g. by fetch-setup.ts or Authorization header)
            const inspectionsRes = await fetch(`/api/inspections?organization_id=${organizationId}`);
            if (!inspectionsRes.ok) throw new Error('Failed to fetch inspections');
            const inspections = await inspectionsRes.json();

            // 2. Fetch Templates (We need an endpoint for this, assuming /api/templates)
            const templatesRes = await fetch(`/api/templates?organization_id=${organizationId}`);
            if (!templatesRes.ok) throw new Error('Failed to fetch templates');
            const templates = await templatesRes.json();

            // 3. Save to Dexie
            await db.transaction('rw', db.inspections, db.templates, async () => {
                await db.inspections.bulkPut(inspections);
                await db.templates.bulkPut(templates);
            });

            console.log(`[Sync] Downloaded ${inspections.length} inspections and ${templates.length} templates.`);

        } catch (error) {
            console.error('[Sync] Prefetch failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
            this.notifyListeners();
        }
    }


}

export const syncService = new SyncService();
