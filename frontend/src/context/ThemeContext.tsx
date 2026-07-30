import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { systemConfigApi, type ConfigurationEntry } from '../api/systemConfig';
import { HEX_COLOR_REGEX, accentDefaults } from '../design-system/brand-tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan' | 'amber';

interface ThemeContextType {
    mode: ThemeMode;
    accent: AccentColor;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    setAccent: (color: AccentColor) => void;
    toggleMode: () => void;
    colors: AccentColorConfig;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

interface AccentColorConfig {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryDark: string;
    gradient: string;
    ring: string;
    badge: string;
}

const accentColors: Record<AccentColor, AccentColorConfig> = {
    red: {
        // Quang Hưởng brand (source: design-system/brand-tokens.ts)
        primary: accentDefaults.primary,
        primaryHover: accentDefaults.primaryHover,
        primaryLight: accentDefaults.primaryLight,
        primaryDark: accentDefaults.primaryDark,
        gradient: 'from-red-500 to-rose-600',
        ring: 'ring-red-500/20',
        badge: 'bg-red-500',
    },
    blue: {
        primary: '#2563EB',
        primaryHover: '#1D4ED8',
        primaryLight: '#EFF6FF',
        primaryDark: '#1E40AF',
        gradient: 'from-blue-500 to-indigo-600',
        ring: 'ring-blue-500/20',
        badge: 'bg-blue-500',
    },
    green: {
        primary: '#059669',
        primaryHover: '#047857',
        primaryLight: '#D1FAE5',
        primaryDark: '#065F46',
        gradient: 'from-emerald-500 to-teal-600',
        ring: 'ring-emerald-500/20',
        badge: 'bg-emerald-500',
    },
    purple: {
        primary: '#7C3AED',
        primaryHover: '#6D28D9',
        primaryLight: '#EDE9FE',
        primaryDark: '#5B21B6',
        gradient: 'from-purple-500 to-violet-600',
        ring: 'ring-purple-500/20',
        badge: 'bg-purple-500',
    },
    orange: {
        primary: '#EA580C',
        primaryHover: '#C2410C',
        primaryLight: '#FFEDD5',
        primaryDark: '#9A3412',
        gradient: 'from-orange-500 to-amber-600',
        ring: 'ring-orange-500/20',
        badge: 'bg-orange-500',
    },
    pink: {
        primary: '#DB2777',
        primaryHover: '#BE185D',
        primaryLight: '#FCE7F3',
        primaryDark: '#9D174D',
        gradient: 'from-pink-500 to-rose-600',
        ring: 'ring-pink-500/20',
        badge: 'bg-pink-500',
    },
    cyan: {
        primary: '#0891B2',
        primaryHover: '#0E7490',
        primaryLight: '#CFFAFE',
        primaryDark: '#155E75',
        gradient: 'from-cyan-500 to-teal-600',
        ring: 'ring-cyan-500/20',
        badge: 'bg-cyan-500',
    },
    amber: {
        primary: '#D97706',
        primaryHover: '#B45309',
        primaryLight: '#FEF3C7',
        primaryDark: '#92400E',
        gradient: 'from-amber-500 to-yellow-600',
        ring: 'ring-amber-500/20',
        badge: 'bg-amber-500',
    },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setModeState] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('theme-mode');
        return (saved as ThemeMode) || 'light';
    });

    const [accent, setAccentState] = useState<AccentColor>(() => {
        const saved = localStorage.getItem('theme-accent');
        return (saved as AccentColor) || 'red';
    });

    // Admin-configurable override of accent colors via SystemConfig (theme.*).
    // When null we fall back to the accentColors[accent] preset.
    const [remoteAccent, setRemoteAccent] = useState<{
        primary?: string;
        primaryHover?: string;
    } | null>(null);

    const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });

    const [systemDark, setSystemDark] = useState(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const isDark = mode === 'dark' || (mode === 'system' && systemDark);

    // Fetch admin-configurable theme overrides from SystemConfig once at mount.
    // Fail silent — if API is down we keep local defaults.
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const entries = await systemConfigApi.config.getPublic();
                if (cancelled || !Array.isArray(entries)) return;
                const pick = (key: string) =>
                    entries.find((e: ConfigurationEntry) => e.key === key)?.value;
                const primary = pick('theme.accentPrimary');
                const hover = pick('theme.accentPrimaryHover');
                const next: { primary?: string; primaryHover?: string } = {};
                if (primary && HEX_COLOR_REGEX.test(primary)) next.primary = primary;
                if (hover && HEX_COLOR_REGEX.test(hover)) next.primaryHover = hover;
                if (next.primary || next.primaryHover) setRemoteAccent(next);
            } catch {
                // Ignore — fallback to defaults.
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        // Set CSS custom properties for accent color.
        // Remote (admin) values take precedence over the local preset.
        const preset = accentColors[accent];
        const primary = remoteAccent?.primary ?? preset.primary;
        const primaryHover = remoteAccent?.primaryHover ?? preset.primaryHover;
        document.documentElement.style.setProperty('--accent-primary', primary);
        document.documentElement.style.setProperty('--accent-primary-hover', primaryHover);
        document.documentElement.style.setProperty('--accent-primary-light', preset.primaryLight);
        document.documentElement.style.setProperty('--accent-primary-dark', preset.primaryDark);
        // Derive rgb triple for shadow/glow rgba(). Guard invalid hex just in case.
        const rgb = hexToRgbTriple(primary);
        if (rgb) document.documentElement.style.setProperty('--accent-primary-rgb', rgb);
    }, [isDark, accent, remoteAccent]);

    const setMode = (newMode: ThemeMode) => {
        setModeState(newMode);
        localStorage.setItem('theme-mode', newMode);
    };

    const setAccent = (color: AccentColor) => {
        setAccentState(color);
        localStorage.setItem('theme-accent', color);
    };

    const setSidebarCollapsed = (collapsed: boolean) => {
        setSidebarCollapsedState(collapsed);
        localStorage.setItem('sidebar-collapsed', String(collapsed));
    };

    const toggleMode = () => {
        const newMode = isDark ? 'light' : 'dark';
        setMode(newMode);
    };

    return (
        <ThemeContext.Provider value={{
            mode,
            accent,
            isDark,
            setMode,
            setAccent,
            toggleMode,
            colors: accentColors[accent],
            sidebarCollapsed,
            setSidebarCollapsed,
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

export { accentColors };

/** Convert a "#RRGGBB" string into the "r, g, b" triple for use in rgba(). */
function hexToRgbTriple(hex: string): string | null {
    if (!HEX_COLOR_REGEX.test(hex)) return null;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}
