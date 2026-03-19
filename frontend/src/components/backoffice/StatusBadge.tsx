import { useTheme } from '../../context/ThemeContext';
import type { LucideIcon } from 'lucide-react';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary';

interface StatusBadgeProps {
    status: StatusType;
    label: string;
    icon?: LucideIcon;
    size?: 'sm' | 'md';
    pulse?: boolean;
}

const statusColors: Record<StatusType, { light: string; dark: string; dot: string }> = {
    success: {
        light: 'bg-emerald-100 text-emerald-700',
        dark: 'bg-emerald-900/30 text-emerald-400',
        dot: 'bg-emerald-500',
    },
    warning: {
        light: 'bg-amber-100 text-amber-700',
        dark: 'bg-amber-900/30 text-amber-400',
        dot: 'bg-amber-500',
    },
    error: {
        light: 'bg-red-100 text-red-700',
        dark: 'bg-red-900/30 text-red-400',
        dot: 'bg-red-500',
    },
    info: {
        light: 'bg-blue-100 text-blue-700',
        dark: 'bg-blue-900/30 text-blue-400',
        dot: 'bg-blue-500',
    },
    default: {
        light: 'bg-gray-100 text-gray-700',
        dark: 'bg-gray-800 text-gray-400',
        dot: 'bg-gray-500',
    },
    primary: {
        light: 'bg-red-100 text-red-700',
        dark: 'bg-red-900/30 text-red-400',
        dot: 'bg-red-500',
    },
};

export const StatusBadge = ({ status, label, icon: Icon, size = 'md', pulse }: StatusBadgeProps) => {
    const { isDark } = useTheme();
    const colors = statusColors[status];

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs',
    };

    return (
        <span
            className={`
                inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide
                ${sizeClasses[size]}
                ${isDark ? colors.dark : colors.light}
            `}
        >
            {pulse && (
                <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.dot}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`} />
                </span>
            )}
            {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
            {label}
        </span>
    );
};
