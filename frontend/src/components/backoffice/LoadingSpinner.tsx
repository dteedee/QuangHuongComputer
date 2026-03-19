import { useTheme } from '../../context/ThemeContext';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
}

export const LoadingSpinner = ({ size = 'md', text, fullScreen }: LoadingSpinnerProps) => {
    const { isDark, colors } = useTheme();

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const content = (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader2
                className={`animate-spin ${sizeClasses[size]}`}
                style={{ color: colors.primary }}
            />
            {text && (
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center z-50 ${
                isDark ? 'bg-gray-950/80' : 'bg-white/80'
            } backdrop-blur-sm`}>
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-12">
            {content}
        </div>
    );
};
