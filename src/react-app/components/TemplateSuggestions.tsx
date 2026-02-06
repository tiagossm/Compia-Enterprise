import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Lightbulb, Search } from 'lucide-react';

interface SuggestionItem {
  value: string;
  category?: string;
  description?: string;
}

interface TemplateSuggestionsProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type: 'name' | 'category';
  className?: string;
}

export default function TemplateSuggestions({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  type,
  className = ""
}: TemplateSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestionItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sugestões diversificadas para nomes de templates (Enterprise Vision)
  const nameSuggestions: SuggestionItem[] = [
    // --- Manutenção & Facilities ---
    { value: "Manutenção Preventiva de Ar Condicionado", category: "Manutenção", description: "Verificação periódica de sistemas HVAC" },
    { value: "Ronda de Manutenção Predial", category: "Facilities", description: "Inspeção geral de infraestrutura e instalações" },
    { value: "Checklist de Manutenção de Frota", category: "Logística", description: "Verificação de condições dos veículos da empresa" },
    { value: "Inspeção de Geradores e Elétrica", category: "Manutenção", description: "Verificação de sistemas de energia e backup" },
    { value: "Checklist de Limpeza e Conservação", category: "Facilities", description: "Auditoria de qualidade da limpeza dos ambientes" },

    // --- Qualidade & Processos ---
    { value: "Controle de Qualidade em Linha de Produção", category: "Qualidade", description: "Verificação de conformidade de produtos" },
    { value: "Auditoria de Recebimento de Materiais", category: "Logística", description: "Conferência de mercadorias no recebimento" },
    { value: "Checklist de Boas Práticas de Fabricação (BPF)", category: "Qualidade", description: "Para indústrias alimentícias e farmacêuticas" },
    { value: "Inspeção de Padrão Visual (Merchandising)", category: "Varejo", description: "Verificação de layout e exposição de produtos em loja" },
    { value: "Auditoria de Processos ISO 9001", category: "Qualidade", description: "Verificação de conformidade com sistema de gestão" },

    // --- Varejo & Operações ---
    { value: "Checklist de Abertura de Loja", category: "Varejo", description: "Procedimentos diários antes da abertura ao público" },
    { value: "Inspeção de Prevenção de Perdas", category: "Varejo", description: "Verificação de segurança e procedimentos de caixa" },
    { value: "Auditoria de Estoque e Validade", category: "Varejo", description: "Controle de produtos vencidos ou avariados" },
    { value: "Checklist de Fechamento de Turno", category: "Operações", description: "Procedimentos de encerramento de atividades" },
    { value: "Avaliação de Atendimento ao Cliente", category: "Qualidade", description: "Monitoramento da qualidade do serviço prestado" },

    // --- Segurança do Trabalho (Mantido mas não exclusivo) ---
    { value: "Inspeção de EPIs e Segurança", category: "Segurança", description: "Verificação de equipamentos de proteção" },
    { value: "Checklist de Prevenção de Incêndios", category: "Segurança", description: "Verificação de extintores e saídas de emergência" },
    { value: "Inspeção de Segurança em Obras", category: "Segurança", description: "Verificação de canteiros de obras e riscos" },
    { value: "Ronda de Segurança Patrimonial", category: "Segurança", description: "Controle de acesso e perímetro" },
    { value: "Checklist NR-12 Máquinas e Equipamentos", category: "Segurança", description: "Conformidade de proteção de máquinas" },

    // --- Tecnologia & TI ---
    { value: "Inventário de Equipamentos de TI", category: "TI", description: "Controle de ativos de tecnologia" },
    { value: "Checklist de Setup de Estação de Trabalho", category: "TI", description: "Padronização de novos postos de trabalho" },
    { value: "Inspeção de Sala de Servidores (Data Center)", category: "TI", description: "Verificação de temperatura e segurança física" },

    // --- Sustentabilidade & Meio Ambiente ---
    { value: "Auditoria de Gestão de Resíduos", category: "Meio Ambiente", description: "Verificação de coleta seletiva e descarte" },
    { value: "Checklist de Eficiência Energética", category: "Sustentabilidade", description: "Identificação de desperdícios de energia" },
    { value: "Inspeção de Tratamento de Efluentes", category: "Meio Ambiente", description: "Monitoramento de estação de tratamento" }
  ];

  // Sugestões padronizadas para categorias (Enterprise Vision)
  const categorySuggestions: SuggestionItem[] = [
    { value: "Manutenção", description: "Manutenção preventiva, corretiva e preditiva" },
    { value: "Qualidade", description: "Controle de qualidade, ISO e padronização" },
    { value: "Operações", description: "Procedimentos operacionais e rotinas diárias" },
    { value: "Segurança do Trabalho", description: "Saúde e segurança ocupacional (SST)" },
    { value: "Facilities", description: "Limpeza, conservação e infraestrutura predial" },
    { value: "Varejo", description: "Lojas, merchandising e prevenção de perdas" },
    { value: "Logística", description: "Frota, armazém, recebimento e expedição" },
    { value: "Meio Ambiente", description: "Sustentabilidade e gestão de resíduos" },
    { value: "TI e Tecnologia", description: "Infraestrutura de TI e ativos" },
    { value: "Segurança Patrimonial", description: "Controle de acesso e vigilância" },
    { value: "Auditoria", description: "Auditorias internas e compliance" },
    { value: "Treinamento", description: "Verificação de capacitação e onboarding" },
    { value: "Engenharia", description: "Projetos e obras" },
    { value: "Frota", description: "Inspeção de veículos e equipamentos móveis" }
  ];

  const suggestions = type === 'name' ? nameSuggestions : categorySuggestions;

  // Filter suggestions based on input
  const filterSuggestions = (searchText: string) => {
    if (!searchText.trim()) {
      setFilteredSuggestions(suggestions.slice(0, 8)); // Show top 8 by default
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = suggestions.filter(suggestion =>
      suggestion.value.toLowerCase().includes(searchLower) ||
      (suggestion.description && suggestion.description.toLowerCase().includes(searchLower)) ||
      (suggestion.category && suggestion.category.toLowerCase().includes(searchLower))
    );

    setFilteredSuggestions(filtered.slice(0, 10)); // Show max 10 filtered results
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    filterSuggestions(newValue);

    if (!showSuggestions) {
      setShowSuggestions(true);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SuggestionItem) => {
    onChange(suggestion.value);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Handle input focus
  const handleFocus = () => {
    filterSuggestions(value);
    setShowSuggestions(true);
  };

  // Handle input blur with delay to allow click events
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        <div className="flex items-center gap-1 mt-1">
          <Lightbulb className="w-3 h-3 text-amber-500" />
          <span className="text-xs text-slate-500">Clique no campo para ver sugestões padronizadas</span>
        </div>
      </label>

      <div ref={containerRef} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            id={name}
            name={name}
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            required={required}
            placeholder={placeholder}
            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {showSuggestions && filteredSuggestions.length > 0 && (
              <Search className="w-4 h-4 text-slate-400" />
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">
                  Sugestões padronizadas ({filteredSuggestions.length})
                </span>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur from firing
                    handleSuggestionSelect(suggestion);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-slate-100 last:border-b-0 focus:outline-none focus:bg-blue-50 cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-900 text-sm">{suggestion.value}</span>
                    {suggestion.description && (
                      <span className="text-xs text-slate-600 leading-relaxed">{suggestion.description}</span>
                    )}
                    {suggestion.category && type === 'name' && (
                      <span className="text-xs text-blue-600 font-medium">Categoria: {suggestion.category}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {filteredSuggestions.length === 0 && value.trim() !== '' && (
              <div className="p-4 text-center text-slate-500 text-sm">
                Nenhuma sugestão encontrada para "{value}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
