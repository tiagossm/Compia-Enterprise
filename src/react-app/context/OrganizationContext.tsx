import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface AccessibleOrganization {
    id: number;
    name: string;
    type: string;
    organization_level: string;
    role: string;
    is_primary: boolean;
}

interface OrganizationContextType {
    selectedOrganization: AccessibleOrganization | null;
    availableOrganizations: AccessibleOrganization[];
    setSelectedOrganization: (org: AccessibleOrganization) => void;
    isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const { user, isPending: authLoading } = useAuth();
    const [selectedOrganization, setSelectedOrgState] = useState<AccessibleOrganization | null>(null);
    const [availableOrganizations, setAvailableOrganizations] = useState<AccessibleOrganization[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Sync with Auth User
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setAvailableOrganizations([]);
            setSelectedOrgState(null);
            setIsLoading(false);
            return;
        }

        const extendedUser = user as any; // Cast to access 'organizations' injected by backend
        const orgs: AccessibleOrganization[] = extendedUser.organizations || [];

        // If empty list but user has organization_id (Legacy support fallback)
        if (orgs.length === 0 && extendedUser.profile?.organization_id) {
            // We might fetching getting name... but let's assume backend covers this now.
            // Or we Mock it if missing.
            // For now, assume backend works correctly.
        }

        setAvailableOrganizations(orgs);

        // Persist/Restore logic
        const storedOrgId = localStorage.getItem('compia_selected_org_id');

        let targetOrg = null;

        if (storedOrgId) {
            targetOrg = orgs.find(o => o.id === Number(storedOrgId)) || null;
        }

        // Default to primary or first
        if (!targetOrg && orgs.length > 0) {
            targetOrg = orgs.find(o => o.is_primary) || orgs[0];
        }

        setSelectedOrgState(targetOrg);

        if (targetOrg) {
            localStorage.setItem('compia_selected_org_id', String(targetOrg.id));
        }

        setIsLoading(false);

    }, [user, authLoading]);

    const setSelectedOrganization = (org: AccessibleOrganization) => {
        setSelectedOrgState(org);
        localStorage.setItem('compia_selected_org_id', String(org.id));
        // Optionally trigger a reload or event if needed, but Context consumers should update automatically
    };

    return (
        <OrganizationContext.Provider value={{
            selectedOrganization,
            availableOrganizations,
            setSelectedOrganization,
            isLoading
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
