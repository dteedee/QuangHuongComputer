import { motion } from 'framer-motion';

interface RfmScoreBadgeProps {
  recency: number;
  frequency: number;
  monetary: number;
  showTotal?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getScoreColor = (score: number): string => {
  if (score >= 4) return 'bg-green-500';
  if (score >= 3) return 'bg-yellow-500';
  if (score >= 2) return 'bg-orange-500';
  return 'bg-red-500';
};

const getTotalColor = (total: number): string => {
  if (total >= 12) return 'text-green-600 bg-green-50';
  if (total >= 9) return 'text-blue-600 bg-blue-50';
  if (total >= 6) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

export default function RfmScoreBadge({
  recency,
  frequency,
  monetary,
  showTotal = true,
  size = 'md'
}: RfmScoreBadgeProps) {
  const total = recency + frequency + monetary;

  const sizeClasses = {
    sm: { box: 'w-5 h-5 text-xs', total: 'text-sm px-2 py-0.5' },
    md: { box: 'w-7 h-7 text-sm', total: 'text-base px-3 py-1' },
    lg: { box: 'w-9 h-9 text-base', total: 'text-lg px-4 py-1.5' },
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {/* Recency */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`${sizeClasses[size].box} ${getScoreColor(recency)} rounded flex items-center justify-center text-white font-bold`}
          title={`Recency: ${recency}`}
        >
          {recency}
        </motion.div>

        {/* Frequency */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`${sizeClasses[size].box} ${getScoreColor(frequency)} rounded flex items-center justify-center text-white font-bold`}
          title={`Frequency: ${frequency}`}
        >
          {frequency}
        </motion.div>

        {/* Monetary */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`${sizeClasses[size].box} ${getScoreColor(monetary)} rounded flex items-center justify-center text-white font-bold`}
          title={`Monetary: ${monetary}`}
        >
          {monetary}
        </motion.div>
      </div>

      {showTotal && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className={`${sizeClasses[size].total} ${getTotalColor(total)} font-bold rounded-full`}
        >
          {total}
        </motion.span>
      )}
    </div>
  );
}
