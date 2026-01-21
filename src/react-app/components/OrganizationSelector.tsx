import { useOrganization } from "@/react-app/context/OrganizationContext";
import { useAuth } from "@/react-app/context/AuthContext";
import { Building2, ChevronDown, Check, Search, X, Globe, CornerDownLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Special "All Organizations" virtual org
const ALL_ORGS_OPTION = {
  id: 0,
  name: "Todas as Empresas",
  type: "all",
  organization_level: "all",
  role: "sys_admin",
  is_primary: false
};

export function OrganizationSelector() {
  const { selectedOrganization, availableOrganizations, setSelectedOrganization, isLoading } = useOrganization();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSelection, setPendingSelection] = useState<typeof selectedOrganization | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check if user is sys_admin
  const isSysAdmin = ['sys_admin', 'system_admin', 'admin'].includes(user?.profile?.role?.toLowerCase() || '');

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setPendingSelection(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && availableOrganizations.length > 5) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, availableOrganizations.length]);

  if (isLoading) return <div className="h-9 w-32 bg-slate-100 rounded animate-pulse" />;

  if (!selectedOrganization) return null;

  // Filter organizations based on search
  const filteredOrganizations = availableOrganizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show search when more than 5 organizations
  const showSearch = availableOrganizations.length > 5;

  // Check if "All" is selected
  const isAllSelected = selectedOrganization.id === 0;

  // Can open dropdown if sys_admin OR has multiple organizations
  const canOpenDropdown = isSysAdmin || availableOrganizations.length > 1;

  const handleConfirmSelection = (org: typeof selectedOrganization) => {
    setSelectedOrganization(org);
    setIsOpen(false);
    setSearchQuery("");
    setPendingSelection(null);
    window.location.reload(); // Force reload to ensure clean state transition
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => canOpenDropdown && setIsOpen(!isOpen)}
        disabled={!canOpenDropdown}
        className={`flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm font-medium transition-colors
          ${canOpenDropdown ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default opacity-90'}
        `}
      >
        {isAllSelected ? (
          <Globe size={16} className="text-primary-500" />
        ) : (
          <Building2 size={16} className="text-slate-400" />
        )}
        <span className="max-w-[150px] truncate">{selectedOrganization.name}</span>
        {canOpenDropdown && (
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-50">
            <span>Trocar Organização</span>
            <span className="text-slate-300">{availableOrganizations.length} disponíveis</span>
          </div>

          {/* Search Input */}
          {showSearch && (
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar empresa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Organization List */}
          <div className={`${showSearch ? 'max-h-60 overflow-y-auto' : ''} p-1`}>
            {/* "All Organizations" option for sys_admin */}
            {isSysAdmin && !searchQuery && (
              <div className="mb-1">
                <button
                  onClick={() => {
                    if (pendingSelection?.id === 0) {
                      handleConfirmSelection(ALL_ORGS_OPTION as any);
                    } else {
                      setPendingSelection(ALL_ORGS_OPTION as any);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between rounded-md transition-colors
                     ${(pendingSelection?.id === 0 || (!pendingSelection && isAllSelected)) ? 'bg-primary-50 ring-1 ring-primary-100' : 'hover:bg-slate-50'}
                   `}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary-100 rounded-md text-primary-600">
                      <Globe size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${(pendingSelection?.id === 0 || (!pendingSelection && isAllSelected)) ? 'text-primary-900' : 'text-slate-700'}`}>
                        Todas as Empresas
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">Visão Global</span>
                    </div>
                  </div>

                  {/* Confirm Button for "All" */}
                  {pendingSelection?.id === 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmSelection(ALL_ORGS_OPTION as any);
                      }}
                      className="ml-2 p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-sm cursor-pointer animate-in fade-in zoom-in duration-200 flex-shrink-0"
                      title="Confirmar troca (Enter)"
                    >
                      <CornerDownLeft size={14} strokeWidth={3} />
                    </div>
                  )}

                  {!pendingSelection && isAllSelected && <Check size={16} className="text-primary-600" />}
                </button>
              </div>
            )}

            {filteredOrganizations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Building2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhuma empresa encontrada</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredOrganizations.map(org => {
                  const isSelected = !pendingSelection && selectedOrganization.id === org.id;
                  const isPending = pendingSelection?.id === org.id;

                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        if (pendingSelection?.id === org.id) {
                          handleConfirmSelection(org);
                        } else {
                          setPendingSelection(org);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between rounded-md transition-all
                         ${(isPending || isSelected) ? 'bg-primary-50 ring-1 ring-primary-100' : 'hover:bg-slate-50'}
                       `}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-md flex-shrink-0 ${org.type === 'master' ? 'bg-violet-100 text-violet-600' :
                            org.type === 'consultancy' ? 'bg-blue-100 text-blue-600' :
                              'bg-slate-100 text-slate-500'
                          }`}>
                          <Building2 size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-semibold truncate ${(isPending || isSelected) ? 'text-primary-900' : 'text-slate-700'}`}>
                            {org.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                            <span className="font-medium">{org.role === 'org_admin' ? 'Admin' :
                              org.role === 'system_admin' ? 'SysAdmin' :
                                org.role === 'inspector' ? 'Inspetor' : 'Membro'}</span>
                            <span>•</span>
                            <span>{org.type === 'master' ? 'Master' :
                              org.type === 'consultancy' ? 'Consultoria' :
                                org.type === 'company' ? 'Empresa' : 'Cliente'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Button */}
                      {isPending && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmSelection(org);
                          }}
                          className="ml-2 p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-sm cursor-pointer animate-in fade-in zoom-in duration-200 flex-shrink-0"
                          title="Confirmar troca (Enter)"
                        >
                          <CornerDownLeft size={14} strokeWidth={3} />
                        </div>
                      )}

                      {isSelected && !isPending && <Check size={16} className="text-primary-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

