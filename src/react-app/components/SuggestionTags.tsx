import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface SuggestionTag {
  value: string;
  label: string;
}

interface SuggestionTagsProps {
  label?: string;
  apiEndpoint: string;
  onTagSelect: (value: string) => void;
  className?: string;
  maxTags?: number;
  placeholder?: string;
}

export default function SuggestionTags({
  label,
  apiEndpoint,
  onTagSelect,
  className = "",
  maxTags = 6,
  placeholder = "Tags sugeridas aparecerão aqui"
}: SuggestionTagsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionTag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, [apiEndpoint]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      // Fetch suggestions without search to get popular/default options
      const response = await fetchWithAuth(`${apiEndpoint}?search=`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions((data.suggestions || []).slice(0, maxTags));
      }
    } catch (error) {
      console.error('Erro ao buscar tags de sugestão:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (suggestion: SuggestionTag) => {
    onTagSelect(suggestion.value);
  };

  if (loading) {
    return (
      <div className={`mt-2 ${className}`}>
        {label && (
          <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="px-3 py-1.5 bg-slate-100 text-slate-400 text-sm rounded-full animate-pulse"
            >
              Carregando...
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={`mt-2 ${className}`}>
        {label && (
          <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
        )}
        <p className="text-xs text-slate-400 italic">{placeholder}</p>
      </div>
    );
  }

  return (
    <div className={`mt-2 ${className}`}>
      {label && (
        <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleTagClick(suggestion)}
            className="group flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 text-sm rounded-full hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:text-blue-800 transition-all duration-200 hover:shadow-md"
            title={`Clique para usar: ${suggestion.label}`}
          >
            <Plus className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
            <span className="font-medium">{suggestion.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-2 opacity-75">
        💡 Clique nas tags acima para preencher automaticamente
      </p>
    </div>
  );
}
