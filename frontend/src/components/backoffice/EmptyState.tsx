import { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) => {
    const { isDark } = useTheme();

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                    isDark ? 'bg-gray-800' : 'bg-gray-100'
                }`}
            >
                <Icon size={32} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h3>
            {description && (
                <p className={`max-w-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {description}
                </p>
            )}
            {action}
        </div>
    );
};
