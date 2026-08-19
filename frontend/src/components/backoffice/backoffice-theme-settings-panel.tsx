import { motion } from 'framer-motion';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type AccentColor, type ThemeMode } from '../../context/ThemeContext';

const THEME_MODES: { value: ThemeMode; label: string; icon: JSX.Element }[] = [
    { value: 'light', label: 'Sáng', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Tối', icon: <Moon size={16} /> },
    { value: 'system', label: 'Hệ thống', icon: <Monitor size={16} /> },
];

const ACCENT_COLOR_OPTIONS: { value: AccentColor; label: string; color: string }[] = [
    { value: 'red', label: 'Đỏ', color: 'bg-red-500' },
    { value: 'blue', label: 'Xanh dương', color: 'bg-blue-500' },
    { value: 'green', label: 'Xanh lá', color: 'bg-emerald-500' },
    { value: 'purple', label: 'Tím', color: 'bg-purple-500' },
    { value: 'orange', label: 'Cam', color: 'bg-orange-500' },
    { value: 'pink', label: 'Hồng', color: 'bg-pink-500' },
    { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
    { value: 'amber', label: 'Vàng', color: 'bg-amber-500' },
];

/** Dropdown to switch theme mode (light/dark/system) and accent color. */
export const BackofficeThemeSettingsPanel = () => {
    const { isDark, colors, mode, setMode, accent, setAccent } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 mt-2 w-72 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
        >
            <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Giao diện</h3>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Chế độ
                    </p>
                    <div className="flex gap-2">
                        {THEME_MODES.map((tm) => (
                            <button
                                key={tm.value}
                                onClick={(e) => { e.stopPropagation(); setMode(tm.value); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === tm.value
                                    ? 'text-white'
                                    : isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                                    }`}
                                style={mode === tm.value ? { backgroundColor: colors.primary } : {}}
                            >
                                {tm.icon}
                                {tm.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Màu chủ đạo
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                        {ACCENT_COLOR_OPTIONS.map((ac) => (
                            <button
                                key={ac.value}
                                onClick={(e) => { e.stopPropagation(); setAccent(ac.value); }}
                                className={`w-full aspect-square rounded-xl ${ac.color} flex items-center justify-center transition-transform hover:scale-110 ${accent === ac.value ? 'ring-2 ring-offset-2 ring-white' : ''}`}
                                title={ac.label}
                            >
                                {accent === ac.value && <Check size={16} className="text-white" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
