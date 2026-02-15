import { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../api/sales';
import { repairApi } from '../api/repair';
import { warrantyApi } from '../api/warranty';
import { catalogApi } from '../api/catalog';

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

export const useNotifications = ({ roles, refreshInterval = 60000 }: UseNotificationsOptions) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasRole = useCallback((allowedRoles: string[]) => {
        return allowedRoles.some(r => roles.includes(r));
    }, [roles]);

    const fetchNotifications = useCallback(async () => {
        const newNotifications: Notification[] = [];

        try {
            // === SALE / MANAGER / ADMIN: Fetch order notifications ===
            if (hasRole(['Admin', 'Manager', 'Sale'])) {
                try {
                    const ordersResult = await salesApi.admin.getOrders(1, 10);
                    const recentOrders = ordersResult.orders || [];

                    // Pending orders - need attention
                    const pendingOrders = recentOrders.filter(o => o.status === 'Pending');
                    pendingOrders.slice(0, 5).forEach(order => {
                        newNotifications.push({
                            id: `order-pending-${order.id}`,
                            type: 'order',
                            title: 'Đơn hàng mới chờ xử lý',
                            message: `Đơn ${order.orderNumber} - ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                            time: formatTimeAgo(new Date(order.orderDate)),
                            read: false,
                            link: `/backoffice/orders?search=${order.orderNumber}`,
                            priority: 'high',
                            metadata: { orderId: order.id, orderNumber: order.orderNumber }
                        });
                    });

                    // Confirmed orders - ready to process
                    const confirmedOrders = recentOrders.filter(o => o.status === 'Confirmed');
                    confirmedOrders.slice(0, 3).forEach(order => {
                        newNotifications.push({
                            id: `order-confirmed-${order.id}`,
                            type: 'order',
                            title: 'Đơn hàng đã xác nhận',
                            message: `Đơn ${order.orderNumber} sẵn sàng xử lý`,
                            time: formatTimeAgo(new Date(order.confirmedAt || order.orderDate)),
                            read: false,
                            link: `/backoffice/orders?search=${order.orderNumber}`,
                            priority: 'medium',
                            metadata: { orderId: order.id, orderNumber: order.orderNumber }
                        });
                    });

                    // Payment pending
                    const paymentPending = recentOrders.filter(o => o.paymentStatus === 'Pending' && o.status !== 'Cancelled');
                    paymentPending.slice(0, 3).forEach(order => {
                        newNotifications.push({
                            id: `order-payment-${order.id}`,
                            type: 'order',
                            title: 'Chờ thanh toán',
                            message: `Đơn ${order.orderNumber} chưa thanh toán`,
                            time: formatTimeAgo(new Date(order.orderDate)),
                            read: false,
                            link: `/backoffice/orders?search=${order.orderNumber}`,
                            priority: 'medium',
                            metadata: { orderId: order.id, orderNumber: order.orderNumber }
                        });
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
                        newNotifications.push({
                            id: `repair-requested-${wo.id}`,
                            type: 'repair',
                            title: 'Yêu cầu sửa chữa mới',
                            message: `${wo.deviceType} - ${wo.issueDescription?.slice(0, 50)}...`,
                            time: formatTimeAgo(new Date(wo.createdAt)),
                            read: false,
                            link: `/backoffice/tech?workOrderId=${wo.id}`,
                            priority: 'high',
                            metadata: { workOrderId: wo.id }
                        });
                    });

                    // Assigned to technician - need to start
                    const assigned = orders.filter(wo => wo.status === 'Assigned');
                    assigned.slice(0, 3).forEach(wo => {
                        newNotifications.push({
                            id: `repair-assigned-${wo.id}`,
                            type: 'repair',
                            title: 'Đơn được giao cho bạn',
                            message: `${wo.deviceType} - Cần bắt đầu chẩn đoán`,
                            time: formatTimeAgo(new Date(wo.updatedAt || wo.createdAt)),
                            read: false,
                            link: `/backoffice/tech?workOrderId=${wo.id}`,
                            priority: 'high',
                            metadata: { workOrderId: wo.id }
                        });
                    });

                    // Awaiting approval - customer response needed
                    const awaitingApproval = orders.filter(wo => wo.status === 'AwaitingApproval');
                    awaitingApproval.slice(0, 3).forEach(wo => {
                        newNotifications.push({
                            id: `repair-awaiting-${wo.id}`,
                            type: 'repair',
                            title: 'Chờ khách hàng duyệt',
                            message: `${wo.deviceType} - Báo giá đã gửi`,
                            time: formatTimeAgo(new Date(wo.updatedAt || wo.createdAt)),
                            read: false,
                            link: `/backoffice/tech?workOrderId=${wo.id}`,
                            priority: 'medium',
                            metadata: { workOrderId: wo.id }
                        });
                    });

                    // Approved - ready to start repair
                    const approved = orders.filter(wo => wo.status === 'Approved');
                    approved.slice(0, 3).forEach(wo => {
                        newNotifications.push({
                            id: `repair-approved-${wo.id}`,
                            type: 'repair',
                            title: 'Khách hàng đã duyệt',
                            message: `${wo.deviceType} - Bắt đầu sửa chữa`,
                            time: formatTimeAgo(new Date(wo.updatedAt || wo.createdAt)),
                            read: false,
                            link: `/backoffice/tech?workOrderId=${wo.id}`,
                            priority: 'high',
                            metadata: { workOrderId: wo.id }
                        });
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
                        newNotifications.push({
                            id: `warranty-pending-${claim.id}`,
                            type: 'warranty',
                            title: 'Yêu cầu bảo hành mới',
                            message: `SN: ${claim.serialNumber} - ${claim.issueDescription?.slice(0, 40)}...`,
                            time: formatTimeAgo(new Date(claim.filedDate)),
                            read: false,
                            link: `/backoffice/warranty?claimId=${claim.id}`,
                            priority: 'high',
                            metadata: { claimId: claim.id }
                        });
                    });

                    // Also get approved claims that need resolution
                    const approvedClaims = await warrantyApi.admin.getAllClaims('Approved');
                    approvedClaims.slice(0, 3).forEach(claim => {
                        newNotifications.push({
                            id: `warranty-approved-${claim.id}`,
                            type: 'warranty',
                            title: 'Bảo hành đã duyệt',
                            message: `SN: ${claim.serialNumber} - Cần xử lý`,
                            time: formatTimeAgo(new Date(claim.filedDate)),
                            read: false,
                            link: `/backoffice/warranty?claimId=${claim.id}`,
                            priority: 'medium',
                            metadata: { claimId: claim.id }
                        });
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
                        newNotifications.push({
                            id: `inventory-low-${item.id}`,
                            type: 'inventory',
                            title: 'Cảnh báo tồn kho thấp',
                            message: `${item.name} - Còn ${item.stockQuantity} sản phẩm`,
                            time: 'Cập nhật',
                            read: false,
                            link: `/backoffice/inventory?productId=${item.id}`,
                            priority: item.stockQuantity <= 5 ? 'high' : 'medium',
                            metadata: { productId: item.id }
                        });
                    });

                    // Out of stock products
                    const outOfStockItems = products.filter(p => p.stockQuantity === 0);
                    outOfStockItems.slice(0, 3).forEach(item => {
                        newNotifications.push({
                            id: `inventory-out-${item.id}`,
                            type: 'inventory',
                            title: 'Hết hàng',
                            message: `${item.name} - Cần nhập thêm`,
                            time: 'Cập nhật',
                            read: false,
                            link: `/backoffice/inventory?productId=${item.id}`,
                            priority: 'high',
                            metadata: { productId: item.id }
                        });
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

    // Auto refresh
    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(fetchNotifications, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [fetchNotifications, refreshInterval]);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        loading,
        error,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
};
