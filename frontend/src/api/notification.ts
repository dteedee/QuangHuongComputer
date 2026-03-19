import client from './client';

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
        const response = await client.get<NotificationDto[]>('/api/notifications', {
            params: { page, pageSize }
        });
        return response.data;
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (): Promise<number> => {
        const response = await client.get<UnreadCountResponse>('/api/notifications/unread-count');
        return response.data.count;
    },

    /**
     * Mark a single notification as read
     */
    markAsRead: async (notificationId: string): Promise<void> => {
        await client.post<MarkAsReadResponse>(`/api/notifications/${notificationId}/read`);
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
        await client.post<MarkAsReadResponse>('/api/notifications/read-all');
    }
};

export default notificationApi;
