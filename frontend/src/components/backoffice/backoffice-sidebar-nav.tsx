import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import type { ResolvedMenuGroup } from './backoffice-menu-types';

interface BackofficeSidebarNavProps {
    groups: ResolvedMenuGroup[];
    collapsed: boolean;
    expandedGroups: string[];
    onToggleGroup: (id: string) => void;
    isActive: (path: string) => boolean;
    isGroupActive: (groupId: string) => boolean;
}

/** Collapsible group + item list rendered inside the sidebar. */
export const BackofficeSidebarNav = ({
    groups, collapsed, expandedGroups, onToggleGroup, isActive, isGroupActive,
}: BackofficeSidebarNavProps) => {
    const { isDark, colors } = useTheme();

    return (
        <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-hide">
            {groups.map(group => {
                const groupActive = isGroupActive(group.id);
                const isExpanded = expandedGroups.includes(group.id);

                return (
                    <div key={group.id} className="space-y-1">
                        <button
                            onClick={() => onToggleGroup(group.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${groupActive
                                ? isDark ? 'text-white bg-gray-800/50' : 'text-gray-900 bg-gray-100/50'
                                : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className={groupActive ? '' : group.color} style={groupActive ? { color: colors.primary } : {}}>
                                    {group.icon}
                                </span>
                                {!collapsed && group.title}
                            </span>
                            {!collapsed && (
                                <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            )}
                        </button>

                        <AnimatePresence initial={false}>
                            {(isExpanded || collapsed) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="overflow-hidden space-y-1"
                                >
                                    {group.items.map(item => {
                                        const active = isActive(item.path);
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                title={collapsed ? item.title : undefined}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${active
                                                    ? isDark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-blue-700'
                                                    : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                    }`}
                                                style={active ? { borderLeft: `3px solid ${colors.primary}` } : {}}
                                            >
                                                <span
                                                    className={`flex-shrink-0 ${active ? '' : isDark ? 'text-gray-500' : 'text-slate-400'}`}
                                                    style={active ? { color: colors.primary } : {}}
                                                >
                                                    {item.icon}
                                                </span>
                                                {!collapsed && (
                                                    <>
                                                        <span className="text-sm font-medium flex-1">{item.title}</span>
                                                        {item.badge ? (
                                                            <span
                                                                className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                                style={{ backgroundColor: colors.primary }}
                                                            >
                                                                {item.badge}
                                                            </span>
                                                        ) : active ? (
                                                            <ChevronRight size={14} className="text-gray-400" />
                                                        ) : null}
                                                    </>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};
