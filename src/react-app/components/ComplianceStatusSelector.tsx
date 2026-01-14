import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MinusCircle, HelpCircle, CheckCircle2 } from 'lucide-react';

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'not_applicable' | 'unanswered';

interface ComplianceStatusSelectorProps {
  value?: ComplianceStatus;
  onChange: (status: ComplianceStatus) => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  compact?: boolean; // Icon-only mode
}

const statusOptions = [
  {
    value: 'compliant' as ComplianceStatus,
    label: 'Conforme',
    shortLabel: '👍',
    description: 'Item em conformidade',
    icon: ThumbsUp,
    color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    activeColor: 'bg-green-600 text-white border-green-600'
  },
  {
    value: 'non_compliant' as ComplianceStatus,
    label: 'Não Conforme',
    shortLabel: '👎',
    description: 'Item não conforme',
    icon: ThumbsDown,
    color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    activeColor: 'bg-red-600 text-white border-red-600'
  },
  {
    value: 'not_applicable' as ComplianceStatus,
    label: 'N/A',
    shortLabel: '—',
    description: 'Não aplicável',
    icon: MinusCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    activeColor: 'bg-blue-600 text-white border-blue-600'
  },
  {
    value: 'unanswered' as ComplianceStatus,
    label: '?',
    shortLabel: '?',
    description: 'Aguardando avaliação',
    icon: HelpCircle,
    color: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200',
    activeColor: 'bg-slate-600 text-white border-slate-600'
  }
];

export default function ComplianceStatusSelector({
  value = 'unanswered',
  onChange,
  disabled = false,
  size = 'md',
  compact = false
}: ComplianceStatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const selectedOption = statusOptions.find(option => option.value === value) || statusOptions[3];

  const handleSelect = (status: ComplianceStatus) => {
    onChange(status);
    setIsOpen(false);
  };

  const sizeClasses = {
    xs: 'px-1.5 py-1 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={disabled}
        className={`
          inline-flex items-center ${compact ? 'gap-0' : 'gap-1.5'} rounded-lg border font-medium transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
          ${value === 'unanswered' ? selectedOption.color : selectedOption.activeColor}
          ${compact ? 'px-2 py-1.5' : sizeClasses[size]}
        `}
        aria-label={`Status: ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <selectedOption.icon className={iconSizes[size]} aria-hidden="true" />
        {!compact && <span>{selectedOption.label}</span>}
        {!disabled && !compact && (
          <svg
            className={`${iconSizes[size]} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isOpen && !disabled && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-30 animate-fade-in"
          role="tooltip"
        >
          {selectedOption.description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute top-full left-0 mt-2 min-w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 animate-scale-in"
            role="listbox"
            aria-label="Opções de status de conformidade"
          >
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors
                  ${option.value === value ? 'bg-blue-50' : ''}
                  ${option === statusOptions[0] ? 'rounded-t-lg' : ''}
                  ${option === statusOptions[statusOptions.length - 1] ? 'rounded-b-lg' : ''}
                `}
                role="option"
                aria-selected={option.value === value}
              >
                <option.icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${option.value === value ? 'text-blue-900' : 'text-slate-900'}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {option.description}
                  </div>
                </div>
                {option.value === value && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" aria-label="Selecionado" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
