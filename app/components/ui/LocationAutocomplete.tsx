import React, { useState, useEffect, useRef } from 'react';

interface LocationSuggestion {
  properties: {
    formatted: string;
    name?: string;
    city?: string;
    country?: string;
    place_id?: string;
  };
}

interface GeoapifyResponse {
  features?: LocationSuggestion[];
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  placeholder?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  onKeyDown,
  className = "",
  placeholder = "Add location..."
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  // Debounced search function
  const searchLocations = async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/location/autocomplete?query=${encodeURIComponent(query)}`);
      const data = await response.json() as GeoapifyResponse;
      
      if (data.features && Array.isArray(data.features)) {
        setSuggestions(data.features);
        setShowDropdown(data.features.length > 0);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }

    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const selected = suggestions[selectedIndex];
          onChange(selected.properties.formatted);
          setShowDropdown(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: LocationSuggestion, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Update the input value first
    onChange(suggestion.properties.formatted);
    
    // Close dropdown after a small delay to ensure the click is processed
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 50);
    
    inputRef.current?.focus();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking on input or dropdown
      if (
        inputRef.current && 
        dropdownRef.current && 
        !inputRef.current.contains(target) &&
        !dropdownRef.current.contains(target)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowDropdown(true);
          }
        }}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-[9999] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400"
          style={{ 
            left: -4,
            right: 0
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.properties.place_id || index}-${suggestion.properties.formatted}`}
              onClick={(e) => handleSuggestionClick(suggestion, e)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
              }`}
            >
              <div className="font-normal">
                {suggestion.properties.name || suggestion.properties.formatted}
              </div>
              {suggestion.properties.name && suggestion.properties.formatted !== suggestion.properties.name && (
                <div className="text-xs text-gray-500 mt-0.5 font-light">
                  {suggestion.properties.formatted}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}