'use client';

// A single dropdown that picks any number of options — empty selection
// means "no filter, show everything", the convention every filter on
// these pages follows for its own empty state. Opens as a centered
// modal popup with its own search box, same visual pattern
// SearchableSelect (this same folder) uses elsewhere — just multi-select
// (checkable rows, a running "N selected" instead of closing on pick)
// rather than SearchableSelect's single-value one. Originally built for
// the Payouts page's Area/Project filters; shared here so any other
// page needing the same "dropdown -> popup -> search -> checkboxes"
// filter doesn't reimplement it.

import React, { useEffect, useState } from 'react';
import { ChevronDown, Check, Search, X, type LucideIcon } from 'lucide-react';

export default function MultiSelectFilter({
  icon: Icon,
  label,
  options,
  selected,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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
    setQuery('');
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };

  const buttonText = selected.length === 0 ? `All ${label}s` : selected.length === 1 ? selected[0] : `${selected.length} ${label}s`;
  const filtered = query.trim() ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase())) : options;

  return (
    <>
      <button
        onClick={open}
        className={`flex items-center gap-1.5 bg-white border rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition-colors shrink-0 ${
          selected.length > 0 ? 'border-[#c4a55a] text-[#0f1d33]' : 'border-[#e8ecf2] text-[#5a6a82]'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="max-w-[160px] truncate">{buttonText}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={close}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#e8ecf2] bg-[#f7f8fa] shrink-0">
              <h3 className="text-base font-bold text-[#0f1d33]">{label}</h3>
              <button onClick={close} className="text-[#5a6a82] hover:text-[#0f1d33] transition-colors rounded-full p-1 hover:bg-[#e8ecf2]">
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
                  placeholder={`Search ${label.toLowerCase()}s...`}
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2 text-sm text-[#0f1d33] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            {selected.length > 0 && (
              <button onClick={() => onChange([])} className="text-left px-4 py-2 text-xs font-semibold text-[#c4a55a] hover:bg-[#f3f5f8] border-b border-[#e8ecf2] shrink-0">
                Clear ({selected.length} selected)
              </button>
            )}

            <ul className="overflow-y-auto py-1 flex-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-[#5a6a82]">{options.length === 0 ? `No ${label.toLowerCase()}s yet.` : 'No matches found.'}</li>
              ) : (
                filtered.map((opt) => {
                  const isSelected = selected.includes(opt);
                  return (
                    <li key={opt}>
                      <button
                        onClick={() => toggle(opt)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[#f3f5f8] transition-colors ${isSelected ? 'text-[#1e3a5f] font-semibold bg-[#1e3a5f]/5' : 'text-[#0f1d33]'}`}
                      >
                        {/* A persistent checkbox shape, not just a
                            checkmark that appears out of nowhere once
                            selected — an empty row shouldn't look
                            identical to plain unselectable text. */}
                        <span
                          className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-[#1e3a5f] border-[#1e3a5f]' : 'border-[#a0abbb] bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                        <span className="truncate">{opt}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="p-3 border-t border-[#e8ecf2] bg-[#f7f8fa] shrink-0">
              <button onClick={close} className="w-full py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold text-sm hover:bg-[#0f1d33] transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
