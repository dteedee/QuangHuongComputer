import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    Bell, Clock, Menu, Moon, PanelLeft, PanelLeftClose, Palette, Search, Sun, Zap,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { IconButton } from '../ui/icon-button';
import { Tooltip } from '../ui/tooltip';
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

type PanelId = 'quickActions' | 'notifications' | 'settings';

/**
 * Thanh trên cùng back office: breadcrumb, ô tìm kiếm, và các nút mở panel.
 *
 * Mọi nút chỉ có icon đều dùng `IconButton` (kiểu TS bắt buộc `aria-label`) bọc trong
 * `Tooltip` tiếng Việt — trước đây nút chuông và nút bảng màu không có tên khả truy cập,
 * còn hai nút khác thì `title` bằng tiếng Anh ("Toggle Sidebar", "Quick Actions").
 * Màu lấy từ token, không còn ternary sáng/tối để chọn màu (design-guidelines §9.1).
 */
export const BackofficeTopbar = ({
    groups, isActive, onOpenMobileMenu, onOpenCommandPalette, currentTime,
    notifications, notificationsLoading, unreadCount, isRealtimeConnected,
    onMarkAsRead, onMarkAllAsRead, onRefreshNotifications,
}: BackofficeTopbarProps) => {
    /* Đổi tên `isDark` -> `darkMode`: biến này CHỈ dùng để chọn icon/nhãn của nút đổi giao
     * diện, không bao giờ để chọn màu (màu do token tự lật — §9.1 cấm ternary sáng/tối). */
    const { isDark: darkMode, toggleMode, sidebarCollapsed, setSidebarCollapsed } = useTheme();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [openPanel, setOpenPanel] = useState<PanelId | null>(null);

    const togglePanel = (panel: PanelId) =>
        setOpenPanel(prev => (prev === panel ? null : panel));

    return (
        <header className="relative z-topbar flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface/85 px-3 backdrop-blur-xl lg:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <Tooltip content="Mở menu điều hướng" side="bottom">
                    <IconButton
                        size="sm"
                        aria-label="Mở menu điều hướng"
                        className="lg:hidden"
                        onClick={onOpenMobileMenu}
                    >
                        <Menu size={18} aria-hidden />
                    </IconButton>
                </Tooltip>

                <Tooltip content={sidebarCollapsed ? 'Mở rộng thanh bên (Ctrl+B)' : 'Thu gọn thanh bên (Ctrl+B)'} side="bottom">
                    <IconButton
                        size="sm"
                        aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                        className="hidden lg:inline-flex"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        {sidebarCollapsed ? <PanelLeft size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
                    </IconButton>
                </Tooltip>

                <BackofficeBreadcrumb groups={groups} isActive={isActive} />

                <button
                    type="button"
                    onClick={onOpenCommandPalette}
                    aria-label="Tìm kiếm nhanh trong trang quản trị"
                    className="ml-auto hidden h-9 items-center gap-2 rounded-md border border-control-line bg-sunken px-3 text-fg-subtle transition-colors duration-140 ease-out hover:border-fg-subtle hover:text-fg-muted sm:flex"
                >
                    <Search size={15} aria-hidden />
                    <input
                        ref={searchInputRef}
                        type="text"
                        tabIndex={-1}
                        readOnly
                        placeholder="Tìm kiếm…"
                        className="pointer-events-none w-40 border-none bg-transparent text-13 text-fg outline-none placeholder:text-fg-subtle lg:w-56"
                    />
                    <kbd className="hidden rounded bg-surface px-1.5 py-0.5 text-2xs font-semibold text-fg-subtle lg:inline-flex">
                        Ctrl K
                    </kbd>
                </button>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <div className="relative">
                    <Tooltip content="Thao tác nhanh" side="bottom">
                        <IconButton size="sm" aria-label="Thao tác nhanh" onClick={() => togglePanel('quickActions')}>
                            <Zap size={18} aria-hidden />
                        </IconButton>
                    </Tooltip>
                    <AnimatePresence>
                        {openPanel === 'quickActions' && (
                            <BackofficeQuickActionsPanel onSelect={() => setOpenPanel(null)} />
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative">
                    <Tooltip content="Thông báo" side="bottom">
                        <IconButton
                            size="sm"
                            aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
                            onClick={() => togglePanel('notifications')}
                        >
                            <Bell size={18} aria-hidden />
                            {unreadCount > 0 && (
                                <span className="num absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-2xs font-bold leading-none text-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </IconButton>
                    </Tooltip>
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

                <Tooltip content={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} side="bottom">
                    <IconButton
                        size="sm"
                        aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
                        onClick={toggleMode}
                    >
                        {darkMode ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
                    </IconButton>
                </Tooltip>

                <div className="relative">
                    <Tooltip content="Tuỳ chỉnh giao diện" side="bottom">
                        <IconButton size="sm" aria-label="Tuỳ chỉnh giao diện" onClick={() => togglePanel('settings')}>
                            <Palette size={18} aria-hidden />
                        </IconButton>
                    </Tooltip>
                    <AnimatePresence>
                        {openPanel === 'settings' && <BackofficeThemeSettingsPanel />}
                    </AnimatePresence>
                </div>

                <span className="ml-1 hidden items-center gap-2 rounded-md bg-sunken px-2.5 py-1.5 xl:flex">
                    <Clock size={14} aria-hidden className="text-fg-subtle" />
                    <span className="num text-13 font-medium text-fg-muted">
                        {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        {' • '}
                        {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </span>
            </div>

            {/* Lớp bắt click ra ngoài để đóng panel. */}
            {openPanel && <div className="fixed inset-0 z-40" onClick={() => setOpenPanel(null)} />}
        </header>
    );
};
