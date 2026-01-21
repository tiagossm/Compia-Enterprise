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

        // Fetch organizations from the new API endpoint
        const fetchOrganizations = async () => {
            try {
                const response = await fetch('/api/users/me/organizations', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    const orgs: AccessibleOrganization[] = data.organizations || [];
                    setAvailableOrganizations(orgs);

                    // Persist/Restore logic
                    const storedOrgId = localStorage.getItem('compia_selected_org_id');
                    let targetOrg = null;

                    // Handle "All Organizations" (ID 0) for SysAdmin
                    const isSysAdmin = user?.profile?.role === 'system_admin' || user?.profile?.role === 'sys_admin';

                    if (storedOrgId === '0' && isSysAdmin) {
                        targetOrg = {
                            id: 0,
                            name: "Todas as Empresas",
                            type: "all",
                            organization_level: "all",
                            role: "sys_admin",
                            is_primary: false
                        };
                    } else if (storedOrgId) {
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
                } else {
                    console.error('Failed to fetch user organizations');
                }
            } catch (error) {
                console.error('Error fetching organizations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrganizations();

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
