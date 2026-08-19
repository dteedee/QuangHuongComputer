import { Link, useNavigate } from 'react-router-dom';
import { Store, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BackofficeSidebarNav } from './backoffice-sidebar-nav';
import type { ResolvedMenuGroup } from './backoffice-menu-types';

interface BackofficeSidebarProps {
    collapsed: boolean;
    groups: ResolvedMenuGroup[];
    expandedGroups: string[];
    onToggleGroup: (id: string) => void;
    isActive: (path: string) => boolean;
    isGroupActive: (groupId: string) => boolean;
    pendingCount: number;
    monthRevenue?: number;
}

/** Sidebar content shared by the desktop rail and the mobile drawer. */
export const BackofficeSidebar = ({
    collapsed, groups, expandedGroups, onToggleGroup, isActive, isGroupActive, pendingCount, monthRevenue,
}: BackofficeSidebarProps) => {
    const { user, logout } = useAuth();
    const { isDark, colors } = useTheme();
    const navigate = useNavigate();
    const roles = user?.roles || [];

    return (
        <div className={`flex flex-col h-full transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Logo & Brand */}
            <div className={`px-6 py-6 flex items-center gap-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm bg-gradient-to-br ${colors.gradient}`}>
                    QH
                </div>
                {!collapsed && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
                        <span className={`text-sm font-semibold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Quang Hưởng
                        </span>
                        <span className="text-xs font-medium mt-1" style={{ color: colors.primary }}>
                            Management
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Quick Stats */}
            {!collapsed && (
                <div className={`px-4 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Đơn chờ</div>
                            <div className="text-xl font-bold" style={{ color: colors.primary }}>{pendingCount}</div>
                        </div>
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Doanh thu</div>
                            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {monthRevenue ? `${(monthRevenue / 1000000).toFixed(1)}M` : '0'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BackofficeSidebarNav
                groups={groups}
                collapsed={collapsed}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                isActive={isActive}
                isGroupActive={isGroupActive}
            />

            {/* User Section */}
            <div className={`p-4 border-t ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                {!collapsed && (
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Store size={14} /> Quay về trang chủ
                    </Link>
                )}

                <div className={`flex items-center gap-3 p-3 rounded-xl mt-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ backgroundColor: colors.primary }}>
                        {user?.fullName?.charAt(0)}
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {user?.fullName}
                                </p>
                                <p className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                    {roles[0]}
                                </p>
                            </div>
                            <button
                                onClick={() => { logout(); navigate('/login'); }}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'}`}
                            >
                                <Power size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
