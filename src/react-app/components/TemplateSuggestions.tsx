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

  // Sugestões padronizadas para nomes de templates
  const nameSuggestions: SuggestionItem[] = [
    // Segurança do Trabalho
    { value: "Checklist de EPIs", category: "Segurança", description: "Verificação de equipamentos de proteção individual" },
    { value: "Inspeção de Segurança no Trabalho", category: "Segurança", description: "Avaliação geral das condições de segurança" },
    { value: "Checklist de Equipamentos de Emergência", category: "Segurança", description: "Verificação de extintores, saídas de emergência, etc." },
    { value: "Inspeção de CIPA", category: "Segurança", description: "Verificação das atividades da Comissão Interna de Prevenção de Acidentes" },
    { value: "Checklist de Segurança em Máquinas", category: "Segurança", description: "Verificação de dispositivos de segurança em máquinas" },
    { value: "Inspeção de Sinalização de Segurança", category: "Segurança", description: "Verificação da sinalização de segurança do trabalho" },
    { value: "Checklist de Proteções Coletivas", category: "Segurança", description: "Verificação de equipamentos de proteção coletiva" },
    { value: "Inspeção de Brigada de Incêndio", category: "Segurança", description: "Avaliação da prontidão da brigada de incêndio" },
    { value: "Checklist de Investigação de Acidentes", category: "Segurança", description: "Procedimentos para investigação de acidentes de trabalho" },
    { value: "Inspeção de Segurança Patrimonial", category: "Segurança", description: "Verificação de sistemas de segurança patrimonial" },

    // Higiene Ocupacional
    { value: "Checklist de Higiene e Limpeza", category: "Higiene", description: "Avaliação das condições de higiene do ambiente" },
    { value: "Inspeção de Higiene Alimentar", category: "Higiene", description: "Verificação das condições de higiene em cozinhas e refeitórios" },
    { value: "Checklist de Sanitários e Vestiários", category: "Higiene", description: "Verificação das condições de sanitários e vestiários" },
    { value: "Inspeção de Higiene Industrial", category: "Higiene", description: "Avaliação de riscos químicos, físicos e biológicos" },
    { value: "Checklist de Controle de Pragas", category: "Higiene", description: "Verificação do controle de pragas e vetores" },
    { value: "Inspeção de Qualidade do Ar", category: "Higiene", description: "Monitoramento da qualidade do ar interno" },

    // Meio Ambiente
    { value: "Checklist de Gestão Ambiental", category: "Meio Ambiente", description: "Avaliação do sistema de gestão ambiental" },
    { value: "Inspeção de Resíduos Sólidos", category: "Meio Ambiente", description: "Verificação do gerenciamento de resíduos" },
    { value: "Checklist de Efluentes Líquidos", category: "Meio Ambiente", description: "Monitoramento de efluentes e águas residuárias" },
    { value: "Inspeção de Emissões Atmosféricas", category: "Meio Ambiente", description: "Verificação do controle de emissões gasosas" },
    { value: "Checklist de Licenciamento Ambiental", category: "Meio Ambiente", description: "Verificação da conformidade com licenças ambientais" },
    { value: "Inspeção de Áreas de Preservação", category: "Meio Ambiente", description: "Verificação de áreas de preservação permanente" },
    { value: "Checklist de Sustentabilidade", category: "Meio Ambiente", description: "Avaliação de práticas sustentáveis" },
    { value: "Inspeção de Recursos Hídricos", category: "Meio Ambiente", description: "Monitoramento do uso de recursos hídricos" },

    // Aspectos Psicossociais
    { value: "Checklist de Clima Organizacional", category: "Psicossocial", description: "Avaliação do clima e ambiente de trabalho" },
    { value: "Inspeção de Ergonomia Cognitiva", category: "Psicossocial", description: "Verificação da carga mental de trabalho" },
    { value: "Checklist de Prevenção ao Assédio", category: "Psicossocial", description: "Verificação de medidas preventivas contra assédio" },
    { value: "Inspeção de Bem-Estar no Trabalho", category: "Psicossocial", description: "Avaliação do bem-estar dos colaboradores" },
    { value: "Checklist de Gestão do Estresse", category: "Psicossocial", description: "Verificação de fatores de estresse ocupacional" },
    { value: "Inspeção de Comunicação Interna", category: "Psicossocial", description: "Avaliação da comunicação organizacional" },
    { value: "Checklist de Motivação e Engajamento", category: "Psicossocial", description: "Verificação de fatores motivacionais" },

    // Organização do Trabalho e 5S
    { value: "Checklist 5S - Seiri (Utilização)", category: "5S", description: "Verificação da organização e descarte de itens desnecessários" },
    { value: "Checklist 5S - Seiton (Organização)", category: "5S", description: "Verificação da arrumação e ordenação dos itens" },
    { value: "Checklist 5S - Seiso (Limpeza)", category: "5S", description: "Verificação da limpeza do ambiente de trabalho" },
    { value: "Checklist 5S - Seiketsu (Padronização)", category: "5S", description: "Verificação da padronização dos processos" },
    { value: "Checklist 5S - Shitsuke (Disciplina)", category: "5S", description: "Verificação da manutenção da disciplina e melhoria" },
    { value: "Inspeção de Organização Geral", category: "Organização", description: "Avaliação geral da organização do trabalho" },
    { value: "Checklist de Layout do Trabalho", category: "Organização", description: "Verificação do layout e fluxo de trabalho" },
    { value: "Inspeção de Produtividade", category: "Organização", description: "Avaliação dos indicadores de produtividade" },

    // Treinamentos
    { value: "Checklist de Treinamento Admissional", category: "Treinamento", description: "Verificação do treinamento de integração" },
    { value: "Inspeção de Capacitação Técnica", category: "Treinamento", description: "Avaliação de treinamentos técnicos específicos" },
    { value: "Checklist de Treinamento em Segurança", category: "Treinamento", description: "Verificação de treinamentos de segurança do trabalho" },
    { value: "Prova de Treinamento NR-10", category: "Treinamento", description: "Avaliação de conhecimento em segurança elétrica" },
    { value: "Prova de Treinamento NR-33", category: "Treinamento", description: "Avaliação de conhecimento em espaços confinados" },
    { value: "Prova de Treinamento NR-35", category: "Treinamento", description: "Avaliação de conhecimento em trabalho em altura" },
    { value: "Checklist de Reciclagem", category: "Treinamento", description: "Verificação de treinamentos de reciclagem" },
    { value: "Inspeção de Competências", category: "Treinamento", description: "Avaliação de competências técnicas e comportamentais" },

    // Ordem de Serviço
    { value: "Checklist de Ordem de Serviço", category: "Ordem de Serviço", description: "Verificação de cumprimento de ordens de serviço" },
    { value: "Inspeção de Autorização de Trabalho", category: "Ordem de Serviço", description: "Verificação de autorizações para trabalhos especiais" },
    { value: "Checklist de Permissão de Trabalho", category: "Ordem de Serviço", description: "Verificação de permissões para trabalhos de risco" },
    { value: "Inspeção de Bloqueio e Etiquetagem", category: "Ordem de Serviço", description: "Verificação de procedimentos LOTO" },
    { value: "Checklist de Trabalho a Quente", category: "Ordem de Serviço", description: "Verificação de trabalhos de soldagem e corte" },

    // Instalações e Equipamentos
    { value: "Inspeção de Máquinas e Equipamentos", category: "Equipamentos", description: "Verificação do estado e funcionamento de equipamentos" },
    { value: "Inspeção de Instalações Elétricas", category: "Instalações", description: "Verificação da segurança elétrica" },
    { value: "Checklist de Caldeiras e Vasos de Pressão", category: "Equipamentos", description: "Inspeção de equipamentos pressurizados" },
    { value: "Inspeção de Ventilação e Climatização", category: "Instalações", description: "Verificação de sistemas de ar condicionado" },
    { value: "Checklist de Ruído e Vibração", category: "Segurança", description: "Avaliação de níveis de ruído e vibração" },
    { value: "Inspeção de Iluminação", category: "Instalações", description: "Verificação das condições de iluminação" },
    { value: "Checklist de Radiações", category: "Segurança", description: "Monitoramento de radiações ionizantes e não-ionizantes" },

    // Trabalhos Especiais
    { value: "Inspeção de Trabalho em Altura", category: "Segurança", description: "Verificação de condições para trabalho em altura" },
    { value: "Checklist de Espaços Confinados", category: "Segurança", description: "Avaliação de segurança em espaços confinados" },
    { value: "Checklist de Soldagem e Corte", category: "Segurança", description: "Verificação de segurança em processos de soldagem" },
    { value: "Inspeção de Trabalho Noturno", category: "Segurança", description: "Verificação de condições para trabalho noturno" },
    { value: "Checklist de Trabalho com Produtos Químicos", category: "Segurança", description: "Verificação do manuseio de substâncias químicas" },

    // Construção Civil
    { value: "Inspeção de Obras e Construção", category: "Construção", description: "Verificação de segurança em obras" },
    { value: "Checklist de Andaimes", category: "Construção", description: "Verificação da segurança de andaimes" },
    { value: "Inspeção de Escavações", category: "Construção", description: "Verificação de segurança em escavações" },
    { value: "Checklist de Demolição", category: "Construção", description: "Verificação de procedimentos de demolição" },
    { value: "Inspeção de Estruturas Metálicas", category: "Construção", description: "Verificação de estruturas e soldas" },

    // Transporte
    { value: "Inspeção de Veículos e Transporte", category: "Transporte", description: "Verificação de segurança de veículos" },
    { value: "Checklist de Empilhadeiras", category: "Transporte", description: "Verificação de empilhadeiras e equipamentos de movimentação" },
    { value: "Inspeção de Materiais Perigosos", category: "Transporte", description: "Verificação do transporte de materiais perigosos" },

    // Normas Regulamentadoras
    { value: "Checklist de NR-01 Gestão SST", category: "Normas", description: "Verificação de conformidade com NR-01" },
    { value: "Checklist de NR-04 SESMT", category: "Normas", description: "Verificação de conformidade com NR-04" },
    { value: "Checklist de NR-05 CIPA", category: "Normas", description: "Verificação de conformidade com NR-05" },
    { value: "Checklist de NR-06 EPI", category: "Normas", description: "Verificação de conformidade com NR-06" },
    { value: "Checklist de NR-07 PCMSO", category: "Normas", description: "Verificação de conformidade com NR-07" },
    { value: "Checklist de NR-09 PPRA", category: "Normas", description: "Verificação de conformidade com NR-09" },
    { value: "Checklist de NR-10 Elétrica", category: "Normas", description: "Verificação de conformidade com NR-10" },
    { value: "Checklist de NR-12 Máquinas", category: "Normas", description: "Verificação de conformidade com NR-12" },
    { value: "Checklist de NR-13 Caldeiras", category: "Normas", description: "Verificação de conformidade com NR-13" },
    { value: "Checklist de NR-15 Insalubridade", category: "Normas", description: "Verificação de conformidade com NR-15" },
    { value: "Checklist de NR-16 Periculosidade", category: "Normas", description: "Verificação de conformidade com NR-16" },
    { value: "Checklist de NR-17 Ergonomia", category: "Normas", description: "Verificação de conformidade com NR-17" },
    { value: "Inspeção de NR-18 Construção", category: "Normas", description: "Verificação de conformidade com NR-18" },
    { value: "Checklist de NR-20 Inflamáveis", category: "Normas", description: "Verificação de conformidade com NR-20" },
    { value: "Checklist de NR-23 Incêndio", category: "Normas", description: "Verificação de conformidade com NR-23" },
    { value: "Checklist de NR-24 Sanitárias", category: "Normas", description: "Verificação de conformidade com NR-24" },
    { value: "Checklist de NR-26 Sinalização", category: "Normas", description: "Verificação de conformidade com NR-26" },
    { value: "Checklist de NR-32 Saúde", category: "Normas", description: "Verificação de conformidade com NR-32" },
    { value: "Inspeção de NR-33 Espaços Confinados", category: "Normas", description: "Verificação de conformidade com NR-33" },
    { value: "Inspeção de NR-35 Trabalho em Altura", category: "Normas", description: "Verificação de conformidade com NR-35" },
    { value: "Checklist de NR-36 Abate e Processamento", category: "Normas", description: "Verificação de conformidade com NR-36" },

    // ISOs e Certificações
    { value: "Checklist ISO 9001 Qualidade", category: "ISO", description: "Verificação de conformidade com ISO 9001" },
    { value: "Checklist ISO 14001 Ambiental", category: "ISO", description: "Verificação de conformidade com ISO 14001" },
    { value: "Checklist ISO 45001 SST", category: "ISO", description: "Verificação de conformidade com ISO 45001" },
    { value: "Checklist OHSAS 18001", category: "ISO", description: "Verificação de conformidade com OHSAS 18001" },
    { value: "Inspeção de Certificação", category: "Conformidade", description: "Preparação para auditorias de certificação" }
  ];

  // Sugestões padronizadas para categorias
  const categorySuggestions: SuggestionItem[] = [
    { value: "Segurança do Trabalho", description: "Checklists relacionados à segurança ocupacional" },
    { value: "Equipamentos de Proteção", description: "Verificação de EPIs e EPCs" },
    { value: "Máquinas e Equipamentos", description: "Inspeção de equipamentos industriais" },
    { value: "Instalações Elétricas", description: "Verificação de segurança elétrica" },
    { value: "Higiene Ocupacional", description: "Avaliação de condições de higiene" },
    { value: "Meio Ambiente", description: "Checklists ambientais e sustentabilidade" },
    { value: "Ergonomia", description: "Avaliação ergonômica dos postos de trabalho" },
    { value: "Construção Civil", description: "Inspeções específicas para obras e construção" },
    { value: "Transporte e Logística", description: "Verificação de veículos e processos logísticos" },
    { value: "Produtos Químicos", description: "Manuseio e armazenamento de químicos" },
    { value: "Trabalho em Altura", description: "Procedimentos para trabalho em altura" },
    { value: "Espaços Confinados", description: "Entrada e trabalho em espaços confinados" },
    { value: "Combate a Incêndio", description: "Equipamentos e procedimentos de emergência" },
    { value: "Primeiros Socorros", description: "Equipamentos e procedimentos médicos" },
    { value: "Qualidade", description: "Controle e gestão da qualidade" },
    { value: "Manutenção", description: "Procedimentos de manutenção preventiva" },
    { value: "Operações", description: "Procedimentos operacionais padrão" },
    { value: "Treinamento", description: "Verificação de treinamentos e capacitações" },
    { value: "Documentação", description: "Controle de documentos e registros" },
    { value: "Auditoria", description: "Checklists para auditorias internas" },
    { value: "Normas Regulamentadoras", description: "Conformidade com NRs do Ministério do Trabalho" },
    { value: "ISO 45001", description: "Sistema de gestão de saúde e segurança ocupacional" },
    { value: "OHSAS 18001", description: "Sistemas de gestão de segurança e saúde ocupacional" },
    { value: "Emergência e Contingência", description: "Procedimentos de emergência e planos de contingência" }
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
