import { useOrganization } from "@/react-app/context/OrganizationContext";
import { useAuth } from "@/react-app/context/AuthContext";
import { Building2, ChevronDown, Check, Search, X, Globe } from "lucide-react";
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium transition-colors"
      >
        {isAllSelected ? (
          <Globe size={16} className="text-primary-500" />
        ) : (
          <Building2 size={16} className="text-slate-400" />
        )}
        <span className="max-w-[150px] truncate">{selectedOrganization.name}</span>
        {availableOrganizations.length > 1 && (
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && availableOrganizations.length > 1 && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Trocar Organização</span>
            <span className="text-slate-300">{availableOrganizations.length} empresas</span>
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
          <div className={`${showSearch ? 'max-h-60 overflow-y-auto' : ''}`}>
            {/* "All Organizations" option for sys_admin OR user with > 1 orgs */}
            {(isSysAdmin || availableOrganizations.length > 1) && !searchQuery && (
              <button
                onClick={() => {
                  setSelectedOrganization(ALL_ORGS_OPTION as any);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-primary-50 transition-colors border-b border-slate-100
                   ${isAllSelected ? 'bg-primary-50 text-primary-700' : 'text-slate-700'}
                 `}
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-primary-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Todas as Empresas</span>
                    <span className="text-[10px] text-slate-500 uppercase">Ver tudo</span>
                  </div>
                </div>
                {isAllSelected && <Check size={14} className="text-primary-600" />}
              </button>
            )}

            {filteredOrganizations.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                Nenhuma empresa encontrada
              </div>
            ) : (
              filteredOrganizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrganization(org);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors
                     ${selectedOrganization.id === org.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700'}
                   `}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{org.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{org.type === 'master' ? 'Consultoria' : 'Cliente'}</span>
                  </div>
                  {selectedOrganization.id === org.id && <Check size={14} className="text-primary-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

