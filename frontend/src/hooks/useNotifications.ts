import { useState, useEffect, useCallback, useRef } from 'react';
import { salesApi } from '../api/sales';
import { repairApi } from '../api/repair';
import { warrantyApi } from '../api/warranty';
import { catalogApi } from '../api/catalog';
import { notificationApi, NotificationDto } from '../api/notification';
import { useRealtimeNotifications } from './useRealtimeNotifications';
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
    roles: string[];
    refreshInterval?: number; // in milliseconds
    enableRealtime?: boolean;
    showToastOnNewNotification?: boolean;
}

// Helper to format time ago
const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
};

// Convert backend notification type to frontend type
const mapNotificationType = (type: string): Notification['type'] => {
    const typeMap: Record<string, Notification['type']> = {
        'OrderCreated': 'order',
        'OrderConfirmed': 'order',
        'OrderShipped': 'order',
        'OrderDelivered': 'order',
        'OrderCancelled': 'order',
        'PaymentReceived': 'order',
        'PaymentFailed': 'order',
        'RepairCompleted': 'repair',
        'RepairInProgress': 'repair',
        'WarrantyExpiring': 'warranty',
        'WarrantyExpired': 'warranty',
        'Promotion': 'crm',
        'SystemAlert': 'system',
    };
    return typeMap[type] || 'system';
};

// Convert API notification to local notification format
const convertApiNotification = (apiNotif: NotificationDto): Notification => ({
    id: apiNotif.id,
    type: mapNotificationType(apiNotif.type),
    title: apiNotif.title,
    message: apiNotif.message,
    time: formatTimeAgo(new Date(apiNotif.createdAt)),
    read: apiNotif.isRead,
    link: apiNotif.link,
    priority: apiNotif.priority,
    metadata: apiNotif.referenceId ? { referenceId: apiNotif.referenceId } : undefined
});

export const useNotifications = ({
    roles,
    refreshInterval = 60000,
    enableRealtime = true,
    showToastOnNewNotification = true
}: UseNotificationsOptions) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastFetchRef = useRef<Date | null>(null);

    const hasRole = useCallback((allowedRoles: string[]) => {
        return allowedRoles.some(r => roles.includes(r));
    }, [roles]);

    // Handle new realtime notification
    const handleRealtimeNotification = useCallback((apiNotif: NotificationDto) => {
        const newNotification = convertApiNotification(apiNotif);

        // Add to beginning of list
        setNotifications(prev => {
            // Check if notification already exists
            if (prev.some(n => n.id === newNotification.id)) {
                return prev;
            }
            return [newNotification, ...prev];
        });

        // Show toast notification
        if (showToastOnNewNotification) {
            const icon = newNotification.priority === 'high' ? '🔴' : '🔔';
            toast(newNotification.title, {
                icon,
                duration: 5000,
                position: 'top-right',
            });
        }
    }, [showToastOnNewNotification]);

    // Handle notification read via realtime
    const handleRealtimeNotificationRead = useCallback((notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
    }, []);

    // Handle all notifications read via realtime
    const handleRealtimeAllNotificationsRead = useCallback(() => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    }, []);

    // Setup realtime notifications
    const {
        isConnected,
        markAsRead: markAsReadRealtime,
        markAllAsRead: markAllAsReadRealtime
    } = useRealtimeNotifications(enableRealtime ? {
        onNotification: handleRealtimeNotification,
        onNotificationRead: handleRealtimeNotificationRead,
        onAllNotificationsRead: handleRealtimeAllNotificationsRead
    } : {});

    // Fetch notifications from API (persistent) and combine with polling
    const fetchNotifications = useCallback(async () => {
        const newNotifications: Notification[] = [];

        try {
            // First, fetch persistent notifications from API
            try {
                const apiNotifications = await notificationApi.getNotifications(1, 20);
                apiNotifications.forEach(apiNotif => {
                    newNotifications.push(convertApiNotification(apiNotif));
                });
            } catch (e) {
                console.error('Failed to fetch API notifications:', e);
            }

            // === SALE / MANAGER / ADMIN: Fetch order notifications ===
            if (hasRole(['Admin', 'Manager', 'Sale'])) {
                try {
                    const ordersResult = await salesApi.admin.getOrders(1, 10);
                    const recentOrders = ordersResult.orders || [];

                    // Pending orders - need attention
                    const pendingOrders = recentOrders.filter(o => o.status === 'Pending');
                    pendingOrders.slice(0, 5).forEach(order => {
                        const notifId = `order-pending-${order.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'order',
                                title: 'Đơn hàng mới chờ xử lý',
                                message: `Đơn ${order.orderNumber} - ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                                time: formatTimeAgo(new Date(order.orderDate)),
                                read: false,
                                link: `/backoffice/orders?search=${order.orderNumber}`,
                                priority: 'high',
                                metadata: { orderId: order.id, orderNumber: order.orderNumber }
                            });
                        }
                    });

                    // Confirmed orders - ready to process
                    const confirmedOrders = recentOrders.filter(o => o.status === 'Confirmed');
                    confirmedOrders.slice(0, 3).forEach(order => {
                        const notifId = `order-confirmed-${order.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'order',
                                title: 'Đơn hàng đã xác nhận',
                                message: `Đơn ${order.orderNumber} sẵn sàng xử lý`,
                                time: formatTimeAgo(new Date(order.confirmedAt || order.orderDate)),
                                read: false,
                                link: `/backoffice/orders?search=${order.orderNumber}`,
                                priority: 'medium',
                                metadata: { orderId: order.id, orderNumber: order.orderNumber }
                            });
                        }
                    });

                    // Payment pending
                    const paymentPending = recentOrders.filter(o => o.paymentStatus === 'Pending' && o.status !== 'Cancelled');
                    paymentPending.slice(0, 3).forEach(order => {
                        const notifId = `order-payment-${order.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'order',
                                title: 'Chờ thanh toán',
                                message: `Đơn ${order.orderNumber} chưa thanh toán`,
                                time: formatTimeAgo(new Date(order.orderDate)),
                                read: false,
                                link: `/backoffice/orders?search=${order.orderNumber}`,
                                priority: 'medium',
                                metadata: { orderId: order.id, orderNumber: order.orderNumber }
                            });
                        }
                    });
                } catch (e) {
                    console.error('Failed to fetch order notifications:', e);
                }
            }

            // === TECHNICIAN: Fetch repair/work order notifications ===
            if (hasRole(['Admin', 'Manager', 'TechnicianInShop', 'TechnicianOnSite'])) {
                try {
                    const workOrders = await repairApi.admin.getWorkOrders(1, 10);
                    const orders = workOrders.workOrders || [];

                    // Newly requested - need assignment
                    const requested = orders.filter(wo => wo.status === 'Requested');
                    requested.slice(0, 5).forEach(wo => {
                        const notifId = `repair-requested-${wo.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'repair',
                                title: 'Yêu cầu sửa chữa mới',
                                message: `${wo.deviceType} - ${wo.issueDescription?.slice(0, 50)}...`,
                                time: formatTimeAgo(new Date(wo.createdAt)),
                                read: false,
                                link: `/backoffice/tech?workOrderId=${wo.id}`,
                                priority: 'high',
                                metadata: { workOrderId: wo.id }
                            });
                        }
                    });

                    // Assigned to technician - need to start
                    const assigned = orders.filter(wo => wo.status === 'Assigned');
                    assigned.slice(0, 3).forEach(wo => {
                        const notifId = `repair-assigned-${wo.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'repair',
                                title: 'Đơn được giao cho bạn',
                                message: `${wo.deviceType} - Cần bắt đầu chẩn đoán`,
                                time: formatTimeAgo(new Date(wo.updatedAt || wo.createdAt)),
                                read: false,
                                link: `/backoffice/tech?workOrderId=${wo.id}`,
                                priority: 'high',
                                metadata: { workOrderId: wo.id }
                            });
                        }
                    });

                    // Awaiting approval - customer response needed
                    const awaitingApproval = orders.filter(wo => wo.status === 'AwaitingApproval');
                    awaitingApproval.slice(0, 3).forEach(wo => {
                        const notifId = `repair-awaiting-${wo.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'repair',
                                title: 'Chờ khách hàng duyệt',
                                message: `${wo.deviceType} - Báo giá đã gửi`,
                                time: formatTimeAgo(new Date(wo.updatedAt || wo.createdAt)),
                                read: false,
                                link: `/backoffice/tech?workOrderId=${wo.id}`,
                                priority: 'medium',
                                metadata: { workOrderId: wo.id }
                            });
                        }
                    });

                    // Approved - ready to start repair
                    const approved = orders.filter(wo => wo.status === 'Approved');
                    approved.slice(0, 3).forEach(wo => {
                        const notifId = `repair-approved-${wo.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'repair',
                                title: 'Khách hàng đã duyệt',
                                message: `${wo.deviceType} - Bắt đầu sửa chữa`,
                                time: formatTimeAgo(new Date(wo.updatedAt || wo.createdAt)),
                                read: false,
                                link: `/backoffice/tech?workOrderId=${wo.id}`,
                                priority: 'high',
                                metadata: { workOrderId: wo.id }
                            });
                        }
                    });
                } catch (e) {
                    console.error('Failed to fetch repair notifications:', e);
                }
            }

            // === WARRANTY: Admin, Manager, TechnicianInShop ===
            if (hasRole(['Admin', 'Manager', 'TechnicianInShop'])) {
                try {
                    const claims = await warrantyApi.admin.getAllClaims('Pending');

                    // Pending claims - need review
                    claims.slice(0, 5).forEach(claim => {
                        const notifId = `warranty-pending-${claim.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'warranty',
                                title: 'Yêu cầu bảo hành mới',
                                message: `SN: ${claim.serialNumber} - ${claim.issueDescription?.slice(0, 40)}...`,
                                time: formatTimeAgo(new Date(claim.filedDate)),
                                read: false,
                                link: `/backoffice/warranty?claimId=${claim.id}`,
                                priority: 'high',
                                metadata: { claimId: claim.id }
                            });
                        }
                    });

                    // Also get approved claims that need resolution
                    const approvedClaims = await warrantyApi.admin.getAllClaims('Approved');
                    approvedClaims.slice(0, 3).forEach(claim => {
                        const notifId = `warranty-approved-${claim.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'warranty',
                                title: 'Bảo hành đã duyệt',
                                message: `SN: ${claim.serialNumber} - Cần xử lý`,
                                time: formatTimeAgo(new Date(claim.filedDate)),
                                read: false,
                                link: `/backoffice/warranty?claimId=${claim.id}`,
                                priority: 'medium',
                                metadata: { claimId: claim.id }
                            });
                        }
                    });
                } catch (e) {
                    console.error('Failed to fetch warranty notifications:', e);
                }
            }

            // === INVENTORY: Admin, Manager, Supplier ===
            if (hasRole(['Admin', 'Manager', 'Supplier'])) {
                try {
                    // Use catalog API to get products with low stock
                    const productsResult = await catalogApi.getProducts({ pageSize: 50, inStock: true });
                    const products = productsResult.products || [];

                    // Filter low stock products (stockQuantity <= lowStockThreshold or <= 10)
                    const lowStockItems = products.filter(p =>
                        p.stockQuantity <= (p.lowStockThreshold || 10) && p.stockQuantity > 0
                    );

                    // Low stock warnings
                    lowStockItems.slice(0, 5).forEach(item => {
                        const notifId = `inventory-low-${item.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'inventory',
                                title: 'Cảnh báo tồn kho thấp',
                                message: `${item.name} - Còn ${item.stockQuantity} sản phẩm`,
                                time: 'Cập nhật',
                                read: false,
                                link: `/backoffice/inventory?productId=${item.id}`,
                                priority: item.stockQuantity <= 5 ? 'high' : 'medium',
                                metadata: { productId: item.id }
                            });
                        }
                    });

                    // Out of stock products
                    const outOfStockItems = products.filter(p => p.stockQuantity === 0);
                    outOfStockItems.slice(0, 3).forEach(item => {
                        const notifId = `inventory-out-${item.id}`;
                        if (!newNotifications.some(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'inventory',
                                title: 'Hết hàng',
                                message: `${item.name} - Cần nhập thêm`,
                                time: 'Cập nhật',
                                read: false,
                                link: `/backoffice/inventory?productId=${item.id}`,
                                priority: 'high',
                                metadata: { productId: item.id }
                            });
                        }
                    });
                } catch (e) {
                    console.error('Failed to fetch inventory notifications:', e);
                }
            }

            // Sort by priority and time
            newNotifications.sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                const aPriority = priorityOrder[a.priority || 'low'];
                const bPriority = priorityOrder[b.priority || 'low'];
                return aPriority - bPriority;
            });

            setNotifications(newNotifications);
            setError(null);
            lastFetchRef.current = new Date();
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            setError('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    }, [hasRole]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Auto refresh - use longer interval if realtime is connected
    useEffect(() => {
        const actualInterval = isConnected ? refreshInterval * 2 : refreshInterval;
        if (actualInterval > 0) {
            const interval = setInterval(fetchNotifications, actualInterval);
            return () => clearInterval(interval);
        }
    }, [fetchNotifications, refreshInterval, isConnected]);

    const markAsRead = useCallback(async (id: string) => {
        // Update local state immediately
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );

        // If it's a persistent notification (UUID format), also call API
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(id)) {
            try {
                await notificationApi.markAsRead(id);
                // Also notify via SignalR if connected
                if (isConnected) {
                    markAsReadRealtime(id);
                }
            } catch (e) {
                console.error('Failed to mark notification as read:', e);
            }
        }
    }, [isConnected, markAsReadRealtime]);

    const markAllAsRead = useCallback(async () => {
        // Update local state immediately
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );

        // Call API to mark all as read
        try {
            await notificationApi.markAllAsRead();
            // Also notify via SignalR if connected
            if (isConnected) {
                markAllAsReadRealtime();
            }
        } catch (e) {
            console.error('Failed to mark all notifications as read:', e);
        }
    }, [isConnected, markAllAsReadRealtime]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        loading,
        error,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
        isRealtimeConnected: isConnected
    };
};
