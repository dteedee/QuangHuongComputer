import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { designSystem } from '@/design-system/theme';

// ================================================
// BUTTON COMPONENT - Atomic Component
// ================================================

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantStyles = {
    primary: `
      bg-primary-500 text-white hover:bg-primary-600
      focus:ring-primary-500 shadow-sm hover:shadow-md
      active:scale-95
    `,
    secondary: `
      bg-secondary-500 text-white hover:bg-secondary-600
      focus:ring-secondary-500 shadow-sm hover:shadow-md
      active:scale-95
    `,
    outline: `
      border-2 border-primary-500 text-primary-500
      hover:bg-primary-50 focus:ring-primary-500
      active:scale-95
    `,
    ghost: `
      text-primary-500 hover:bg-primary-50
      focus:ring-primary-500
    `,
    danger: `
      bg-error-500 text-white hover:bg-error-600
      focus:ring-error-500 shadow-sm hover:shadow-md
      active:scale-95
    `,
  };

  const sizeStyles = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg',
    xl: 'px-10 py-4 text-xl',
  };

  return (
    <motion.button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isDisabled || isLoading}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && leftIcon && <span>{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span>{rightIcon}</span>}
    </motion.button>
  );
};

// ================================================
// INPUT COMPONENT
// ================================================

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'filled';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'outline',
  className = '',
  ...props
}) => {
  const baseStyles = `
    w-full rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2
    disabled:opacity-50 disabled:cursor-not-allowed
    text-gray-900 placeholder:text-gray-400
  `;

  const variantStyles = {
    outline: `
      border ${error ? 'border-error-500' : 'border-neutral-300'}
      bg-white focus:border-primary-500 focus:ring-primary-500
    `,
    filled: `
      border-0 bg-neutral-100 focus:bg-white
      focus:ring-primary-500
    `,
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {leftIcon}
          </div>
        )}
        <input
          className={`
            ${baseStyles}
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-error-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
};

// ================================================
// CARD COMPONENT
// ================================================

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  hoverable = false,
  onClick,
  className = '',
}) => {
  const baseStyles = 'rounded-xl transition-all duration-300';

  const variantStyles = {
    elevated: 'bg-white shadow-lg hover:shadow-xl',
    outlined: 'bg-white border border-neutral-200',
    filled: 'bg-neutral-50',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hoverable ? 'cursor-pointer hover:scale-[1.02]' : '';

  return (
    <motion.div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverStyles}
        ${className}
      `}
      onClick={onClick}
      whileHover={hoverable ? { y: -4 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

// ================================================
// BADGE COMPONENT
// ================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  rounded = false,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium';

  const variantStyles = {
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
    info: 'bg-secondary-100 text-secondary-700',
    neutral: 'bg-neutral-100 text-neutral-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const roundedStyle = rounded ? 'rounded-full' : 'rounded-md';

  return (
    <span
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${roundedStyle}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

// ================================================
// AVATAR COMPONENT
// ================================================

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const statusStyles = {
    online: 'bg-success-500',
    offline: 'bg-neutral-400',
    away: 'bg-warning-500',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${sizeStyles[size]}
          rounded-full overflow-hidden bg-primary-100
          flex items-center justify-center
          font-semibold text-primary-700
        `}
      >
        {src ? (
          <img src={src} alt={alt || name} className="w-full h-full object-cover" />
        ) : (
          <span>{name ? getInitials(name) : '?'}</span>
        )}
      </div>
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            w-3 h-3 rounded-full border-2 border-white
            ${statusStyles[status]}
          `}
        />
      )}
    </div>
  );
};
