import { useState } from 'react';
import { Columns3, Eye, EyeOff, GripVertical, ChevronDown } from 'lucide-react';
import type { ColumnDef } from '../../api/report-customization';

interface Props {
    columns: ColumnDef[];
    visibleKeys: string[];
    onChange: (visibleKeys: string[]) => void;
}

export function ReportColumnSelector({ columns, visibleKeys, onChange }: Props) {
    const [open, setOpen] = useState(false);

    const toggle = (key: string) => {
        const next = visibleKeys.includes(key)
            ? visibleKeys.filter(k => k !== key)
            : [...visibleKeys, key];
        onChange(next);
    };

    const showAll = () => onChange(columns.map(c => c.key));
    const reset = () => onChange(columns.filter(c => c.defaultVisible).map(c => c.key));

    const hiddenCount = columns.length - visibleKeys.length;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-all"
            >
                <Columns3 size={14} />
                Cột hiển thị
                {hiddenCount > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 rounded">
                        -{hiddenCount}
                    </span>
                )}
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-56 py-2">
                        <div className="flex justify-between items-center px-3 pb-2 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase">Chọn cột</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={showAll}
                                    className="text-xs text-accent hover:underline font-medium"
                                >
                                    Tất cả
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                    onClick={reset}
                                    className="text-xs text-gray-400 hover:text-gray-600 hover:underline font-medium"
                                >
                                    Mặc định
                                </button>
                            </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto py-1">
                            {columns.map(col => {
                                const visible = visibleKeys.includes(col.key);
                                return (
                                    <button
                                        key={col.key}
                                        onClick={() => toggle(col.key)}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <GripVertical size={12} className="text-gray-300 flex-shrink-0" />
                                        <span className={`flex-1 text-sm ${visible ? 'text-gray-800' : 'text-gray-400'}`}>
                                            {col.label}
                                        </span>
                                        {visible
                                            ? <Eye size={14} className="text-accent flex-shrink-0" />
                                            : <EyeOff size={14} className="text-gray-300 flex-shrink-0" />
                                        }
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
