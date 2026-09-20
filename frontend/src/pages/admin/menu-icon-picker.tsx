/**
 * MenuIconPicker — bộ chọn biểu tượng có TÌM KIẾM và XEM TRƯỚC.
 *
 * design-guidelines §9.6: "Không bắt người dùng nhớ mã kỹ thuật (tên icon Lucide, mã màu):
 * phải có bộ chọn." Trước đây Quản lý menu chỉ có một ô text "Icon (tên Lucide)" — gõ sai
 * một chữ hoa là mất icon mà không có cách nào biết.
 *
 * Nguồn icon: `utils/icon-registry.ts` (đã có sẵn, ~150 icon đã chọn lọc). KHÔNG
 * `import * as icons from 'lucide-react'` — sẽ kéo cả ~1400 component vào bundle.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { Popover, Input } from '../../components/ui';
import { getIcon, iconNames } from '../../utils/icon-registry';

interface MenuIconPickerProps {
    value?: string;
    onChange: (icon: string | undefined) => void;
    label?: string;
}

export const MenuIconPicker = ({ value, onChange, label = 'Biểu tượng' }: MenuIconPickerProps) => {
    const [query, setQuery] = useState('');

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? iconNames.filter((n) => n.toLowerCase().includes(q)) : iconNames;
    }, [query]);

    return (
        <div className="min-w-0">
            <span className="mb-1.5 block text-13 font-medium text-fg">{label}</span>
            <Popover
                label="Chọn biểu tượng"
                align="start"
                className="block w-full"
                panelClassName="w-72"
                trigger={(t) => (
                    <button
                        type="button"
                        onClick={t.toggle}
                        aria-expanded={t['aria-expanded']}
                        aria-controls={t['aria-controls']}
                        aria-haspopup={t['aria-haspopup']}
                        className="flex h-9 w-full items-center gap-2 rounded-lg border border-control-line bg-surface px-2.5 text-13 text-fg transition-colors hover:border-line-strong"
                    >
                        {/* Xem trước ngay trên nút — thấy icon chứ không phải đọc tên. */}
                        <span className="shrink-0 text-fg-muted">{getIcon(value, 16)}</span>
                        <span className="min-w-0 flex-1 truncate text-left">
                            {value || <span className="text-fg-subtle">Chưa chọn</span>}
                        </span>
                        <ChevronDown size={14} className="shrink-0 text-fg-subtle" aria-hidden />
                    </button>
                )}
            >
                {(close) => (
                    <>
                        <Input
                            inputSize="sm"
                            icon={Search}
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm biểu tượng…"
                            aria-label="Tìm biểu tượng"
                        />
                        <div className="mt-2 grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
                            {results.map((name) => (
                                <button
                                    key={name}
                                    type="button"
                                    title={name}
                                    aria-label={name}
                                    aria-pressed={value === name}
                                    onClick={() => { onChange(name); close(); }}
                                    className={`flex h-9 items-center justify-center rounded-lg transition-colors ${
                                        value === name
                                            ? 'bg-brand-subtle text-brand-text ring-1 ring-brand-line'
                                            : 'text-fg-muted hover:bg-sunken hover:text-fg'
                                    }`}
                                >
                                    {getIcon(name, 17)}
                                </button>
                            ))}
                            {results.length === 0 && (
                                <p className="col-span-6 py-6 text-center text-2xs text-fg-subtle">
                                    Không có biểu tượng nào khớp.
                                </p>
                            )}
                        </div>
                        {value && (
                            <button
                                type="button"
                                onClick={() => { onChange(undefined); close(); }}
                                className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line text-2xs font-medium text-fg-muted transition-colors hover:bg-sunken hover:text-fg"
                            >
                                <X size={13} aria-hidden /> Bỏ biểu tượng
                            </button>
                        )}
                    </>
                )}
            </Popover>
        </div>
    );
};
