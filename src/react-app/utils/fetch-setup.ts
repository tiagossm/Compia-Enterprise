// Monkey-patch fetch to always include credentials
const originalFetch = window.fetch;

// List of allowed domains for Authorization injection
const ALLOWED_ORIGINS = [
    'http://localhost',
    'https://compia.tech',
    'https://www.compia.tech',
    'https://vjlvvmriqerfmztwtewa.supabase.co', // Supabase Functions
    window.location.origin // The current application origin
];

window.fetch = function (...args: Parameters<typeof fetch>) {
    const [url, options = {}] = args;

    // Determine URL string safely
    const urlStr = url instanceof Request ? url.url : url.toString();

    // Parse origin for check
    let targetOrigin = '';
    try {
        if (urlStr.startsWith('/') || !urlStr.startsWith('http')) {
            targetOrigin = window.location.origin;
        } else {
            targetOrigin = new URL(urlStr).origin;
        }
    } catch (e) {
        // Fallback for relative or weird URLs
        targetOrigin = window.location.origin;
    }

    // Check if target is trusted
    const isTrustedOrigin = ALLOWED_ORIGINS.some(allowed => targetOrigin.startsWith(allowed) || targetOrigin.includes('vercel.app')); // Includes preview URLs
    const isExternalSupabase = urlStr.includes('supabase.co');

    // Check if body is FormData - if so, don't manipulate headers to let browser set Content-Type with boundary
    const isFormData = options.body instanceof FormData;

    // Build headers - preserve existing, add auth if needed
    const existingHeaders = options.headers || {};
    const headerObj: Record<string, string> = {};

    // Copy existing headers
    if (existingHeaders instanceof Headers) {
        existingHeaders.forEach((value, key) => {
            headerObj[key] = value;
        });
    } else if (Array.isArray(existingHeaders)) {
        existingHeaders.forEach(([key, value]) => {
            headerObj[key] = value;
        });
    } else {
        Object.assign(headerObj, existingHeaders);
    }

    // Inject Supabase Auth Token if present (for Google Login/Supabase Auth)
    // ONLY for trusted origins to avoid leaking token to external APIs (e.g. Maps, ViaCEP)
    if (isTrustedOrigin && !headerObj['Authorization']) {
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
            headerObj['Authorization'] = `Bearer ${supabaseToken}`;
        }
    }

    const newOptions: RequestInit = {
        ...options,
        // Only force include credentials for internal API calls, not external Supabase interactions
        credentials: (isExternalSupabase ? undefined : 'include') as RequestCredentials,
        // For FormData, only pass headers if we added auth - otherwise let browser handle Content-Type
        headers: isFormData && Object.keys(headerObj).length === 0 ? undefined : headerObj,
    };

    return originalFetch(url, newOptions);
};

export { };
