import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { AdminGlobalSearch } from '../components/backoffice/AdminGlobalSearch';
import { AdminFAB } from '../components/backoffice/AdminFAB';
import { AdminShortcutsModal } from '../components/backoffice/AdminShortcutsModal';
import { useBackofficeMenu } from '../components/backoffice/use-backoffice-menu';
import { useKeyboardShortcut } from '../components/backoffice/use-keyboard-shortcut';
import { BackofficeSidebar } from '../components/backoffice/backoffice-sidebar';
import { BackofficeTopbar } from '../components/backoffice/backoffice-topbar';

/**
 * Backoffice/admin shell: composes sidebar + topbar + <Outlet/> and owns only
 * the cross-cutting state (mobile drawer, command palette, current time).
 * Menu fetch/filter logic lives in `useBackofficeMenu`; visual pieces live
 * under `components/backoffice/`.
 */
export const BackofficeLayout = () => {
    const { user } = useAuth();
    const { isDark, sidebarCollapsed, setSidebarCollapsed } = useTheme();
    const location = useLocation();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Close the mobile drawer on route change
    useEffect(() => setIsMobileMenuOpen(false), [location.pathname]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useKeyboardShortcut('k', () => setShowCommandPalette(true), true);
    useKeyboardShortcut('b', () => setSidebarCollapsed(!sidebarCollapsed), true);

    const {
        filteredGroups, allItems, expandedGroups, toggleGroup, isActive, isGroupActive,
        pendingCount, salesStats,
    } = useBackofficeMenu();

    // useNotifications' internal callbacks depend on `roles` by reference — `user?.roles || []`
    // creates a brand-new array every render (when user is falsy), which cascades into an
    // unstable fetchNotifications callback and can trigger a "Maximum update depth exceeded"
    // render loop. Memoize by content so the reference is stable across renders.
    const userRoles = useMemo(() => user?.roles ?? [], [user?.roles?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const {
        notifications, loading: notificationsLoading, unreadCount,
        markAsRead, markAllAsRead, refresh: refreshNotifications, isRealtimeConnected,
    } = useNotifications({
        roles: userRoles,
        refreshInterval: 120000,
        enableRealtime: true,
        showToastOnNewNotification: true,
    });

    return (
        <div className={`h-screen flex overflow-hidden transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <aside className={`hidden lg:block transition-all duration-300 border-r ${isDark ? 'border-gray-800' : 'border-slate-200'} ${sidebarCollapsed ? 'w-20' : 'w-60'}`}>
                <BackofficeSidebar
                    collapsed={sidebarCollapsed}
                    groups={filteredGroups}
                    expandedGroups={expandedGroups}
                    onToggleGroup={toggleGroup}
                    isActive={isActive}
                    isGroupActive={isGroupActive}
                    pendingCount={pendingCount}
                    monthRevenue={salesStats?.monthRevenue}
                />
            </aside>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            className="lg:hidden fixed inset-y-0 left-0 w-60 z-[60] shadow-2xl"
                        >
                            <BackofficeSidebar
                                collapsed={false}
                                groups={filteredGroups}
                                expandedGroups={expandedGroups}
                                onToggleGroup={toggleGroup}
                                isActive={isActive}
                                isGroupActive={isGroupActive}
                                pendingCount={pendingCount}
                                monthRevenue={salesStats?.monthRevenue}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <BackofficeTopbar
                    groups={filteredGroups}
                    isActive={isActive}
                    onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                    onOpenCommandPalette={() => setShowCommandPalette(true)}
                    currentTime={currentTime}
                    notifications={notifications}
                    notificationsLoading={notificationsLoading}
                    unreadCount={unreadCount}
                    isRealtimeConnected={isRealtimeConnected}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onRefreshNotifications={refreshNotifications}
                />

                <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
                    <div className="p-4 lg:p-6 max-w-[1700px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            <AdminGlobalSearch
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
                items={allItems}
                isDark={isDark}
            />

            <AdminFAB />
            <AdminShortcutsModal />

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .dark { color-scheme: dark; }
            `}</style>
        </div>
    );
};
