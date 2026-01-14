import React, { useState } from 'react';
import {
  Building2,
  Users,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Archive,
  RotateCcw,
  Building,
  Mail
} from 'lucide-react';

import { Organization } from '../../shared/types';

interface HierarchyOrganization extends Organization {
  children?: HierarchyOrganization[];
}

interface EnhancedOrganizationHierarchyProps {
  organizations: HierarchyOrganization[];
  selectedOrganization: Organization | null;
  selectedOrganizations: Organization[];
  onOrganizationSelect: (organization: Organization) => void;
  onToggleSelection: (organizationId: number) => void;
  onEdit: (organization: Organization) => void;
  onDelete: (organization: Organization) => void;
  onAssignUser: (organization: Organization) => void;
  onToggleActive: (organization: Organization) => void;
  userCounts: Record<number, number>;
  viewMode: 'tree' | 'cards' | 'list';
}

interface TreeNodeProps {
  organization: HierarchyOrganization;
  children: HierarchyOrganization[];
  level: number;
  isExpanded: boolean;
  onToggleExpand: (orgId: number) => void;
  selectedOrganization: Organization | null;
  selectedOrganizations: Organization[];
  onOrganizationSelect: (organization: Organization) => void;
  onToggleSelection: (organizationId: number) => void;
  onEdit: (organization: Organization) => void;
  onDelete: (organization: Organization) => void;
  onAssignUser: (organization: Organization) => void;
  onToggleActive: (organization: Organization) => void;
  userCounts: Record<number, number>;
}

function TreeNode({
  organization,
  children,
  level,
  isExpanded,
  onToggleExpand,
  selectedOrganization,
  selectedOrganizations,
  onOrganizationSelect,
  onToggleSelection,
  onEdit,
  onDelete,
  onAssignUser,
  onToggleActive,
  userCounts
}: TreeNodeProps) {
  const [showActions, setShowActions] = useState(false);
  const isSelected = selectedOrganization?.id === organization.id;
  const isChecked = selectedOrganizations.some(org => org.id === organization.id);
  const userCount = userCounts[organization.id] || 0;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(organization.id);
  };

  const handleSelect = () => {
    onOrganizationSelect(organization);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultancy':
        return <Building className="h-4 w-4" />;
      case 'client':
        return <Users className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultancy':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'client':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'text-green-600 bg-green-50'
      : 'text-red-600 bg-red-50';
  };

  return (
    <div className="relative">
      {/* Conectores visuais */}
      {level > 0 && (
        <>
          {/* Linha horizontal */}
          <div
            className="absolute left-0 top-6 w-6 h-px bg-gray-300"
            style={{ left: `${(level - 1) * 24 + 12}px` }}
          />
          {/* Linha vertical */}
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-300"
            style={{ left: `${(level - 1) * 24 + 12}px` }}
          />
        </>
      )}

      {/* Card da organização */}
      <div
        className={`relative mb-2 p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer group hover:shadow-md ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={handleSelect}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Checkbox de seleção */}
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleSelection(organization.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />

            {/* Botão de expansão */}
            {children.length > 0 && (
              <button
                onClick={handleToggleExpand}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                )}
              </button>
            )}

            {/* Ícone e informações da organização */}
            <div className={`p-2 rounded-lg border ${getTypeColor(organization.type)}`}>
              {getTypeIcon(organization.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {organization.name}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(organization.is_active)}`}>
                  {organization.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {userCount} usuário{userCount !== 1 ? 's' : ''}
                </span>
                {children.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {children.length} subsidiária{children.length !== 1 ? 's' : ''}
                  </span>
                )}
                {organization.subscription_plan && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {organization.subscription_plan === 'basic' ? 'Básico' :
                      organization.subscription_plan === 'pro' ? 'Pro' : 'Enterprise'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botão de ações */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>

            {/* Menu de ações */}
            {showActions && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-48">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOrganizationSelect(organization);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Detalhes
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(organization);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssignUser(organization);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Atribuir Usuário
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive(organization);
                    setShowActions(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${organization.is_active ? 'text-orange-600' : 'text-green-600'
                    }`}
                >
                  {organization.is_active ? (
                    <>
                      <Archive className="h-4 w-4" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Ativar
                    </>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(organization);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organizações filhas */}
      {isExpanded && children.length > 0 && (
        <div className="relative">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              organization={child}
              children={child.children || []}
              level={level + 1}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
              selectedOrganization={selectedOrganization}
              selectedOrganizations={selectedOrganizations}
              onOrganizationSelect={onOrganizationSelect}
              onToggleSelection={onToggleSelection}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignUser={onAssignUser}
              onToggleActive={onToggleActive}
              userCounts={userCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EnhancedOrganizationHierarchy({
  organizations,
  selectedOrganization,
  selectedOrganizations,
  onOrganizationSelect,
  onToggleSelection,
  onEdit,
  onDelete,
  onAssignUser,
  onToggleActive,
  userCounts,
  viewMode
}: EnhancedOrganizationHierarchyProps) {
  // Initialize with all parent organizations expanded by default
  const [expandedOrgs, setExpandedOrgs] = useState<Set<number>>(() => {
    const parentsWithChildren = new Set<number>();
    organizations.forEach(org => {
      if (org.parent_organization_id) {
        parentsWithChildren.add(org.parent_organization_id);
      }
    });
    return parentsWithChildren;
  });

  const handleToggleExpand = (orgId: number) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  // Criar árvore hierárquica recursiva
  const buildHierarchy = (orgs: Organization[]): HierarchyOrganization[] => {
    const rootOrganizations = orgs.filter(org => !org.parent_organization_id);

    const buildChildren = (parentId: number): HierarchyOrganization[] => {
      const children = orgs.filter(org => org.parent_organization_id === parentId);
      return children.map(child => ({
        ...child,
        children: buildChildren(child.id)
      }));
    };

    return rootOrganizations.map(org => ({
      ...org,
      children: buildChildren(org.id)
    }));
  };

  const hierarchicalOrgs = buildHierarchy(organizations);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultancy':
        return <Building className="h-4 w-4" />;
      case 'client':
        return <Users className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultancy':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'client':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'text-green-600 bg-green-50'
      : 'text-red-600 bg-red-50';
  };

  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map((organization) => (
          <div
            key={organization.id}
            className={`p-6 border-2 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md ${selectedOrganization?.id === organization.id
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            onClick={() => onOrganizationSelect(organization)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg border ${getTypeColor(organization.type)}`}>
                {getTypeIcon(organization.type)}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(organization.is_active)}`}>
                {organization.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {organization.name}
            </h3>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{userCounts[organization.id] || 0} usuários</span>
              </div>

              {organization.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{organization.contact_email}</span>
                </div>
              )}

              {organization.subscription_plan && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {organization.subscription_plan === 'basic' ? 'Básico' :
                      organization.subscription_plan === 'pro' ? 'Pro' : 'Enterprise'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {organizations.map((organization) => (
          <div
            key={organization.id}
            className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:shadow-sm ${selectedOrganization?.id === organization.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            onClick={() => onOrganizationSelect(organization)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedOrganizations.some(org => org.id === organization.id)}
                  onChange={() => onToggleSelection(organization.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                <div className={`p-2 rounded-lg border ${getTypeColor(organization.type)}`}>
                  {getTypeIcon(organization.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {organization.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{userCounts[organization.id] || 0} usuários</span>
                    {organization.contact_email && (
                      <span className="truncate">{organization.contact_email}</span>
                    )}
                  </div>
                </div>

                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(organization.is_active)}`}>
                  {organization.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Visualização em árvore (padrão)
  return (
    <div className="space-y-1">
      {hierarchicalOrgs.map((organization) => (
        <TreeNode
          key={organization.id}
          organization={organization}
          children={organization.children || []}
          level={0}
          isExpanded={expandedOrgs.has(organization.id)}
          onToggleExpand={handleToggleExpand}
          selectedOrganization={selectedOrganization}
          selectedOrganizations={selectedOrganizations}
          onOrganizationSelect={onOrganizationSelect}
          onToggleSelection={onToggleSelection}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssignUser={onAssignUser}
          onToggleActive={onToggleActive}
          userCounts={userCounts}
        />
      ))}
    </div>
  );
}
