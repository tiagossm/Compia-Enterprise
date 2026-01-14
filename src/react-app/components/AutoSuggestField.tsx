import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface AutoSuggestOption {
  value: string;
  label: string;
  email?: string;
  address?: string;  // For companies endpoint
  org_id?: number;   // For companies endpoint
}

interface AutoSuggestFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string, email?: string, data?: any) => void;
  placeholder: string;
  required?: boolean;
  apiEndpoint: string;
  onAddNew?: () => void;
  addNewText?: string;
  showEmail?: boolean;
  className?: string;
}

export default function AutoSuggestField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  apiEndpoint,
  onAddNew,
  addNewText = "Adicionar novo",
  showEmail = false,
  className = ""
}: AutoSuggestFieldProps) {
  const [suggestions, setSuggestions] = useState<AutoSuggestOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions based on input (now accepts empty string for initial load)
  const fetchSuggestions = async (searchText: string) => {
    // Only skip if between 1-2 characters (too short to search meaningfully)
    if (searchText.length > 0 && searchText.length < 2) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithAuth(`${apiEndpoint}?search=${encodeURIComponent(searchText)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[AutoSuggestField] API response for', apiEndpoint, ':', data.suggestions);
        setSuggestions(data.suggestions || []);
        setIsInitialLoad(searchText === '');
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    if (newValue.trim()) {
      fetchSuggestions(newValue.trim());
      setShowSuggestions(true);
    } else {
      // When clearing, fetch initial suggestions
      fetchSuggestions('');
      setShowSuggestions(true);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AutoSuggestOption) => {
    console.log('[AutoSuggestField] Selected suggestion:', suggestion);
    setInputValue(suggestion.value);
    onChange(suggestion.value, suggestion.email, suggestion);
    setShowSuggestions(false);
  };

  // Handle input focus - now loads suggestions automatically
  const handleFocus = () => {
    // Always show suggestions panel on focus
    setShowSuggestions(true);

    // If no suggestions loaded yet, fetch initial ones
    if (suggestions.length === 0) {
      fetchSuggestions(inputValue.trim() || '');
    }
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

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {/* Search Icon */}
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              id={name}
              name={name}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              required={required}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="off"
            />

            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              </div>
            )}
          </div>
          {onAddNew && (
            <button
              type="button"
              onClick={onAddNew}
              className="flex items-center px-3 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              title={addNewText}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading && suggestions.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-500">
                <Loader2 className="w-5 h-5 mx-auto mb-2 text-blue-600 animate-spin" />
                <span className="text-sm">Buscando...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <>
                {isInitialLoad && !inputValue.trim() && (
                  <div className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-200">
                    📋 Recentes / Disponíveis
                  </div>
                )}
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{suggestion.label}</span>
                      {showEmail && suggestion.email && (
                        <span className="text-xs text-slate-500">{suggestion.email}</span>
                      )}
                    </div>
                  </button>
                ))}
              </>
            ) : !loading ? (
              <div className="px-3 py-4 text-center text-slate-500">
                <span className="text-sm">Nenhum resultado encontrado</span>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={onAddNew}
                    className="block w-full mt-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    {addNewText}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

