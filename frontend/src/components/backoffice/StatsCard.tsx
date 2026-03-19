import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    color?: 'primary' | 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray' | 'pink' | 'cyan';
    onClick?: () => void;
    loading?: boolean;
}

const colorStyles = {
    primary: {
        light: { bg: 'bg-red-50', iconBg: 'bg-red-100', iconText: 'text-red-600' },
        dark: { bg: 'bg-red-900/20', iconBg: 'bg-red-900/50', iconText: 'text-red-400' },
    },
    blue: {
        light: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
        dark: { bg: 'bg-blue-900/20', iconBg: 'bg-blue-900/50', iconText: 'text-blue-400' },
    },
    green: {
        light: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
        dark: { bg: 'bg-emerald-900/20', iconBg: 'bg-emerald-900/50', iconText: 'text-emerald-400' },
    },
    purple: {
        light: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
        dark: { bg: 'bg-purple-900/20', iconBg: 'bg-purple-900/50', iconText: 'text-purple-400' },
    },
    orange: {
        light: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
        dark: { bg: 'bg-orange-900/20', iconBg: 'bg-orange-900/50', iconText: 'text-orange-400' },
    },
    red: {
        light: { bg: 'bg-red-50', iconBg: 'bg-red-100', iconText: 'text-red-600' },
        dark: { bg: 'bg-red-900/20', iconBg: 'bg-red-900/50', iconText: 'text-red-400' },
    },
    gray: {
        light: { bg: 'bg-gray-50', iconBg: 'bg-gray-100', iconText: 'text-gray-600' },
        dark: { bg: 'bg-gray-800', iconBg: 'bg-gray-700', iconText: 'text-gray-400' },
    },
    pink: {
        light: { bg: 'bg-pink-50', iconBg: 'bg-pink-100', iconText: 'text-pink-600' },
        dark: { bg: 'bg-pink-900/20', iconBg: 'bg-pink-900/50', iconText: 'text-pink-400' },
    },
    cyan: {
        light: { bg: 'bg-cyan-50', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600' },
        dark: { bg: 'bg-cyan-900/20', iconBg: 'bg-cyan-900/50', iconText: 'text-cyan-400' },
    },
};

export const StatsCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = 'blue',
    onClick,
    loading,
}: StatsCardProps) => {
    const { isDark, colors } = useTheme();
    const styles = colorStyles[color][isDark ? 'dark' : 'light'];

    return (
        <motion.div
            whileHover={{ y: -4, boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.3)' : '0 10px 40px rgba(0,0,0,0.1)' }}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            onClick={onClick}
            className={`rounded-2xl p-6 transition-all border ${onClick ? 'cursor-pointer' : ''} ${
                isDark
                    ? 'bg-gray-900 border-gray-800'
                    : 'bg-white border-gray-100'
            }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${styles.iconBg}`}>
                    <Icon className={styles.iconText} size={24} />
                </div>

                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                        trend.isPositive
                            ? isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                            : isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
                    }`}>
                        {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                    </div>
                )}
            </div>

            <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {title}
                </p>
                {loading ? (
                    <div className={`h-8 w-24 rounded animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
                ) : (
                    <p className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {value}
                    </p>
                )}
                {subtitle && (
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {subtitle}
                    </p>
                )}
            </div>
        </motion.div>
    );
};
