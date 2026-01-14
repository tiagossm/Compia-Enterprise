import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface UseOfflineDataProps<T> {
    apiEndpoint: string;
    table: 'inspections'; // Extend with other table names as needed
    filter?: (item: any) => boolean;
    onSync?: (data: T[]) => void;
}

export function useOfflineData<T>({ apiEndpoint, table, filter, onSync }: UseOfflineDataProps<T>) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Monitor Online Status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Fetch Data Logic
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (navigator.onLine) {
                    // 1. Try Online Fetch
                    const response = await fetchWithAuth(apiEndpoint);
                    if (response.ok) {
                        const apiData = await response.json();

                        // 2. Sync to Dexie (Cache)
                        if (table === 'inspections') {
                            await db.inspections.bulkPut(apiData);
                        }

                        setData(apiData);
                        if (onSync) onSync(apiData);
                    } else {
                        throw new Error('API Error');
                    }
                } else {
                    throw new Error('Offline Mode');
                }
            } catch (error) {
                console.log('Fetching from local DB due to:', error);

                // 3. Fallback to Dexie
                let localData: any[] = [];
                if (table === 'inspections') {
                    localData = await db.inspections.toArray();
                }

                if (filter) {
                    localData = localData.filter(filter);
                }

                setData(localData);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiEndpoint, table, isOffline]);

    return { data, loading, isOffline };
}
