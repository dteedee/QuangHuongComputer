import client from './client';

/**
 * Notification API — canonical module (W1-9, step 7a). `api/notifications.ts`
 * (plural) was a dead duplicate (zero importers, confirmed by grep) with
 * WRONG paths/methods for the read side (`/communication/notifications` +
 * PUT, vs the real `/notifications` + POST used below and by both current
 * importers, `hooks/useNotifications.ts` / `hooks/useRealtimeNotifications.ts`).
 *
 * The admin send/template functions merged in during that pass (`sendToUser`,
 * `sendToRole`, `sendZaloZns`, `sendSms`, `templates.*`) hit backend routes
 * that do not exist (`/communication/notifications/send*`,
 * `/communication/notifications/{sms,zalo-zns}`, `/communication/notification-templates*`
 * all 404) and had zero callers — removed (YAGNI). `sendToUser`/`sendToRole`
 * were kept unverified once before on the chance an admin composer used them;
 * re-grepped, still zero callers, so gone for good this time.
 */

// Types
export interface NotificationDto {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    isRead: boolean;
    referenceId?: string;
}

export interface UnreadCountResponse {
    count: number;
}

export interface MarkAsReadResponse {
    message: string;
}

// API functions
export const notificationApi = {
    /**
     * Get notifications for current user
     */
    getNotifications: async (page: number = 1, pageSize: number = 50): Promise<NotificationDto[]> => {
        const response = await client.get<NotificationDto[]>('/notifications', {
            params: { page, pageSize }
        });
        return response.data;
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (): Promise<number> => {
        const response = await client.get<UnreadCountResponse>('/notifications/unread-count');
        return response.data.count;
    },

    /**
     * Mark a single notification as read
     */
    markAsRead: async (notificationId: string): Promise<void> => {
        await client.post<MarkAsReadResponse>(`/notifications/${notificationId}/read`);
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
        await client.post<MarkAsReadResponse>('/notifications/read-all');
    },
};

export default notificationApi;
