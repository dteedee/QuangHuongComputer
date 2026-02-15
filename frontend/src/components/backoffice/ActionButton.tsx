import { ReactNode, ButtonHTMLAttributes } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Loader2 } from 'lucide-react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    fullWidth?: boolean;
}

export const ActionButton = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading,
    fullWidth,
    disabled,
    className = '',
    ...props
}: ActionButtonProps) => {
    const { isDark, colors } = useTheme();

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs gap-1.5',
        md: 'px-4 py-2.5 text-sm gap-2',
        lg: 'px-6 py-3 text-base gap-2.5',
    };

    const getVariantClasses = () => {
        switch (variant) {
            case 'primary':
                return `text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]`;
            case 'secondary':
                return isDark
                    ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200';
            case 'outline':
                return isDark
                    ? 'bg-transparent border-2 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white'
                    : 'bg-transparent border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900';
            case 'ghost':
                return isDark
                    ? 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100';
            case 'danger':
                return isDark
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-600 text-white hover:bg-red-700';
            default:
                return '';
        }
    };

    const style = variant === 'primary' ? { backgroundColor: colors.primary } : {};

    return (
        <button
            className={`
                inline-flex items-center justify-center rounded-xl font-semibold transition-all
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                ${sizeClasses[size]}
                ${getVariantClasses()}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            disabled={disabled || loading}
            style={style}
            {...props}
        >
            {loading ? (
                <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin" />
            ) : (
                <>
                    {icon && iconPosition === 'left' && icon}
                    {children}
                    {icon && iconPosition === 'right' && icon}
                </>
            )}
        </button>
    );
};
