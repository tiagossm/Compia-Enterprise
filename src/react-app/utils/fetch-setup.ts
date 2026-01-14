// Monkey-patch fetch to always include credentials
const originalFetch = window.fetch;
window.fetch = function (...args: Parameters<typeof fetch>) {
    const [url, options = {}] = args;

    // Determine URL string safely
    const urlStr = url instanceof Request ? url.url : url.toString();

    // Standard behavior: include credentials only for same-origin or API calls
    // Avoid sending 'include' to external domains like supabase.co which might return wildcard CORS headers
    const isExternalSupabase = urlStr.includes('supabase.co');

    const newOptions: RequestInit = {
        ...options,
        // Only force include credentials for internal API calls, not external Supabase interactions
        credentials: (isExternalSupabase ? undefined : 'include') as RequestCredentials,
        headers: {
            ...(options.headers || {}),
        } as Record<string, string>,
    };

    // Inject Supabase Auth Token if present (for Google Login/Supabase Auth)
    // Cast headers to any/Record to avoid strict HeadersInit type issues during patch
    const headers = newOptions.headers as Record<string, string>;

    if (!headers['Authorization']) {
        // Find Supabase token in localStorage
        // Pattern: sb-<project-id>-auth-token
        let supabaseToken = null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const parsed = JSON.parse(item);
                        if (parsed.access_token) {
                            supabaseToken = parsed.access_token;
                            break;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing Supabase token:', e);
                }
            }
        }

        if (supabaseToken) {
            headers['Authorization'] = `Bearer ${supabaseToken}`;
        }
    }

    return originalFetch(url, newOptions);
};

export { };
