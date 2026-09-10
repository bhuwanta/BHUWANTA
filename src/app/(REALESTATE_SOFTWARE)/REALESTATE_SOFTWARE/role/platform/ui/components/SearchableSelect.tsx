'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  /** Modal header title — defaults to placeholder if not given. */
  title?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
}

/** A styled trigger that opens a centered modal popup — search box at the
 * top, options in a scrollable list below — instead of a native <select>
 * or an anchored dropdown panel. A true popup rather than a dropdown
 * means it's never clipped by the viewport or any scroll container,
 * regardless of where the field sits on the page or how many options
 * there are. */
export default function SearchableSelect({ value, onChange, options, placeholder, title, disabled, searchPlaceholder = 'Search...', noResultsText = 'No matches found.' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const filtered = query.trim() ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase())) : options;

  useEffect(() => {
    if (!isOpen) return;

    searchInputRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const open = () => {
    if (disabled) return;
    setQuery('');
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const selectOption = (id: string) => {
    onChange(id);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        className={`w-full flex items-center justify-between bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50 disabled:cursor-not-allowed ${
          selected ? 'text-[#0f1d33]' : 'text-[#5a6a82]'
        }`}
      >
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <ChevronDown className="w-4 h-4 text-[#5a6a82] shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={close}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#e8ecf2] bg-[#f7f8fa] shrink-0">
              <h3 className="text-base font-bold text-[#0f1d33]">{title || placeholder}</h3>
              <button type="button" onClick={close} className="text-[#5a6a82] hover:text-[#0f1d33] transition-colors rounded-full p-1 hover:bg-[#e8ecf2]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-[#e8ecf2] shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2 text-sm text-[#0f1d33] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            <ul className="overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-[#5a6a82]">{noResultsText}</li>
              ) : (
                filtered.map((option) => {
                  const isSelected = option.id === value;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => selectOption(option.id)}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-[#f3f5f8] transition-colors ${isSelected ? 'text-[#1e3a5f] font-semibold bg-[#1e3a5f]/5' : 'text-[#0f1d33]'}`}
                      >
                        <span className="truncate">{option.name}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
