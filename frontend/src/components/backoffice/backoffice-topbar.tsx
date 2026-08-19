import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    Bell, Clock, Menu, Moon, PanelLeft, PanelLeftClose, Palette, Search, Sun, Zap,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { Notification } from '../../hooks/useNotifications';
import { BackofficeBreadcrumb } from './backoffice-breadcrumb';
import { BackofficeQuickActionsPanel } from './backoffice-quick-actions-panel';
import { BackofficeNotificationsPanel } from './backoffice-notifications-panel';
import { BackofficeThemeSettingsPanel } from './backoffice-theme-settings-panel';
import type { ResolvedMenuGroup } from './backoffice-menu-types';

interface BackofficeTopbarProps {
    groups: ResolvedMenuGroup[];
    isActive: (path: string) => boolean;
    onOpenMobileMenu: () => void;
    onOpenCommandPalette: () => void;
    currentTime: Date;
    notifications: Notification[];
    notificationsLoading: boolean;
    unreadCount: number;
    isRealtimeConnected: boolean;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onRefreshNotifications: () => void;
}

/** Top header bar: breadcrumb, search, and the notification/quick-actions/theme dropdowns. */
export const BackofficeTopbar = ({
    groups, isActive, onOpenMobileMenu, onOpenCommandPalette, currentTime,
    notifications, notificationsLoading, unreadCount, isRealtimeConnected,
    onMarkAsRead, onMarkAllAsRead, onRefreshNotifications,
}: BackofficeTopbarProps) => {
    const { isDark, colors, toggleMode, sidebarCollapsed, setSidebarCollapsed } = useTheme();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [openPanel, setOpenPanel] = useState<'quickActions' | 'notifications' | 'settings' | null>(null);

    const togglePanel = (panel: 'quickActions' | 'notifications' | 'settings') => {
        setOpenPanel(prev => (prev === panel ? null : panel));
    };

    return (
        <header className={`h-16 relative z-50 flex items-center justify-between px-4 lg:px-6 border-b transition-colors duration-300 ${isDark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl' : 'bg-white/80 border-gray-200 backdrop-blur-xl'}`}>
            <div className="flex items-center gap-3">
                <button
                    onClick={onOpenMobileMenu}
                    className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                    <Menu size={20} />
                </button>

                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={`hidden lg:flex p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                    title="Toggle Sidebar (Ctrl+B)"
                >
                    {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                </button>

                <BackofficeBreadcrumb groups={groups} isActive={isActive} />

                <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-slate-100 border-slate-200'}`}>
                    <Search size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Tìm kiếm... (Ctrl+K)"
                        className={`bg-transparent border-none outline-none text-sm w-48 lg:w-64 ${isDark ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
                        onClick={onOpenCommandPalette}
                        readOnly
                    />
                    <kbd className={`hidden lg:inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                        /
                    </kbd>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative">
                    <button
                        onClick={() => togglePanel('quickActions')}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                        title="Quick Actions"
                    >
                        <Zap size={20} />
                    </button>
                    <AnimatePresence>
                        {openPanel === 'quickActions' && (
                            <BackofficeQuickActionsPanel onSelect={() => setOpenPanel(null)} />
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative">
                    <button
                        onClick={() => togglePanel('notifications')}
                        className={`p-2 rounded-lg relative transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span
                                className="absolute top-1 right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                                style={{ backgroundColor: colors.primary }}
                            >
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <AnimatePresence>
                        {openPanel === 'notifications' && (
                            <BackofficeNotificationsPanel
                                notifications={notifications}
                                loading={notificationsLoading}
                                unreadCount={unreadCount}
                                isRealtimeConnected={isRealtimeConnected}
                                onMarkAsRead={onMarkAsRead}
                                onMarkAllAsRead={onMarkAllAsRead}
                                onRefresh={onRefreshNotifications}
                                onClose={() => setOpenPanel(null)}
                            />
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={toggleMode}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-amber-300' : 'hover:bg-gray-100 text-gray-600 hover:text-amber-500'}`}
                    title="Toggle Theme"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="relative">
                    <button
                        onClick={() => togglePanel('settings')}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <Palette size={20} />
                    </button>
                    <AnimatePresence>
                        {openPanel === 'settings' && <BackofficeThemeSettingsPanel />}
                    </AnimatePresence>
                </div>

                <div className={`hidden xl:flex items-center gap-3 px-4 py-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <Clock size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        {' • '}
                        {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {openPanel && (
                <div className="fixed inset-0 z-40" onClick={() => setOpenPanel(null)} />
            )}
        </header>
    );
};
