import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ExtendedMochaUser } from '../../shared/user-types';
import { fetchWithAuth } from '../utils/auth';

// Re-export supabase for components that need direct access
export { supabase };

interface AuthContextType {
    user: ExtendedMochaUser | null;
    session: Session | null;
    isPending: boolean;
    fetchUser: () => Promise<void>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    exchangeCodeForSessionToken: () => Promise<void>;
    redirectToLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<ExtendedMochaUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isPending, setIsPending] = useState(true);

    const fetchUser = async (currentSession?: Session | null) => {
        try {
            const activeSession = currentSession !== undefined ? currentSession : session;

            if (!activeSession?.user) {
                setUser(null);
                return;
            }

            // Try to get extended profile from API
            try {
                const response = await fetchWithAuth('/api/auth/me');
                if (response.ok) {
                    const userData = await response.json();
                    // Handle both direct user object and nested user.user structure
                    const userObj = userData.user || userData;
                    setUser(userObj);
                    // Cache for offline
                    localStorage.setItem('cached_user_profile', JSON.stringify(userObj));
                } else if (response.status === 401) {
                    console.warn('[AuthContext] API returned 401. Session locally active but API rejected.');
                    // WARNING: Do NOT sign out immediately here. It causes loops if the token is just refreshing.
                    // The API might be rejecting due to a momentary issue or RLS (even though we disabled it).
                    // Let the flow continue - if the user is truly invalid, subsequent calls will fail or AuthGuard will catch it.
                    // setUser(null); 
                    // setSession(null);
                    // await supabase.auth.signOut();
                    return;
                } else if (response.status === 403) {
                    // User exists but pending approval or rejected
                    const errorData = await response.json().catch(() => ({}));
                    console.warn('[AuthContext] User pending approval:', errorData);

                    // Set minimal user with pending status so app can show appropriate UI
                    const pendingUser: any = {
                        id: activeSession.user.id,
                        email: activeSession.user.email,
                        name: activeSession.user.user_metadata?.name || activeSession.user.email,
                        approval_status: errorData.approval_status || 'pending',
                        profile: {
                            id: activeSession.user.id,
                            email: activeSession.user.email,
                            name: activeSession.user.user_metadata?.name || activeSession.user.email,
                            role: 'pending',
                            approval_status: errorData.approval_status || 'pending'
                        }
                    };
                    setUser(pendingUser);
                } else {
                    console.warn('Failed to fetch user profile, using basic session user');
                    // Fallback to mapping Supabase user to ExtendedMochaUser structure
                    const basicUser: any = {
                        ...activeSession.user,
                        name: activeSession.user.user_metadata?.name || activeSession.user.email,
                        profile: {
                            id: activeSession.user.id,
                            email: activeSession.user.email,
                            name: activeSession.user.user_metadata?.name || activeSession.user.email,
                            role: 'inspector'
                        }
                    };
                    setUser(basicUser);
                }
            } catch (err) {
                console.error('Error fetching user profile:', err);

                // Try to load from cache first
                const cachedProfile = localStorage.getItem('cached_user_profile');
                if (cachedProfile) {
                    console.log('Loaded user profile from cache');
                    setUser(JSON.parse(cachedProfile));
                    return;
                }

                // Fallback to basic session
                const basicUser: any = {
                    ...activeSession.user,
                    name: activeSession.user.user_metadata?.name || activeSession.user.email,
                    profile: {
                        id: activeSession.user.id,
                        email: activeSession.user.email,
                        name: activeSession.user.user_metadata?.name || activeSession.user.email,
                        role: 'inspector'
                    }
                };
                setUser(basicUser);
            }
        } catch (error) {
            console.error('Error in fetchUser:', error);
            setUser(null);
        } finally {
            setIsPending(false);
        }
    };

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            fetchUser(session);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            fetchUser(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            // Try to sign out from Supabase server (may fail with 403)
            await supabase.auth.signOut({ scope: 'local' });
        } catch (error) {
            // If server logout fails, log but continue
            console.warn('[AuthContext] Server logout failed, forcing local cleanup:', error);
        }

        // CRITICAL: Force remove Supabase session from localStorage
        // This is necessary because signOut() may fail but session remains cached
        const supabaseLocalStorageKeys = Object.keys(localStorage).filter(key =>
            key.startsWith('sb-') || key.includes('supabase')
        );
        supabaseLocalStorageKeys.forEach(key => localStorage.removeItem(key));

        // Clear app-specific data
        localStorage.removeItem('compia_selected_org_id');
        localStorage.removeItem('cached_user_profile');

        // Clear React state
        setUser(null);
        setSession(null);
    };

    // Google OAuth login
    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });
        if (error) {
            console.error('Google login error:', error);
            throw error;
        }
    };

    const exchangeCodeForSessionToken = async () => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            setSession(data.session);
            if (data.session) await fetchUser(data.session);
        }
    };

    const redirectToLogin = () => {
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, session, isPending, fetchUser, signOut, signInWithGoogle, exchangeCodeForSessionToken, redirectToLogin }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
