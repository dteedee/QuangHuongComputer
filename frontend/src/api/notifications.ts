import { client } from './client';

/**
 * Notification API
 * Frontend module for notification management
 * Phase 2.4
 */

// ============================================
// TYPES
// ============================================

export type NotificationType =
    | 'OrderCreated' | 'OrderConfirmed' | 'OrderShipped' | 'OrderDelivered' | 'OrderCancelled'
    | 'PaymentReceived' | 'PaymentFailed'
    | 'RepairCompleted' | 'RepairInProgress'
    | 'WarrantyExpiring' | 'WarrantyExpired'
    | 'Promotion' | 'PasswordReset' | 'EmailVerification' | 'SystemAlert';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    isRead: boolean;
    referenceId?: string;
}

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

// ============================================
// API
// ============================================

export const notificationApi = {
    /** Get user notifications */
    getList: async (page = 1, pageSize = 50): Promise<Notification[]> => {
        const response = await client.get<Notification[]>('/communication/notifications', { params: { page, pageSize } });
        return response.data;
    },

    /** Get unread count */
    getUnreadCount: async (): Promise<number> => {
        const response = await client.get<{ count: number }>('/communication/notifications/unread-count');
        return response.data.count;
    },

    /** Mark one as read */
    markAsRead: async (id: string): Promise<void> => {
        await client.put(`/communication/notifications/${id}/read`);
    },

    /** Mark all as read */
    markAllAsRead: async (): Promise<void> => {
        await client.put('/communication/notifications/read-all');
    },

    /** Send notification to user (admin) */
    sendToUser: async (userId: string, data: CreateNotificationDto): Promise<void> => {
        await client.post(`/communication/notifications/send/${userId}`, data);
    },

    /** Send notification to role (admin) */
    sendToRole: async (role: string, data: CreateNotificationDto): Promise<void> => {
        await client.post(`/communication/notifications/send-role/${role}`, data);
    },

    /** Send Zalo ZNS message (Phase 3.3) */
    sendZaloZns: async (phone: string, templateId: string, templateData: Record<string, string>): Promise<void> => {
        await client.post('/communication/notifications/zalo-zns', { phone, templateId, templateData });
    },

    /** Send SMS via ViHAT / eSMS (Phase 3.3) */
    sendSms: async (phone: string, message: string): Promise<void> => {
        await client.post('/communication/notifications/sms', { phone, message });
    },

    // === Templates ===
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

// ============================================
// LABELS
// ============================================

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
