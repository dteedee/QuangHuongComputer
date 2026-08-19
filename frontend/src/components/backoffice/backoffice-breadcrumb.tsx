import { ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import type { ResolvedMenuGroup } from './backoffice-menu-types';

interface BackofficeBreadcrumbProps {
    groups: ResolvedMenuGroup[];
    isActive: (path: string) => boolean;
}

/** Simple two-level breadcrumb: "Quản trị" > current page title. */
export const BackofficeBreadcrumb = ({ groups, isActive }: BackofficeBreadcrumbProps) => {
    const { isDark } = useTheme();
    const location = useLocation();

    const currentTitle = groups
        .flatMap(g => g.items)
        .find(i => isActive(i.path) && i.path !== '/backoffice')?.title
        || location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <div className="hidden md:flex items-center gap-2 px-2 text-sm">
            <span className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quản trị</span>
            {location.pathname !== '/backoffice' && (
                <>
                    <ChevronRight size={14} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentTitle}</span>
                </>
            )}
        </div>
    );
};
