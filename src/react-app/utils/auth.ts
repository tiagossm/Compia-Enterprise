// Utility functions for authentication and role checking

export function isSystemAdmin(user: any): boolean {
  if (!user) return false;

  const userRole = user.profile?.role || user.role;
  return userRole === 'system_admin' ||
    userRole === 'sys_admin' ||
    userRole === 'admin' ||
    (user.email && user.email.includes('admin'));
}

export function hasRole(user: any, role: string): boolean {
  if (!user) return false;

  const userRole = user.profile?.role || user.role;
  return userRole === role;
}

export function hasAnyRole(user: any, roles: string[]): boolean {
  return roles.some(role => hasRole(user, role));
}

// Function to make API requests 
// Note: Authorization header with User Token is injected by fetch-setup.ts
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    headers['apikey'] = anonKey;
    // DO NOT set Authorization here. fetch-setup.ts will inject the correct Bearer token.
  }

  // --- Offline & Sync Logic ---
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '');

  if (!navigator.onLine && isMutation) {
    // Offline Mode: Queue mutation
    try {
      const { syncService } = await import('../../lib/sync-service');
      const tempId = -Date.now(); // Temp ID for offline references

      await syncService.enqueueMutation(url, options.method as any, options.body ? JSON.parse(options.body as string) : {}, tempId);
      console.log('[Offline] Mutation queued:', url, 'TempID:', tempId);

      // Return valid fake response to keep UI happy
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Saved offline',
        id: tempId, // Return tempId
        data: { id: tempId }, // Some components might look for data.id
        ...((options.method === 'POST') ? { created_at: new Date().toISOString() } : {})
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Failed to queue offline mutation:', e);
      // If queueing fails, throw error like a normal network failure
      throw e;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies in requests
    });
    return response;
  } catch (error) {
    if (isMutation) {
      // Network Error (e.g. timeout, DNS) - Queue it
      console.log('[Network Error] Queueing mutation:', url);
      const { syncService } = await import('../../lib/sync-service');
      const tempId = -Date.now();

      await syncService.enqueueMutation(url, options.method as any, options.body ? JSON.parse(options.body as string) : {}, tempId);

      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Saved offline (Network Error)',
        id: tempId,
        data: { id: tempId },
        ...((options.method === 'POST') ? { created_at: new Date().toISOString() } : {})
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}
