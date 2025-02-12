

import React, { useState, useEffect, useRef } from 'react';

interface SuggestiveSelectProps {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  maxItems?: number;
}

export function SuggestiveSelect({
  value,
  suggestions,
  onChange,
  placeholder,
  maxItems
}: SuggestiveSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>(
    value ? value.split(',').map(v => v.trim()).filter(Boolean) : []
  );
  const [customEntry, setCustomEntry] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update selected items when value prop changes
    setSelectedItems(value ? value.split(',').map(v => v.trim()).filter(Boolean) : []);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const newValue = search.trim();
      if (!newValue) return;
      
      if (maxItems && selectedItems.length >= maxItems) {
        return;
      }
      
      if (!selectedItems.includes(newValue)) {
        const newItems = [...selectedItems, newValue].slice(0, maxItems || undefined);
        onChange(newItems.join(', '));
        setSelectedItems(newItems);
      }
      setSearch('');
      setIsOpen(false);
      setCustomEntry(false);
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    const newItems = selectedItems.filter(item => item !== itemToRemove);
    onChange(newItems.join(', '));
    setSelectedItems(newItems);
  };

  const filteredSuggestions = suggestions.filter(
    suggestion =>
      suggestion.toLowerCase().includes(search.toLowerCase()) &&
      !selectedItems.includes(suggestion)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setIsOpen(true);
    setCustomEntry(!suggestions.some(s => 
      s.toLowerCase() === value.toLowerCase()
    ));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setCustomEntry(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="mt-1 flex flex-wrap gap-2 p-2 border rounded-md border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        {selectedItems.map((item) => (
          <span
            key={item}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
          >
            {item}
            <button
              type="button"
              onClick={() => handleRemoveItem(item)}
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          className="flex-1 outline-none border-0 focus:ring-0 min-w-[120px] p-1"
          placeholder={selectedItems.length === 0 ? placeholder : ''}
          disabled={maxItems && selectedItems.length >= maxItems}
        />
      </div>
      {isOpen && (filteredSuggestions.length > 0 || customEntry) && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {customEntry && search.trim() && (
            <div
              onClick={() => {
                if (!selectedItems.includes(search.trim()) && (!maxItems || selectedItems.length < maxItems)) {
                  const newItems = [...selectedItems, search.trim()].slice(0, maxItems || undefined);
                  onChange(newItems.join(', '));
                  setSelectedItems(newItems);
                }
                setSearch('');
                setIsOpen(false);
                setCustomEntry(false);
              }}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-indigo-600 font-medium"
            >
              Add "{search.trim()}"
            </div>
          )}
          {filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion}
              onClick={() => {
                if (!selectedItems.includes(suggestion) && (!maxItems || selectedItems.length < maxItems)) {
                  const newItems = [...selectedItems, suggestion].slice(0, maxItems || undefined);
                  onChange(newItems.join(', '));
                  setSelectedItems(newItems);
                }
                setSearch('');
                setIsOpen(false);
                setCustomEntry(false);
              }}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}