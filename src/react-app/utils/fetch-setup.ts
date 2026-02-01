// Monkey-patch fetch to include credentials for *our* app APIs,
// while staying completely hands-off for Supabase (supabase-js manages its own auth).
const originalFetch = window.fetch;

// List of allowed domains for Authorization injection
const ALLOWED_ORIGINS = [
    'http://localhost',
    'https://compia.tech',
    'https://www.compia.tech',
    window.location.origin // The current application origin
];

window.fetch = function (...args: Parameters<typeof fetch>) {
    const [url, options = {}] = args;

    // Determine URL string safely
    const urlStr = url instanceof Request ? url.url : url.toString();

    // If this is ANY Supabase endpoint (REST, Storage, Auth, Functions), do not modify headers/credentials.
    // Rationale: even small header changes can break JWT parsing server-side (e.g. JWE vs JWT).
    if (urlStr.includes('supabase.co/')) {
        return originalFetch(url, options);
    }

    // Parse origin for check
    let targetOrigin = '';
    try {
        if (urlStr.startsWith('/') || !urlStr.startsWith('http')) {
            targetOrigin = window.location.origin;
        } else {
            targetOrigin = new URL(urlStr).origin;
        }
    } catch {
        targetOrigin = window.location.origin;
    }

    // Check if target is trusted
    const isTrustedOrigin = ALLOWED_ORIGINS.some(
        allowed => targetOrigin.startsWith(allowed) || targetOrigin.includes('vercel.app') // Includes preview URLs
    );

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

    // Inject Supabase Auth Token for OUR trusted app endpoints only.
    // Note: we consider both 'Authorization' and 'authorization' since headers are case-insensitive.
    const hasAuthHeader =
        Object.prototype.hasOwnProperty.call(headerObj, 'Authorization') ||
        Object.prototype.hasOwnProperty.call(headerObj, 'authorization');

    if (isTrustedOrigin && !hasAuthHeader) {
        // Find Supabase token in localStorage
        // Pattern: sb-<project-id>-auth-token
        let supabaseToken: string | null = null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const parsed = JSON.parse(item);
                        if (parsed?.access_token && typeof parsed.access_token === 'string') {
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

    // Check if body is FormData - if so, don't manipulate headers to let browser set Content-Type with boundary
    const isFormData = options.body instanceof FormData;

    const newOptions: RequestInit = {
        ...options,
        credentials: 'include',
        headers: isFormData && Object.keys(headerObj).length === 0 ? undefined : headerObj,
    };

    return originalFetch(url, newOptions);
};

export { };

