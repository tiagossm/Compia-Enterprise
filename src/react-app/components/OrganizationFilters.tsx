import { useState } from 'react';
import { 
  Search, 
  X, 
  Building2, 
  Calendar,
  Users,
  Activity,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';

interface OrganizationFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string[];
    status: string[];
    plan: string[];
    userCountRange: [number, number];
    dateRange: [string, string];
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export default function OrganizationFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters
}: OrganizationFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const hasActiveFilters = 
    filters.type.length > 0 ||
    filters.status.length > 0 ||
    filters.plan.length > 0 ||
    filters.userCountRange[0] > 0 ||
    filters.userCountRange[1] < 1000 ||
    filters.dateRange[0] !== '' ||
    filters.dateRange[1] !== '';

  const handleTypeChange = (type: string) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type];
    onFiltersChange({ ...filters, type: newTypes });
  };

  const handleStatusChange = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handlePlanChange = (plan: string) => {
    const newPlans = filters.plan.includes(plan)
      ? filters.plan.filter(p => p !== plan)
      : [...filters.plan, plan];
    onFiltersChange({ ...filters, plan: newPlans });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {/* Barra de pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, CNPJ, email..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Filtros por tipo */}
        <div className="flex gap-2">
          {['company', 'consultancy', 'client'].map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filters.type.includes(type)
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <Building2 className="inline h-3 w-3 mr-1" />
              {type === 'company' ? 'Empresa' : type === 'consultancy' ? 'Consultoria' : 'Cliente'}
            </button>
          ))}
        </div>

        {/* Filtros por status */}
        <div className="flex gap-2">
          {[
            { key: 'active', label: 'Ativo', color: 'green' },
            { key: 'inactive', label: 'Inativo', color: 'red' }
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filters.status.includes(key)
                  ? `bg-${color}-100 text-${color}-700 border border-${color}-200`
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <Activity className="inline h-3 w-3 mr-1" />
              {label}
            </button>
          ))}
        </div>

        {/* Botão de filtros avançados */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            showAdvancedFilters || hasActiveFilters
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filtros Avançados
          <ChevronDown className={`h-3 w-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              !
            </span>
          )}
        </button>

        {/* Limpar filtros */}
        {(hasActiveFilters || searchTerm) && (
          <button
            onClick={() => {
              onClearFilters();
              onSearchChange('');
            }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="inline h-3 w-3 mr-1" />
            Limpar tudo
          </button>
        )}
      </div>

      {/* Filtros avançados */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Planos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planos de Assinatura
              </label>
              <div className="space-y-2">
                {['basic', 'pro', 'enterprise'].map((plan) => (
                  <label key={plan} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.plan.includes(plan)}
                      onChange={() => handlePlanChange(plan)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      {plan === 'basic' ? 'Básico' : plan === 'pro' ? 'Profissional' : 'Empresarial'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Faixa de usuários */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Número de Usuários
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={filters.userCountRange[0]}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      userCountRange: [parseInt(e.target.value) || 0, filters.userCountRange[1]]
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Min"
                  />
                  <span className="text-gray-400">até</span>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={filters.userCountRange[1]}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      userCountRange: [filters.userCountRange[0], parseInt(e.target.value) || 1000]
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {/* Período de criação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Período de Criação
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange[0]}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    dateRange: [e.target.value, filters.dateRange[1]]
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="date"
                  value={filters.dateRange[1]}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    dateRange: [filters.dateRange[0], e.target.value]
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
