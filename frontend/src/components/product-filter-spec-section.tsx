import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { catalogApi, type CategoryFilter } from '../api/catalog';

interface ProductFilterSpecSectionProps {
    categoryId: string;
    /** Giá trị hiện tại: key = attribute.key, value = raw URL param string. */
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
}

/**
 * Nhóm filter theo attribute (Text/Number/Enum/Boolean) fetched từ backend.
 * URL param format: ?spec.<key>=... — cha xử lý.
 */
export default function ProductFilterSpecSection({
    categoryId, values, onChange,
}: ProductFilterSpecSectionProps) {
    const [filters, setFilters] = useState<CategoryFilter[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!categoryId) { setFilters([]); return; }
        let cancelled = false;
        setLoading(true);
        catalogApi
            .getCategoryFilters(categoryId)
            .then((data) => { if (!cancelled) setFilters(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setFilters([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [categoryId]);

    if (loading) {
        return <div className="text-xs text-gray-400 italic py-2">Đang tải bộ lọc kỹ thuật...</div>;
    }
    if (filters.length === 0) return null;

    const toggle = (k: string) => setExpanded((prev) => ({ ...prev, [k]: !(prev[k] ?? true) }));

    return (
        <div>
            {filters.map((f) => {
                const isOpen = expanded[f.key] ?? true;
                const currentValue = values[f.key] || '';
                return (
                    <div key={f.attributeId} className="border-b border-gray-100 py-3 last:border-0">
                        <button
                            type="button"
                            onClick={() => toggle(f.key)}
                            className="flex items-center justify-between w-full mb-2 group"
                        >
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide group-hover:text-accent transition-colors">
                                {f.name || f.key}{f.unit ? ` (${f.unit})` : ''}
                            </h4>
                            {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </button>

                        {isOpen && (
                            <div className="space-y-2">
                                {f.dataType === 'Text' && (
                                    <input
                                        type="text"
                                        value={currentValue}
                                        onChange={(e) => onChange(f.key, e.target.value)}
                                        placeholder={`Tìm theo ${(f.name || f.key || '').toLowerCase()}`}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-accent"
                                    />
                                )}

                                {f.dataType === 'Number' && f.numberRange && (
                                    <NumberRangeInput
                                        min={f.numberRange.min}
                                        max={f.numberRange.max}
                                        currentValue={currentValue}
                                        onCommit={(v) => onChange(f.key, v)}
                                    />
                                )}

                                {f.dataType === 'Enum' && f.options && f.options.length > 0 && (
                                    <EnumCheckboxList
                                        options={f.options}
                                        currentValue={currentValue}
                                        onChange={(v) => onChange(f.key, v)}
                                    />
                                )}

                                {f.dataType === 'Boolean' && (
                                    <BooleanSwitch
                                        currentValue={currentValue}
                                        onChange={(v) => onChange(f.key, v)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============ Sub-inputs ============

function NumberRangeInput({
    min, max, currentValue, onCommit,
}: { min: number; max: number; currentValue: string; onCommit: (v: string) => void }) {
    const parsed = currentValue.split('-');
    const [lo, setLo] = useState<number>(Number(parsed[0]) || min);
    const [hi, setHi] = useState<number>(Number(parsed[1]) || max);

    const commit = () => {
        if (lo === min && hi === max) { onCommit(''); return; }
        onCommit(`${lo}-${hi}`);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs">
                <input
                    type="number"
                    value={lo}
                    min={min}
                    max={max}
                    onChange={(e) => setLo(Number(e.target.value))}
                    onBlur={commit}
                    className="w-full px-2 py-1 border border-gray-200 rounded"
                />
                <span className="text-gray-400">-</span>
                <input
                    type="number"
                    value={hi}
                    min={min}
                    max={max}
                    onChange={(e) => setHi(Number(e.target.value))}
                    onBlur={commit}
                    className="w-full px-2 py-1 border border-gray-200 rounded"
                />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={lo}
                    onChange={(e) => setLo(Number(e.target.value))}
                    onMouseUp={commit}
                    onTouchEnd={commit}
                    className="flex-1"
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={hi}
                    onChange={(e) => setHi(Number(e.target.value))}
                    onMouseUp={commit}
                    onTouchEnd={commit}
                    className="flex-1"
                />
            </div>
        </div>
    );
}

function EnumCheckboxList({
    options, currentValue, onChange,
}: {
    options: Array<{ value: string; label: string; count: number }>;
    currentValue: string;
    onChange: (v: string) => void;
}) {
    const selected = new Set(currentValue ? currentValue.split(',').filter(Boolean) : []);
    const toggle = (v: string) => {
        const next = new Set(selected);
        if (next.has(v)) next.delete(v); else next.add(v);
        onChange(Array.from(next).join(','));
    };
    return (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 hover:text-gray-900">
                    <input
                        type="checkbox"
                        checked={selected.has(opt.value)}
                        onChange={() => toggle(opt.value)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <span className="flex-1">{opt.label}</span>
                    <span className="text-[10px] text-gray-400">({opt.count})</span>
                </label>
            ))}
        </div>
    );
}

function BooleanSwitch({
    currentValue, onChange,
}: { currentValue: string; onChange: (v: string) => void }) {
    const on = currentValue === 'true';
    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${on ? 'bg-accent' : 'bg-gray-200'}`}
                onClick={() => onChange(on ? '' : 'true')}
                role="switch"
                aria-checked={on}
            >
                <span className={`block w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
            </span>
            <span className="text-xs text-gray-700">Chỉ hiện sản phẩm có tính năng này</span>
        </label>
    );
}
