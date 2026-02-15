import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface CustomerStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    text: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    text: 'text-green-900',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    text: 'text-purple-900',
  },
  orange: {
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    text: 'text-orange-900',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    text: 'text-red-900',
  },
  gray: {
    bg: 'bg-gray-50',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    text: 'text-gray-900',
  },
};

export default function CustomerStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  onClick,
}: CustomerStatsCardProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`${colors.bg} rounded-2xl p-6 ${onClick ? 'cursor-pointer' : ''} transition-all`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors.iconBg}`}>
          <Icon className={colors.iconText} size={24} />
        </div>

        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            <svg
              className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
