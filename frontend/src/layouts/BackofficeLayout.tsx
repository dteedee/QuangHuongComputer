import { useLocation } from 'react-router-dom';
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
import { BackofficeRouteSkeleton } from '../components/backoffice/backoffice-route-skeleton';
import { RouteOutlet } from './route-outlet';

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
    } = useBackofficeMenu();  // `pendingCount`/`salesStats` cố tình KHÔNG lấy: số liệu thuộc dashboard, không thuộc sidebar (§9.6).

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
        /* `data-shell="admin"` LÀ công tắc mật độ của cả bộ UI kit: `tokens.css` hạ `--bg`
         * xuống một bậc xám, còn `components/ui/variants.ts` đã viết sẵn các biến thể
         * `[[data-shell=admin]_&]` (nút 40px, chữ 13px, card p-4, PageHeader text-xl).
         * Vì storefront không bao giờ có thuộc tính này, mật độ gọn KHÔNG THỂ rò sang
         * mặt khách — không cần prop, không cần fork component. (design-guidelines §9.2) */
        <div data-shell="admin" className="flex h-screen overflow-hidden bg-bg">
            <aside className={`hidden lg:block shrink-0 border-r border-line transition-[width] duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
                <BackofficeSidebar
                    collapsed={sidebarCollapsed}
                    groups={filteredGroups}
                    expandedGroups={expandedGroups}
                    onToggleGroup={toggleGroup}
                    isActive={isActive}
                    isGroupActive={isGroupActive}
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
                            className="lg:hidden fixed inset-0 z-scrim bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            className="lg:hidden fixed inset-y-0 left-0 z-drawer w-60 border-r border-line shadow-xl"
                        >
                            <BackofficeSidebar
                                collapsed={false}
                                groups={filteredGroups}
                                expandedGroups={expandedGroups}
                                onToggleGroup={toggleGroup}
                                isActive={isActive}
                                isGroupActive={isGroupActive}
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

                {/* §9.2: khung nội dung dùng HẾT bề ngang màn hình — chỉ padding ngang,
                    không `max-w-*` + `mx-auto` (màn 1920px trước đây bỏ trống ~450px bên phải). */}
                <main className="min-w-0 flex-1 overflow-y-auto bg-bg">
                    <div className="min-h-full w-full max-w-none px-4 py-4 lg:px-6 lg:py-5">
                        <RouteOutlet skeleton={<BackofficeRouteSkeleton />} />
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
