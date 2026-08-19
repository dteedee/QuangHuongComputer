import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Bell, Box, Loader2, Receipt, RefreshCw, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { Notification } from '../../hooks/useNotifications';

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

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'order': return <Receipt size={16} className="text-blue-500" />;
        case 'repair': return <Wrench size={16} className="text-orange-500" />;
        case 'warranty': return <ShieldCheck size={16} className="text-green-500" />;
        case 'inventory': return <Box size={16} className="text-purple-500" />;
        case 'crm': return <Users size={16} className="text-pink-500" />;
        default: return <Bell size={16} className="text-gray-500" />;
    }
};

const getPriorityColor = (priority?: Notification['priority']) => {
    switch (priority) {
        case 'high': return 'border-l-red-500';
        case 'medium': return 'border-l-orange-500';
        default: return 'border-l-gray-300';
    }
};

/** Dropdown panel showing recent notifications, opened from the topbar bell icon. */
export const BackofficeNotificationsPanel = ({
    notifications, loading, unreadCount, isRealtimeConnected,
    onMarkAsRead, onMarkAllAsRead, onRefresh, onClose,
}: BackofficeNotificationsPanelProps) => {
    const { isDark, colors } = useTheme();
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 mt-2 w-96 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
        >
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Thông báo</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full text-white" style={{ backgroundColor: colors.primary }}>
                            {unreadCount}
                        </span>
                    )}
                    <span
                        className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-gray-400'}`}
                        title={isRealtimeConnected ? 'Realtime connected' : 'Realtime disconnected'}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Làm mới"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {unreadCount > 0 && (
                        <button onClick={onMarkAllAsRead} className="text-xs font-medium hover:underline" style={{ color: colors.primary }}>
                            Đánh dấu đã đọc
                        </button>
                    )}
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                {loading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Bell size={32} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Không có thông báo mới</p>
                        <p className="text-xs mt-1">Các thông báo sẽ xuất hiện ở đây</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => {
                                onMarkAsRead(notif.id);
                                onClose();
                                if (notif.link) navigate(notif.link);
                            }}
                            className={`p-4 border-l-4 border-b last:border-b-0 transition-colors cursor-pointer ${getPriorityColor(notif.priority)} ${isDark
                                ? `border-b-gray-800 ${notif.read ? 'bg-gray-900' : 'bg-gray-800/50'} hover:bg-gray-800`
                                : `border-b-gray-100 ${notif.read ? 'bg-white' : 'bg-blue-50/30'} hover:bg-gray-50`
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    {getNotificationIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{notif.title}</p>
                                        {!notif.read && (
                                            <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: colors.primary }} />
                                        )}
                                    </div>
                                    <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{notif.message}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{notif.time}</p>
                                        {notif.priority === 'high' && (
                                            <span className="flex items-center gap-1 text-xs text-red-500">
                                                <AlertCircle size={10} /> Quan trọng
                                            </span>
                                        )}
                                        {notif.link && <span className="text-xs" style={{ color: colors.primary }}>Xem chi tiết →</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className={`p-3 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <button
                        onClick={() => { onClose(); navigate('/backoffice/notifications'); }}
                        className="flex items-center justify-center w-full py-2.5 px-4 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: colors.primary }}
                    >
                        Xem tất cả thông báo
                    </button>
                </div>
            )}
        </motion.div>
    );
};
