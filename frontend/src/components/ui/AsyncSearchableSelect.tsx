import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface AsyncSearchableSelectProps {
  loadOptions: (search: string, page: number) => Promise<{ options: SearchableSelectOption[], hasMore: boolean }>;
  value?: string;
  onChange?: ((value: string) => void) | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  error?: boolean;
  id?: string;
  defaultLabel?: string; // Used to display the initial label if option is not in first page
}

export function AsyncSearchableSelect({
  loadOptions,
  value = '',
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  disabled = false,
  name,
  className = '',
  error = false,
  id,
  defaultLabel,
}: AsyncSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [options, setOptions] = useState<SearchableSelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [internalValue, setInternalValue] = useState(value);
  
  useEffect(() => { setInternalValue(value); }, [value]);
  const effectiveValue = onChange ? value : internalValue;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load options
  const fetchOptions = useCallback(async (currentSearch: string, currentPage: number) => {
    try {
      setIsLoading(true);
      const result = await loadOptions(currentSearch, currentPage);
      
      setOptions(prev => currentPage === 1 ? result.options : [...prev, ...result.options]);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load options', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadOptions]);

  // Trigger load when search or page changes
  useEffect(() => {
    if (isOpen) {
      fetchOptions(debouncedSearch, page);
    }
  }, [debouncedSearch, page, isOpen, fetchOptions]);

  // Reset pagination when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1);
        }
      },
      { root: listRef.current, threshold: 0.5 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [isOpen, hasMore, isLoading]);

  const selectedOption = options.find((opt) => opt.value === effectiveValue);
  const displayLabel = selectedOption ? String(selectedOption.label) : effectiveValue ? (defaultLabel || effectiveValue) : placeholder;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch(''); // Reset search text when closing
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
    (optValue: string, optLabel: string) => {
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
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          handleSelect(options[highlightedIndex].value, options[highlightedIndex].label);
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
        <span className={effectiveValue ? 'text-slate-900' : 'text-slate-400'}>
          {displayLabel}
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
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 placeholder:text-slate-400 transition-all"
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="text-slate-400 animate-spin" />
                  </div>
                )}
                {!isLoading && search && (
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
              {options.length === 0 && !isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400 font-medium">
                  Không tìm thấy kết quả
                </div>
              ) : (
                options.map((opt, idx) => {
                  const isSelected = opt.value === effectiveValue;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      data-option
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value, opt.label)}
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
              
              {/* Intersection observer target */}
              <div ref={observerRef} className="h-4 w-full" />
              
              {isLoading && options.length > 0 && (
                <div className="flex justify-center py-2">
                  <Loader2 size={16} className="text-slate-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Đã tải {options.length} kết quả
              </span>
              {!hasMore && options.length > 0 && (
                 <span className="text-[10px] font-medium text-slate-400">
                    Đã hết dữ liệu
                 </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AsyncSearchableSelect;
