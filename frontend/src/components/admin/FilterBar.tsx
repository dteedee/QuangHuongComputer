import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Filter, RotateCcw, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type FilterType = 'search' | 'select' | 'date-range' | 'price-range' | 'stock';

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterConfig {
    key: string;
    label: string;
    type: FilterType;
    options?: FilterOption[];
    placeholder?: string;
    icon?: React.ReactNode;
}

export interface FilterBarProps {
    filters: FilterConfig[];
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
    onReset: () => void;
    className?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Search Input Component
const SearchInput = ({
    config,
    value,
    onChange
}: {
    config: FilterConfig;
    value: string;
    onChange: (value: string) => void;
}) => {
    const [localValue, setLocalValue] = useState(value || '');
    const debouncedValue = useDebounce(localValue, 400);

    useEffect(() => {
        if (debouncedValue !== value) {
            onChange(debouncedValue);
        }
    }, [debouncedValue]);

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    return (
        <div className="relative flex-1 min-w-[200px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D70018] transition-colors" size={18} />
            <input
                type="text"
                placeholder={config.placeholder || 'Tìm kiếm...'}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#D70018]/10 focus:border-[#D70018]/20 transition-all outline-none placeholder:text-gray-400"
            />
            {localValue && (
                <button
                    onClick={() => {
                        setLocalValue('');
                        onChange('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

// Select Dropdown Component
const SelectDropdown = ({
    config,
    value,
    onChange
}: {
    config: FilterConfig;
    value: string;
    onChange: (value: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = config.options?.find(opt => opt.value === value);
    const hasValue = value && value !== '' && value !== 'all';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-semibold transition-all min-w-[140px] ${
                    hasValue
                        ? 'bg-[#D70018]/5 border-[#D70018]/20 text-[#D70018]'
                        : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                }`}
            >
                {config.icon}
                <span className="truncate">{selectedOption?.label || config.label}</span>
                <ChevronDown size={16} className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full left-0 mt-2 w-full min-w-[180px] bg-white rounded-xl shadow-xl border border-gray-100 py-2 max-h-[300px] overflow-y-auto"
                    >
                        {config.options?.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                                    value === option.value
                                        ? 'bg-[#D70018]/5 text-[#D70018]'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Date Range Component
const DateRangeInput = ({
    config,
    value,
    onChange
}: {
    config: FilterConfig;
    value: { from: string; to: string };
    onChange: (value: { from: string; to: string }) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const hasValue = value?.from || value?.to;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-semibold transition-all min-w-[140px] ${
                    hasValue
                        ? 'bg-[#D70018]/5 border-[#D70018]/20 text-[#D70018]'
                        : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                }`}
            >
                <Calendar size={16} />
                <span>
                    {hasValue
                        ? `${value?.from || '...'} - ${value?.to || '...'}`
                        : config.label
                    }
                </span>
                <ChevronDown size={16} className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 min-w-[280px]"
                    >
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Từ ngày</label>
                                <input
                                    type="date"
                                    value={value?.from || ''}
                                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:border-[#D70018]/30"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Đến ngày</label>
                                <input
                                    type="date"
                                    value={value?.to || ''}
                                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:border-[#D70018]/30"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => onChange({ from: '', to: '' })}
                                    className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Xóa
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-[#D70018] rounded-lg hover:bg-[#b50014] transition-colors"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Price Range Component
const PriceRangeInput = ({
    config,
    value,
    onChange
}: {
    config: FilterConfig;
    value: { min: string; max: string };
    onChange: (value: { min: string; max: string }) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const hasValue = value?.min || value?.max;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const presets = [
        { label: 'Dưới 5 triệu', min: '0', max: '5000000' },
        { label: '5 - 10 triệu', min: '5000000', max: '10000000' },
        { label: '10 - 20 triệu', min: '10000000', max: '20000000' },
        { label: '20 - 50 triệu', min: '20000000', max: '50000000' },
        { label: 'Trên 50 triệu', min: '50000000', max: '' },
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-semibold transition-all min-w-[120px] ${
                    hasValue
                        ? 'bg-[#D70018]/5 border-[#D70018]/20 text-[#D70018]'
                        : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                }`}
            >
                <span>{hasValue ? 'Đã chọn giá' : config.label}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 min-w-[280px]"
                    >
                        <div className="space-y-3">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Khoảng giá nhanh</div>
                            <div className="grid grid-cols-2 gap-2">
                                {presets.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            onChange({ min: preset.min, max: preset.max });
                                            setIsOpen(false);
                                        }}
                                        className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-gray-100 pt-3">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tùy chỉnh</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="Từ"
                                        value={value?.min || ''}
                                        onChange={(e) => onChange({ ...value, min: e.target.value })}
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:border-[#D70018]/30"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="number"
                                        placeholder="Đến"
                                        value={value?.max || ''}
                                        onChange={(e) => onChange({ ...value, max: e.target.value })}
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:border-[#D70018]/30"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => onChange({ min: '', max: '' })}
                                    className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Xóa
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-[#D70018] rounded-lg hover:bg-[#b50014] transition-colors"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Stock Filter Component
const StockFilter = ({
    config,
    value,
    onChange
}: {
    config: FilterConfig;
    value: string;
    onChange: (value: string) => void;
}) => {
    const options = [
        { value: 'all', label: 'Tất cả' },
        { value: 'in_stock', label: 'Còn hàng (>5)' },
        { value: 'low_stock', label: 'Sắp hết (1-5)' },
        { value: 'out_of_stock', label: 'Hết hàng (0)' },
    ];

    return (
        <SelectDropdown
            config={{ ...config, options }}
            value={value || 'all'}
            onChange={onChange}
        />
    );
};

// Main FilterBar Component
export const FilterBar = ({
    filters,
    values,
    onChange,
    onReset,
    className = ''
}: FilterBarProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Check if any filter has value
    const hasActiveFilters = Object.entries(values).some(([key, val]) => {
        if (!val) return false;
        if (typeof val === 'string') return val !== '' && val !== 'all';
        if (typeof val === 'object') {
            return Object.values(val).some(v => v !== '' && v !== null);
        }
        return false;
    });

    const renderFilter = (config: FilterConfig) => {
        const value = values[config.key];

        switch (config.type) {
            case 'search':
                return (
                    <SearchInput
                        key={config.key}
                        config={config}
                        value={value as string}
                        onChange={(v) => onChange(config.key, v)}
                    />
                );
            case 'select':
                return (
                    <SelectDropdown
                        key={config.key}
                        config={config}
                        value={value as string}
                        onChange={(v) => onChange(config.key, v)}
                    />
                );
            case 'date-range':
                return (
                    <DateRangeInput
                        key={config.key}
                        config={config}
                        value={value as { from: string; to: string }}
                        onChange={(v) => onChange(config.key, v)}
                    />
                );
            case 'price-range':
                return (
                    <PriceRangeInput
                        key={config.key}
                        config={config}
                        value={value as { min: string; max: string }}
                        onChange={(v) => onChange(config.key, v)}
                    />
                );
            case 'stock':
                return (
                    <StockFilter
                        key={config.key}
                        config={config}
                        value={value as string}
                        onChange={(v) => onChange(config.key, v)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="lg:hidden w-full flex items-center justify-between p-4 text-sm font-bold text-gray-700"
            >
                <span className="flex items-center gap-2">
                    <Filter size={18} />
                    Bộ lọc
                    {hasActiveFilters && (
                        <span className="w-2 h-2 bg-[#D70018] rounded-full" />
                    )}
                </span>
                <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Filters Container */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 flex flex-wrap items-center gap-3">
                            {filters.map(renderFilter)}

                            {/* Reset Button */}
                            {hasActiveFilters && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={onReset}
                                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-500 hover:text-[#D70018] hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <RotateCcw size={16} />
                                    Đặt lại
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FilterBar;
