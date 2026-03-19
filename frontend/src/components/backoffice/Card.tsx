import { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    actions?: ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    className?: string;
    noBorder?: boolean;
}

export const Card = ({ children, title, subtitle, actions, padding = 'md', className = '', noBorder }: CardProps) => {
    const { isDark } = useTheme();

    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={`rounded-2xl transition-colors ${
                noBorder ? '' : 'border'
            } ${
                isDark
                    ? `bg-gray-900 ${noBorder ? '' : 'border-gray-800'}`
                    : `bg-white ${noBorder ? '' : 'border-gray-100'}`
            } ${className}`}
        >
            {(title || actions) && (
                <div className={`flex items-center justify-between px-6 py-4 border-b ${
                    isDark ? 'border-gray-800' : 'border-gray-100'
                }`}>
                    <div>
                        {title && (
                            <h3 className={`font-bold text-sm uppercase tracking-wide ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={paddingClasses[padding]}>
                {children}
            </div>
        </div>
    );
};
