import { motion } from 'framer-motion';
import { Crown, Star, User, AlertTriangle, UserX, UserPlus } from 'lucide-react';
import type { LifecycleStage } from '../../api/crm';

interface LifecycleStageBadgeProps {
  stage: LifecycleStage;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const stageConfig: Record<LifecycleStage, {
  label: string;
  bgColor: string;
  textColor: string;
  icon: typeof Crown;
}> = {
  Champion: { label: 'Champion', bgColor: 'bg-purple-100', textColor: 'text-purple-800', icon: Crown },
  VIP: { label: 'VIP', bgColor: 'bg-blue-100', textColor: 'text-blue-800', icon: Star },
  Active: { label: 'Hoạt động', bgColor: 'bg-green-100', textColor: 'text-green-800', icon: User },
  AtRisk: { label: 'Cần chăm sóc', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', icon: AlertTriangle },
  Churned: { label: 'Đã rời bỏ', bgColor: 'bg-red-100', textColor: 'text-red-800', icon: UserX },
  New: { label: 'Mới', bgColor: 'bg-gray-100', textColor: 'text-gray-800', icon: UserPlus },
};

export default function LifecycleStageBadge({
  stage,
  size = 'md',
  showIcon = true
}: LifecycleStageBadgeProps) {
  const config = stageConfig[stage] || stageConfig.New;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </motion.span>
  );
}
