import { useState } from 'react';
import { X, Eye, EyeOff, ArrowUp, ArrowDown, Save } from 'lucide-react';
import type { TableColumnDef } from '../../api/table-views';

interface TableViewConfigModalProps {
    columns: TableColumnDef[];
    onCancel: () => void;
    onSave: (columns: TableColumnDef[]) => void | Promise<void>;
}

/**
 * Minimal "Cấu hình bảng" editor — toggle column visibility and reorder via
 * up/down buttons (no drag lib dependency to keep this <200 lines). Persists via
 * DynamicDataTable's onSave, which PUTs ColumnsJson back to /api/config/table-views/{id}.
 */
export function TableViewConfigModal({ columns, onCancel, onSave }: TableViewConfigModalProps) {
    const [draft, setDraft] = useState<TableColumnDef[]>([...columns]);
    const [saving, setSaving] = useState(false);

    const move = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= draft.length) return;
        const next = [...draft];
        [next[index], next[target]] = [next[target], next[index]];
        setDraft(next);
    };

    const toggleVisible = (index: number) => {
        const next = [...draft];
        next[index] = { ...next[index], visible: next[index].visible === false };
        setDraft(next);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(draft);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div onClick={onCancel} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">Cấu hình bảng</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                    {draft.map((col, index) => (
                        <div key={col.key} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="flex flex-col">
                                <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                    className="text-gray-300 hover:text-gray-700 disabled:opacity-20"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    type="button"
                                    disabled={index === draft.length - 1}
                                    onClick={() => move(index, 1)}
                                    className="text-gray-300 hover:text-gray-700 disabled:opacity-20"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{col.label}</p>
                                <p className="text-[11px] text-gray-400 font-mono truncate">{col.key} · {col.type}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleVisible(index)}
                                className={`p-2 rounded-lg transition-colors ${col.visible === false ? 'text-gray-300 hover:text-gray-600' : 'text-accent hover:bg-blue-50'}`}
                                title={col.visible === false ? 'Hiện cột' : 'Ẩn cột'}
                            >
                                {col.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100">
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] py-3 text-sm font-bold text-white bg-accent rounded-xl hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
                    </button>
                </div>
            </div>
        </div>
    );
}
