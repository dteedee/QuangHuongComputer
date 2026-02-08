import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'brand' | 'white' | 'gray';
  className?: string;
}

export const Spinner = ({ size = 'md', color = 'brand', className }: LoadingProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colors = {
    brand: 'border-[#D70018]',
    white: 'border-white',
    gray: 'border-gray-400',
  };

  return (
    <div className={cn('relative', sizes[size], className)}>
      <div className={cn('absolute inset-0 rounded-full border-4', colors[color], 'opacity-25')} />
      <div
        className={cn(
          'absolute inset-0 rounded-full border-4 border-t-transparent animate-spin',
          colors[color]
        )}
      />
    </div>
  );
};

export const DotLoader = ({ size = 'md', className }: LoadingProps) => {
  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-[#D70018]', sizes[size])}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-100">
    <div className="skeleton aspect-[4/5]" />
    <div className="p-5 space-y-3">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-5 w-full" />
      <div className="skeleton h-5 w-2/3" />
      <div className="skeleton h-6 w-1/2" />
    </div>
  </div>
);

export const PageLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-20 h-20 mx-auto mb-6 relative"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D70018] to-[#B50014] opacity-20" />
        <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-[#D70018] to-[#B50014]" />
      </motion.div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quang Hưởng Computer</h2>
      <p className="text-gray-500">Đang tải...</p>
    </motion.div>
  </div>
);

export const InlineLoader = ({ text = 'Đang tải...' }: { text?: string }) => (
  <div className="flex items-center justify-center gap-3 py-8">
    <Spinner size="md" />
    <span className="text-gray-600">{text}</span>
  </div>
);

export const FullPageLoader = () => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#D70018]/5 to-[#B50014]/5 backdrop-blur-sm">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <div className="relative w-24 h-24 mx-auto mb-6">
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-[#D70018]/20"
        />
        {/* Middle ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 rounded-full border-4 border-[#D70018]/40 border-t-transparent"
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4 rounded-full border-4 border-[#D70018] border-t-transparent border-r-transparent"
        />
        {/* Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D70018] to-[#B50014] flex items-center justify-center text-white font-bold text-lg">
            QH
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quang Hưởng Computer</h2>
      <p className="text-gray-500">Đang tải hệ thống...</p>
    </motion.div>
  </div>
);

export default Spinner;
