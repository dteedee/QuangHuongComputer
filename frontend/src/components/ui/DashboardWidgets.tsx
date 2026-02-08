import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  className?: string;
}

export const StatCard = ({ title, value, change, icon, trend, className }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      'relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 group',
      className
    )}
  >
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
      <div className="absolute inset-0 bg-gradient-to-br from-[#D70018] to-[#B50014]" />
    </div>

    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D70018]/10 to-[#B50014]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold',
              trend === 'up' || change > 0
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            )}
          >
            {trend === 'up' || change > 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </motion.div>
);

// Pre-configured stat cards
export const RevenueCard = (props: Omit<StatCardProps, 'icon'>) => (
  <StatCard
    {...props}
    icon={<DollarSign className="w-7 h-7 text-[#D70018]" />}
  />
);

export const OrdersCard = (props: Omit<StatCardProps, 'icon'>) => (
  <StatCard
    {...props}
    icon={<ShoppingCart className="w-7 h-7 text-[#D70018]" />}
  />
);

export const ProductsCard = (props: Omit<StatCardProps, 'icon'>) => (
  <StatCard
    {...props}
    icon={<Package className="w-7 h-7 text-[#D70018]" />}
  />
);

export const CustomersCard = (props: Omit<StatCardProps, 'icon'>) => (
  <StatCard
    {...props}
    icon={<Users className="w-7 h-7 text-[#D70018]" />}
  />
);

// Chart Card
interface ChartCardProps {
  title: string;
  value: string | number;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard = ({ title, value, children, className }: ChartCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      'rounded-3xl bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300',
      className
    )}
  >
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-3xl font-bold text-[#D70018] mt-1">{value}</p>
      </div>
    </div>
    {children}
  </motion.div>
);

// Activity Item
interface ActivityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  onClick?: () => void;
}

export const ActivityItem = ({ icon, title, description, time, onClick }: ActivityItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group"
    onClick={onClick}
  >
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D70018]/10 to-[#B50014]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900 group-hover:text-[#D70018] transition-colors">
        {title}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
  </motion.div>
);

// Progress Card
interface ProgressCardProps {
  title: string;
  progress: number;
  total: number;
  color?: 'brand' | 'success' | 'warning';
}

export const ProgressCard = ({ title, progress, total, color = 'brand' }: ProgressCardProps) => {
  const percentage = Math.round((progress / total) * 100);

  const colors = {
    brand: 'from-[#D70018] to-[#B50014]',
    success: 'from-[#10B981] to-[#047857]',
    warning: 'from-[#F59E0B] to-[#D97706]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-sm font-bold text-[#D70018]">{percentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className={cn('h-full rounded-full bg-gradient-to-r', colors[color])}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{progress} hoàn thành</span>
        <span>/ {total} tổng</span>
      </div>
    </motion.div>
  );
};

// Mini Chart Card
interface MiniChartCardProps {
  title: string;
  value: string | number;
  data: number[];
  color?: 'brand' | 'success' | 'warning';
}

export const MiniChartCard = ({ title, value, data, color = 'brand' }: MiniChartCardProps) => {
  const colors = {
    brand: '#D70018',
    success: '#10B981',
    warning: '#F59E0B',
  };

  const max = Math.max(...data);
  const min = Math.min(...data);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 group-hover:text-[#D70018] transition-colors">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            color === 'brand' && 'bg-[#D70018]/10',
            color === 'success' && 'bg-green-100',
            color === 'warning' && 'bg-yellow-100'
          )}
        >
          <TrendingUp className={cn(
            'w-5 h-5',
            color === 'brand' && 'text-[#D70018]',
            color === 'success' && 'text-green-600',
            color === 'warning' && 'text-yellow-600'
          )} />
        </div>
      </div>

      {/* Mini Bar Chart */}
      <div className="flex items-end gap-1 h-12">
        {data.map((value, index) => {
          const height = ((value - min) / (max - min)) * 100;
          return (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={cn(
                'flex-1 rounded-t-md',
                color === 'brand' && 'bg-gradient-to-t from-[#D70018] to-[#FF4D4D]',
                color === 'success' && 'bg-gradient-to-t from-[#10B981] to-[#34D399]',
                color === 'warning' && 'bg-gradient-to-t from-[#F59E0B] to-[#FBBF24]'
              )}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

export default {
  StatCard,
  RevenueCard,
  OrdersCard,
  ProductsCard,
  CustomersCard,
  ChartCard,
  ActivityItem,
  ProgressCard,
  MiniChartCard,
};
