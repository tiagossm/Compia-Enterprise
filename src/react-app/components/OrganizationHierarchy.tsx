import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import {
  Building2,
  Users,
  Plus,
  ChevronRight,
  ChevronDown,
  Settings,
  UserPlus,
  Crown,
  Shield
} from 'lucide-react';
import { ExtendedMochaUser, Organization, USER_ROLES, ORGANIZATION_LEVELS } from '@/shared/user-types';
import UserAssignmentModal from './UserAssignmentModal';

interface OrganizationHierarchyProps {
  onOrganizationSelect?: (org: Organization) => void;
  selectedOrganizationId?: number;
  onNewOrganization?: () => void;
}

export default function OrganizationHierarchy({
  onOrganizationSelect,
  selectedOrganizationId,
  onNewOrganization
}: OrganizationHierarchyProps) {
  const { user } = useAuth();
  const extendedUser = user as ExtendedMochaUser;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<number>>(new Set());
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedOrgForAssignment, setSelectedOrgForAssignment] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      console.log('OrganizationHierarchy: Fetching organizations...');
      const response = await fetch('/api/organizations/hierarchy');
      if (response.ok) {
        const data = await response.json();
        console.log('OrganizationHierarchy: Received data:', data);
        setOrganizations(data.organizations || []);
      } else {
        console.error('OrganizationHierarchy: Error response:', response.status, response.statusText);
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error fetching organization hierarchy:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (orgId: number) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  const handleAssignUser = (org: Organization) => {
    setSelectedOrgForAssignment(org);
    setShowAssignmentModal(true);
  };

  const getOrganizationIcon = (level: string) => {
    switch (level) {
      case ORGANIZATION_LEVELS.MASTER:
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case ORGANIZATION_LEVELS.COMPANY:
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case ORGANIZATION_LEVELS.SUBSIDIARY:
        return <Building2 className="w-4 h-4 text-green-600" />;
      default:
        return <Building2 className="w-4 h-4 text-slate-600" />;
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case ORGANIZATION_LEVELS.MASTER: return 'Master';
      case ORGANIZATION_LEVELS.COMPANY: return 'Empresa';
      case ORGANIZATION_LEVELS.SUBSIDIARY: return 'Subsidiária';
      default: return level;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageOrganization = (org: Organization) => {
    if (extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN || extendedUser?.profile?.role === 'sys_admin') {
      return true;
    }

    if (extendedUser?.profile?.role === USER_ROLES.ORG_ADMIN) {
      return org.id === extendedUser.profile.managed_organization_id ||
        org.parent_organization_id === extendedUser.profile.managed_organization_id;
    }

    return false;
  };

  const canAssignUsers = (org: Organization) => {
    return canManageOrganization(org) && extendedUser?.profile?.can_manage_users;
  };

  const buildHierarchy = (orgs: Organization[]): Organization[] => {
    const orgMap = new Map<number, Organization>();
    const rootOrgs: Organization[] = [];

    // Create map and initialize subsidiaries array
    orgs.forEach(org => {
      orgMap.set(org.id, { ...org, subsidiaries: [] });
    });

    // Build hierarchy
    orgs.forEach(org => {
      const orgWithSubsidiaries = orgMap.get(org.id)!;
      if (org.parent_organization_id) {
        const parent = orgMap.get(org.parent_organization_id);
        if (parent) {
          parent.subsidiaries!.push(orgWithSubsidiaries);
        }
      } else {
        rootOrgs.push(orgWithSubsidiaries);
      }
    });

    return rootOrgs;
  };

  const renderOrganization = (org: Organization, level: number = 0) => {
    const hasSubsidiaries = org.subsidiaries && org.subsidiaries.length > 0;
    const isExpanded = expandedOrgs.has(org.id);
    const isSelected = selectedOrganizationId === org.id;
    const indentClass = level > 0 ? `ml-${level * 6}` : '';

    return (
      <div key={org.id} className="space-y-2">
        <div
          className={`
            flex items-center justify-between p-3 rounded-lg border transition-all duration-200
            ${isSelected
              ? 'bg-blue-50 border-blue-200 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }
            ${indentClass}
          `}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasSubsidiaries && (
              <button
                onClick={() => toggleExpanded(org.id)}
                className="p-1 mr-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}

            <div
              className="flex items-center flex-1 min-w-0 cursor-pointer"
              onClick={() => onOrganizationSelect?.(org)}
            >
              <div className="p-2 bg-slate-100 rounded-lg mr-3">
                {getOrganizationIcon(org.organization_level || '')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-slate-900 truncate">
                    {org.name}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(org.subscription_status || '')}`}>
                    {org.subscription_status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {getLevelLabel(org.organization_level || '')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {org.user_count || 0} usuários
                  </span>
                  {org.subscription_plan && (
                    <span className="capitalize">
                      {org.subscription_plan}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {canManageOrganization(org) && (
            <div className="flex items-center gap-1 ml-2">
              {canAssignUsers(org) && (
                <button
                  onClick={() => handleAssignUser(org)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Atribuir usuário"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => onOrganizationSelect?.(org)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {hasSubsidiaries && isExpanded && (
          <div className="space-y-2">
            {org.subsidiaries!.map(subsidiary =>
              renderOrganization(subsidiary, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hierarchicalOrgs = buildHierarchy(organizations);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Hierarquia Organizacional
        </h2>

        <button
          onClick={onNewOrganization}
          className="flex items-center px-3 py-1.5 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova Organização
        </button>
      </div>

      {hierarchicalOrgs.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            Nenhuma organização encontrada
          </p>
          <p className="text-slate-400 text-sm">
            Entre em contato com o administrador do sistema
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {hierarchicalOrgs.map(org => renderOrganization(org))}
        </div>
      )}

      {showAssignmentModal && selectedOrgForAssignment && (
        <UserAssignmentModal
          organizationIds={[selectedOrgForAssignment.id]}
          organizationName={selectedOrgForAssignment.name}
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedOrgForAssignment(null);
          }}
          onSuccess={() => {
            // Refresh to update user counts and lists
            fetchOrganizations();
          }}
        />
      )}
    </div>
  );
}
