import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notification';
import type { NotificationDto } from '../api/notification';
import { useRealtimeNotifications } from './useRealtimeNotifications';
import { queryKeys } from '../lib/query-keys';
import toast from 'react-hot-toast';

export interface Notification {
    id: string;
    type: 'order' | 'repair' | 'warranty' | 'inventory' | 'system' | 'crm';
    title: string;
    message: string;
    time: string;
    read: boolean;
    link?: string;
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, unknown>;
}

interface UseNotificationsOptions {
    /** Reserved — the notifications endpoint is already scoped server-side to the current user. Kept for call-site stability. */
    roles: string[];
    refreshInterval?: number; // in milliseconds
    enableRealtime?: boolean;
    showToastOnNewNotification?: boolean;
}

const formatTimeAgo = (date: Date): string => {
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
};

const TYPE_MAP: Record<string, Notification['type']> = {
    OrderCreated: 'order', OrderConfirmed: 'order', OrderShipped: 'order',
    OrderDelivered: 'order', OrderCancelled: 'order', PaymentReceived: 'order', PaymentFailed: 'order',
    RepairCompleted: 'repair', RepairInProgress: 'repair',
    WarrantyExpiring: 'warranty', WarrantyExpired: 'warranty',
    Promotion: 'crm', SystemAlert: 'system',
};

const toNotification = (dto: NotificationDto): Notification => ({
    id: dto.id,
    type: TYPE_MAP[dto.type] || 'system',
    title: dto.title,
    message: dto.message,
    time: formatTimeAgo(new Date(dto.createdAt)),
    read: dto.isRead,
    link: dto.link,
    priority: dto.priority,
    metadata: dto.referenceId ? { referenceId: dto.referenceId } : undefined,
});

/**
 * One query on `GET /api/notifications` + the SignalR push hook. Replaces the
 * previous ~557 LOC version, which polled six unrelated endpoints (orders,
 * work orders, warranty claims, low-stock products, ...) and fabricated
 * client-side "notifications" from their contents — none of that is a real,
 * persisted, markable-as-read notification, so it needed its own localStorage
 * read-state hack to fake one. A real backend notification already carries
 * `isRead`, so that hack is gone too.
 */
export const useNotifications = ({
    refreshInterval = 60000,
    enableRealtime = true,
    showToastOnNewNotification = true,
}: UseNotificationsOptions) => {
    const queryClient = useQueryClient();
    const listKey = queryKeys.notifications.list();
    const setList = (updater: (prev: Notification[]) => Notification[]) =>
        queryClient.setQueryData<Notification[]>(listKey, (prev = []) => updater(prev));

    const handleRealtimeNotification = useCallback((dto: NotificationDto) => {
        setList((prev) => (prev.some((n) => n.id === dto.id) ? prev : [toNotification(dto), ...prev]));
        if (showToastOnNewNotification) {
            toast(dto.title, { icon: dto.priority === 'high' ? '🔴' : '🔔', duration: 5000, position: 'top-right' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showToastOnNewNotification]);

    const handleRealtimeRead = useCallback((id: string) => {
        setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRealtimeAllRead = useCallback(() => {
        setList((prev) => prev.map((n) => ({ ...n, read: true })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { isConnected, markAsRead: markAsReadRealtime, markAllAsRead: markAllAsReadRealtime } =
        useRealtimeNotifications(enableRealtime ? {
            onNotification: handleRealtimeNotification,
            onNotificationRead: handleRealtimeRead,
            onAllNotificationsRead: handleRealtimeAllRead,
        } : {});

    const { data, isLoading, refetch } = useQuery({
        queryKey: listKey,
        queryFn: async () => (await notificationApi.getNotifications(1, 20)).map(toNotification),
        // Poll half as often once SignalR is delivering pushes live; still poll
        // as a safety net in case a push was missed while disconnected.
        refetchInterval: refreshInterval > 0 ? (isConnected ? refreshInterval * 2 : refreshInterval) : false,
    });
    const notifications = data ?? [];

    const markAsRead = useCallback(async (id: string) => {
        setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        try {
            await notificationApi.markAsRead(id);
            if (isConnected) markAsReadRealtime(id);
        } catch (e) {
            console.error('Failed to mark notification as read:', e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, markAsReadRealtime]);

    const markAllAsRead = useCallback(async () => {
        setList((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            await notificationApi.markAllAsRead();
            if (isConnected) markAllAsReadRealtime();
        } catch (e) {
            console.error('Failed to mark all notifications as read:', e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, markAllAsReadRealtime]);

    return {
        notifications,
        loading: isLoading,
        error: null as string | null,
        unreadCount: notifications.filter((n) => !n.read).length,
        markAsRead,
        markAllAsRead,
        // Zero-arg wrapper: `refresh` is used directly as a button `onClick` by
        // a consumer outside this track's ownership, and `refetch` itself takes
        // an (all-optional) `RefetchOptions` first param that TS's "weak type"
        // check refuses to accept a MouseEvent for.
        refresh: () => refetch(),
        isRealtimeConnected: isConnected,
    };
};
