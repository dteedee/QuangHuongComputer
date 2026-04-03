import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange?: ((value: string) => void) | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  error?: boolean;
  id?: string;
}

export function SearchableSelect({
  options,
  value = '',
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  disabled = false,
  name,
  className = '',
  error = false,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Internal state for uncontrolled mode (when onChange is null/undefined)
  const [internalValue, setInternalValue] = useState(value);
  useEffect(() => { setInternalValue(value); }, [value]);
  const effectiveValue = onChange ? value : internalValue;

  const filteredOptions = options.filter((opt) =>
    String(opt.label ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === effectiveValue);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = useCallback(
    (optValue: string) => {
      setInternalValue(optValue);
      if (onChange) onChange(optValue);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (isOpen) setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} id={id}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={effectiveValue} />}

      {/* Trigger button */}
      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 rounded-2xl transition-all outline-none text-left font-bold text-sm ${
          error
            ? 'border-red-500'
            : isOpen
            ? 'border-red-400 bg-white ring-2 ring-red-100'
            : 'border-transparent hover:border-slate-200 focus:border-red-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
          {selectedOption ? String(selectedOption.label) : placeholder}
        </span>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {effectiveValue && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setInternalValue('');
                if (onChange) onChange('');
              }}
              className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={14} className="text-slate-400" />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            style={{ minWidth: '100%' }}
          >
            {/* Search input */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 placeholder:text-slate-400 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Options list */}
            <div ref={listRef} className="max-h-[240px] overflow-y-auto overscroll-contain py-1" role="listbox">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400 font-medium">
                  Không tìm thấy kết quả
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      data-option
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'bg-red-50 text-red-600 font-bold'
                          : isHighlighted
                          ? 'bg-slate-50 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check size={16} className="text-red-500 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer count */}
            {options.length > 5 && (
              <div className="px-4 py-2 border-t border-slate-50 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {filteredOptions.length} / {options.length} kết quả
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchableSelect;
