import { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: Breadcrumb[];
    actions?: ReactNode;
    icon?: ReactNode;
}

export const PageHeader = ({ title, subtitle, breadcrumbs, actions, icon }: PageHeaderProps) => {
    const { isDark, colors } = useTheme();

    return (
        <div className="mb-6">
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-2 text-sm mb-2">
                    {breadcrumbs.map((crumb, index) => (
                        <span key={index} className="flex items-center gap-2">
                            {index > 0 && <ChevronRight size={14} className={isDark ? 'text-gray-600' : 'text-gray-400'} />}
                            {crumb.href ? (
                                <Link
                                    to={crumb.href}
                                    className={`transition-colors ${isDark
                                        ? 'text-gray-400 hover:text-white'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                    {crumb.label}
                                </span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    {icon && (
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {icon}
                        </div>
                    )}
                    <div>
                        <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </h1>
                        {subtitle && (
                            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};
