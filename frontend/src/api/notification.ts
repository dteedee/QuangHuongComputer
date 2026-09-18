import client from './client';

/**
 * Notification API — canonical module (W1-9, step 7a). `api/notifications.ts`
 * (plural) was a dead duplicate (zero importers, confirmed by grep) with
 * WRONG paths/methods for the read side (`/communication/notifications` +
 * PUT, vs the real `/notifications` + POST used below and by both current
 * importers, `hooks/useNotifications.ts` / `hooks/useRealtimeNotifications.ts`).
 * Its still-plausibly-valid admin send/template functions were merged in
 * here verbatim (unverified — nothing called them before either) and the
 * dead file was deleted.
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

/** Admin-composed notification types — from the old `api/notifications.ts`. */
export type NotificationType =
    | 'OrderCreated' | 'OrderConfirmed' | 'OrderShipped' | 'OrderDelivered' | 'OrderCancelled'
    | 'PaymentReceived' | 'PaymentFailed'
    | 'RepairCompleted' | 'RepairInProgress'
    | 'WarrantyExpiring' | 'WarrantyExpired'
    | 'Promotion' | 'PasswordReset' | 'EmailVerification' | 'SystemAlert';

export interface NotificationTemplate {
    id: string;
    code: string;
    name: string;
    subject: string;
    body: string;
    type: string;
    variables?: string;
    description?: string;
    isActive: boolean;
}

export interface CreateNotificationDto {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    priority?: string;
    referenceId?: string;
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

    /**
     * Send notification to user (admin). Merged from `api/notifications.ts`;
     * unverified — no current caller, kept for wave-3's admin composer.
     */
    sendToUser: async (userId: string, data: CreateNotificationDto): Promise<void> => {
        await client.post(`/communication/notifications/send/${userId}`, data);
    },

    /** Send notification to role (admin). Same provenance as `sendToUser`. */
    sendToRole: async (role: string, data: CreateNotificationDto): Promise<void> => {
        await client.post(`/communication/notifications/send-role/${role}`, data);
    },

    /** Send Zalo ZNS message. Same provenance as `sendToUser`. */
    sendZaloZns: async (phone: string, templateId: string, templateData: Record<string, string>): Promise<void> => {
        await client.post('/communication/notifications/zalo-zns', { phone, templateId, templateData });
    },

    /** Send SMS via ViHAT / eSMS. Same provenance as `sendToUser`. */
    sendSms: async (phone: string, message: string): Promise<void> => {
        await client.post('/communication/notifications/sms', { phone, message });
    },

    // === Templates (admin) — same provenance as `sendToUser` ===
    templates: {
        getList: async (): Promise<NotificationTemplate[]> => {
            const response = await client.get<NotificationTemplate[]>('/communication/notification-templates');
            return response.data;
        },
        create: async (data: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
            const response = await client.post<NotificationTemplate>('/communication/notification-templates', data);
            return response.data;
        },
        update: async (id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
            const response = await client.put<NotificationTemplate>(`/communication/notification-templates/${id}`, data);
            return response.data;
        },
        toggle: async (id: string): Promise<void> => {
            await client.put(`/communication/notification-templates/${id}/toggle`);
        },
    },
};

export const notificationTypeLabels: Record<NotificationType, string> = {
    OrderCreated: 'Đơn hàng mới',
    OrderConfirmed: 'Xác nhận đơn',
    OrderShipped: 'Đang giao',
    OrderDelivered: 'Đã giao',
    OrderCancelled: 'Đã hủy',
    PaymentReceived: 'Nhận thanh toán',
    PaymentFailed: 'Thanh toán lỗi',
    RepairCompleted: 'Sửa chữa xong',
    RepairInProgress: 'Đang sửa chữa',
    WarrantyExpiring: 'BH sắp hết',
    WarrantyExpired: 'BH đã hết',
    Promotion: 'Khuyến mãi',
    PasswordReset: 'Đặt lại mật khẩu',
    EmailVerification: 'Xác thực email',
    SystemAlert: 'Cảnh báo hệ thống',
};

export const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-red-100 text-red-700',
};

export default notificationApi;
