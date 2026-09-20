/**
 * Bảng thông báo bung ra từ nút chuông trên topbar.
 *
 * Viết lại theo design-guidelines §9.1/§9.2: token thay cho `isDark ? ...`, hết `gray-*`,
 * hết `bg-white`, hết `style={{ backgroundColor: colors.primary }}`. Mật độ gọn để panel
 * không lệch tông với topbar mới (chữ 13px, meta 2xs, hàng py-2.5).
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Bell, Box, Loader2, Receipt, RefreshCw, ShieldCheck, Users, Wrench } from 'lucide-react';
import { Button, IconButton } from '../ui';
import type { Notification } from '../../hooks/useNotifications';
import { paths } from '../../routes';

interface BackofficeNotificationsPanelProps {
    notifications: Notification[];
    loading: boolean;
    unreadCount: number;
    isRealtimeConnected: boolean;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onRefresh: () => void;
    onClose: () => void;
}

/** Biểu tượng theo loại nghiệp vụ — dùng token trạng thái, không tự chọn màu (§9.1). */
const NOTIFICATION_ICON: Record<string, JSX.Element> = {
    order: <Receipt size={15} className="text-info" />,
    repair: <Wrench size={15} className="text-warning" />,
    warranty: <ShieldCheck size={15} className="text-success" />,
    inventory: <Box size={15} className="text-violet" />,
    crm: <Users size={15} className="text-brand" />,
};

const iconOf = (type: Notification['type']) =>
    NOTIFICATION_ICON[type as string] ?? <Bell size={15} className="text-fg-subtle" />;

/** Vạch ưu tiên bên trái hàng. Cảnh báo dùng đỏ brand, còn lại trung tính (§9.1). */
const priorityEdge = (priority?: Notification['priority']) =>
    priority === 'high' ? 'border-l-brand' : priority === 'medium' ? 'border-l-warning' : 'border-l-line';

export const BackofficeNotificationsPanel = ({
    notifications, loading, unreadCount, isRealtimeConnected,
    onMarkAsRead, onMarkAllAsRead, onRefresh, onClose,
}: BackofficeNotificationsPanelProps) => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 z-floating mt-2 w-[22rem] overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                    <h3 className="text-13 font-semibold text-fg">Thông báo</h3>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-brand px-1.5 py-0.5 text-2xs font-semibold text-white">
                            {unreadCount}
                        </span>
                    )}
                    <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isRealtimeConnected ? 'bg-success' : 'bg-fg-subtle'}`}
                        title={isRealtimeConnected ? 'Đang nhận thông báo tức thời' : 'Mất kết nối tức thời'}
                    />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <IconButton aria-label="Làm mới thông báo" variant="ghost" size="sm" onClick={onRefresh}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
                    </IconButton>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>Đánh dấu đã đọc</Button>
                    )}
                </div>
            </div>

            <div className="max-h-[22rem] overflow-y-auto">
                {loading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 size={20} className="animate-spin text-fg-subtle" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-fg-muted">
                        <Bell size={28} className="mx-auto mb-2 text-fg-subtle" />
                        <p className="text-13">Không có thông báo mới</p>
                        <p className="mt-0.5 text-2xs text-fg-subtle">Các thông báo sẽ xuất hiện ở đây</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <button
                            key={notif.id}
                            type="button"
                            onClick={() => {
                                onMarkAsRead(notif.id);
                                onClose();
                                if (notif.link) navigate(notif.link);
                            }}
                            className={`flex w-full items-start gap-2.5 border-b border-l-2 border-line px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-sunken ${priorityEdge(notif.priority)} ${notif.read ? '' : 'bg-sunken/60'}`}
                        >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken">
                                {iconOf(notif.type)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                    <span className="text-13 font-medium text-fg">{notif.title}</span>
                                    {!notif.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                                </span>
                                <span className="mt-0.5 line-clamp-2 block text-2xs text-fg-muted">{notif.message}</span>
                                <span className="mt-1 flex items-center gap-2 text-2xs text-fg-subtle">
                                    {notif.time}
                                    {notif.priority === 'high' && (
                                        <span className="inline-flex items-center gap-1 text-brand-text">
                                            <AlertCircle size={10} /> Quan trọng
                                        </span>
                                    )}
                                    {notif.link && <span className="text-brand-text">Xem chi tiết →</span>}
                                </span>
                            </span>
                        </button>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className="border-t border-line p-2">
                    {/* Hành động chính DUY NHẤT của panel — chỗ duy nhất được dùng đỏ brand (§9.1). */}
                    <Button
                        size="sm"
                        block
                        onClick={() => { onClose(); navigate(paths.backoffice.notifications()); }}
                    >
                        Xem tất cả thông báo
                    </Button>
                </div>
            )}
        </motion.div>
    );
};
