import { useEffect, useState } from 'react';
import { syncService } from '@/lib/sync-service';
import { CloudOff, RefreshCw, CheckCircle } from 'lucide-react';

export function SyncStatusIndicator() {
    const [status, setStatus] = useState(syncService.getStatus());
    const [showSaved, setShowSaved] = useState(false);

    useEffect(() => {
        return syncService.subscribe((newStatus) => {
            setStatus(newStatus);
            if (newStatus === 'idle') {
                // Show "Saved" briefly when finishing sync
                setShowSaved(true);
                setTimeout(() => setShowSaved(false), 3000);
            }
        });
    }, []);

    if (status === 'syncing') {
        return (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                <RefreshCw size={16} className="animate-spin" />
                <span>Sincronizando...</span>
            </div>
        );
    }

    if (status === 'offline') {
        return (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                <CloudOff size={16} />
                <span>Modo Offline</span>
            </div>
        );
    }

    if (showSaved) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full transition-opacity duration-500">
                <CheckCircle size={16} />
                <span>Salvo</span>
            </div>
        );
    }

    // Idle state (invisible or just a cloud check?)
    return null;
    /*  
    // Optional: Always show online status
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 opacity-50 hover:opacity-100 transition-opacity">
          <Cloud size={14} />
          <span>Online</span>
      </div>
    );
    */
}
