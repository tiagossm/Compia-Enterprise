import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with auto-update behavior
registerSW({
    onNeedRefresh() {
        console.log('[PWA] New content available. Refreshing...');
        // In future phases, we can show a Toast here.
        // For now, auto-update handles it, but this callback allows custom UI.
    },
    onOfflineReady() {
        console.log('[PWA] App ready to work offline');
    },
});
