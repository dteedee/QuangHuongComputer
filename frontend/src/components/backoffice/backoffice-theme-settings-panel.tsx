/**
 * Bảng "Giao diện" bung ra từ nút bánh răng trên topbar: chế độ sáng/tối/hệ thống + màu nhấn.
 *
 * LỖI ĐÃ SỬA: bộ chọn màu nhấn từng mất tác dụng sau khi vỏ back office chuyển sang token
 * `--brand` cố định — bấm 8 ô màu mà sidebar/topbar/nút không đổi gì. Nay `setAccent` ghi đè
 * chính `--brand*` trên `[data-shell="admin"]` (xem `context/accent-brand-tokens.ts`), nên
 * mọi thứ vẽ bằng token đổi theo. Ô xem trước ở đây lấy đúng giá trị `--brand` sẽ được áp,
 * không phải một màu Tailwind khác — xem trước và kết quả luôn khớp.
 *
 * §9.1: hết `isDark ? ...`, hết `gray-*`, hết `bg-white`, hết `colors.primary`.
 */
import { motion } from 'framer-motion';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type AccentColor, type ThemeMode } from '../../context/ThemeContext';
import { accentSwatchStyle } from '../../context/accent-brand-tokens';

const THEME_MODES: { value: ThemeMode; label: string; icon: JSX.Element }[] = [
    { value: 'light', label: 'Sáng', icon: <Sun size={15} aria-hidden /> },
    { value: 'dark', label: 'Tối', icon: <Moon size={15} aria-hidden /> },
    { value: 'system', label: 'Hệ thống', icon: <Monitor size={15} aria-hidden /> },
];

const ACCENT_COLOR_OPTIONS: { value: AccentColor; label: string }[] = [
    { value: 'red', label: 'Đỏ' },
    { value: 'blue', label: 'Xanh dương' },
    { value: 'green', label: 'Xanh lá' },
    { value: 'purple', label: 'Tím' },
    { value: 'orange', label: 'Cam' },
    { value: 'pink', label: 'Hồng' },
    { value: 'cyan', label: 'Xanh ngọc' },
    { value: 'amber', label: 'Vàng' },
];

export const BackofficeThemeSettingsPanel = () => {
    const { mode, setMode, accent, setAccent } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 z-floating mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
            <h3 className="border-b border-line px-3 py-2.5 text-13 font-semibold text-fg">Giao diện</h3>

            <div className="space-y-3 p-3">
                <div>
                    <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">Chế độ</p>
                    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Chế độ giao diện">
                        {THEME_MODES.map((tm) => (
                            <button
                                key={tm.value}
                                type="button"
                                aria-pressed={mode === tm.value}
                                onClick={(e) => { e.stopPropagation(); setMode(tm.value); }}
                                className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border text-13 font-medium transition-colors ${
                                    mode === tm.value
                                        ? 'border-brand-line bg-brand-subtle text-brand-text'
                                        : 'border-line text-fg-muted hover:bg-sunken hover:text-fg'
                                }`}
                            >
                                {tm.icon}
                                {tm.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">Màu nhấn</p>
                    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Màu nhấn">
                        {ACCENT_COLOR_OPTIONS.map((ac) => (
                            <button
                                key={ac.value}
                                type="button"
                                aria-label={ac.label}
                                aria-pressed={accent === ac.value}
                                title={ac.label}
                                onClick={(e) => { e.stopPropagation(); setAccent(ac.value); }}
                                className={`flex aspect-square w-full items-center justify-center rounded-lg transition-transform hover:scale-105 motion-reduce:hover:scale-100 ${
                                    accent === ac.value ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''
                                }`}
                                style={accentSwatchStyle(ac.value)}
                            >
                                {accent === ac.value && <Check size={15} className="text-white" aria-hidden />}
                            </button>
                        ))}
                    </div>
                    <p className="mt-1.5 text-2xs text-fg-subtle">
                        Màu nhấn áp cho toàn bộ back office. Mặt khách giữ nguyên đỏ thương hiệu.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
