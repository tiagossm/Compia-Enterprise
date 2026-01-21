import { useState, useRef, useEffect } from 'react';
import { useOrganization, AccessibleOrganization } from '@/react-app/context/OrganizationContext';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';

interface OrganizationSwitcherProps {
    className?: string;
    compact?: boolean;
}

export default function OrganizationSwitcher({ className = '', compact = false }: OrganizationSwitcherProps) {
    const { selectedOrganization, availableOrganizations, setSelectedOrganization, isLoading } = useOrganization();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (org: AccessibleOrganization) => {
        setSelectedOrganization(org);
        setIsOpen(false);
        // Optionally trigger page reload to refresh data for new org
        // window.location.reload();
    };

    // Don't show if only one org available
    if (availableOrganizations.length <= 1) {
        if (selectedOrganization && !compact) {
            return (
                <div className={`flex items-center gap-2 px-3 py-2 text-sm text-slate-600 ${className}`}>
                    <Building2 className="w-4 h-4" />
                    <span className="truncate max-w-[150px]">{selectedOrganization.name}</span>
                </div>
            );
        }
        return null;
    }

    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 text-sm text-slate-500 ${className}`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando...</span>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="truncate max-w-[120px] md:max-w-[180px]">
                    {selectedOrganization?.name || 'Selecionar'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                    <div className="p-2">
                        <p className="text-xs text-slate-500 px-2 py-1 font-medium uppercase tracking-wider">
                            Trocar Organização
                        </p>
                    </div>
                    <ul role="listbox" className="py-1">
                        {availableOrganizations.map((org) => (
                            <li
                                key={org.id}
                                role="option"
                                aria-selected={selectedOrganization?.id === org.id}
                                onClick={() => handleSelect(org)}
                                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors
                  ${selectedOrganization?.id === org.id
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Building2 className="w-4 h-4 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{org.name}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {org.organization_level === 'master' ? 'Master' :
                                                org.organization_level === 'company' ? 'Empresa' : 'Subsidiária'}
                                            {org.is_primary && ' • Principal'}
                                        </p>
                                    </div>
                                </div>
                                {selectedOrganization?.id === org.id && (
                                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
