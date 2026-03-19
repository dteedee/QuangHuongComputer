import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Filter, Loader2, Search, ArrowRight, Clock, CheckCircle2, Package, XCircle, Truck, Plus, X, Check, ShoppingCart, User, MapPin, FileText, Calendar, RefreshCw, CreditCard, DollarSign } from 'lucide-react';
import { salesApi, type Order, type OrderStatus } from '../../api/sales';
import { catalogApi, type Product } from '../../api/catalog';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/format';

// Filter state interface
interface OrderFilters {
    search: string;
    status: string;
    paymentStatus: string;
    dateRange: { from: string; to: string };
}

const initialFilters: OrderFilters = {
    search: '',
    status: 'all',
    paymentStatus: 'all',
    dateRange: { from: '', to: '' }
};

export const AdminOrdersPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlSearch = searchParams.get('search') || '';
    const urlOrderId = searchParams.get('orderId') || '';

    const [filters, setFilters] = useState<OrderFilters>({
        ...initialFilters,
        search: urlSearch // Initialize with URL search param
    });
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [page, setPage] = useState(1);
    const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(urlOrderId || null);
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);
    const queryClient = useQueryClient();

    // Handle URL search param changes
    useEffect(() => {
        if (urlSearch && urlSearch !== filters.search) {
            setFilters(prev => ({ ...prev, search: urlSearch }));
            setDebouncedSearch(urlSearch);
        }
    }, [urlSearch]);

    // Handle orderId from URL - highlight the order
    useEffect(() => {
        if (urlOrderId) {
            setHighlightedOrderId(urlOrderId);
            // Clear the orderId from URL after 5 seconds
            const timer = setTimeout(() => {
                searchParams.delete('orderId');
                setSearchParams(searchParams, { replace: true });
                setHighlightedOrderId(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [urlOrderId]);

    // Scroll to highlighted order
    useEffect(() => {
        if (highlightedOrderId && highlightedRowRef.current) {
            highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedOrderId, highlightedRowRef.current]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.search]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [filters.status, filters.paymentStatus, filters.dateRange]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters(initialFilters);
    };

    const hasActiveFilters = filters.search || filters.status !== 'all' || filters.paymentStatus !== 'all' || filters.dateRange.from || filters.dateRange.to;

    const { data: response, isLoading } = useQuery({
        queryKey: ['admin-orders', page, debouncedSearch, filters.status],
        queryFn: () => salesApi.admin.getOrders(page, 20, debouncedSearch || undefined, filters.status !== 'all' ? filters.status : undefined),
    });

    const { data: productsData } = useQuery({
        queryKey: ['products-list'],
        queryFn: () => catalogApi.getProducts({ pageSize: 100 }),
    });

    // Mock data for demo/fallback
    const mockOrders: Order[] = [
        {
            id: '1', orderNumber: 'ORD-8852', customerId: 'CUST-001', status: 'Confirmed',
            paymentStatus: 'Pending', fulfillmentStatus: 'Pending',
            subtotalAmount: 12500000, discountAmount: 0, taxAmount: 500000, shippingAmount: 50000,
            totalAmount: 13050000, taxRate: 0.1, shippingAddress: '123 Đường Láng, Hà Nội', retryCount: 0,
            orderDate: new Date().toISOString(), items: [{ id: 'i1', orderId: '1', productId: 'p1', productName: 'Laptop ASUS ROG', quantity: 1, unitPrice: 12500000, lineTotal: 12500000, discountAmount: 0 }]
        },
        {
            id: '2', orderNumber: 'ORD-8853', customerId: 'CUST-002', status: 'Confirmed',
            paymentStatus: 'Pending', fulfillmentStatus: 'Pending',
            subtotalAmount: 2500000, discountAmount: 200000, taxAmount: 230000, shippingAmount: 30000,
            totalAmount: 2560000, taxRate: 0.1, shippingAddress: '456 Lê Lợi, TP. HCM', retryCount: 0,
            orderDate: new Date(Date.now() - 3600000).toISOString(), items: [{ id: 'i2', orderId: '2', productId: 'p2', productName: 'Bàn phím cơ Akko', quantity: 2, unitPrice: 1250000, lineTotal: 2500000, discountAmount: 200000 }]
        },
        {
            id: '3', orderNumber: 'ORD-8854', customerId: 'CUST-003', status: 'Shipped',
            paymentStatus: 'Paid', fulfillmentStatus: 'Shipped',
            subtotalAmount: 45000000, discountAmount: 0, taxAmount: 4500000, shippingAmount: 0,
            totalAmount: 49500000, taxRate: 0.1, shippingAddress: '789 Trần Hưng Đạo, Đà Nẵng', retryCount: 0,
            orderDate: new Date(Date.now() - 86400000).toISOString(), items: [{ id: 'i3', orderId: '3', productId: 'p3', productName: 'PC Gaming G-Series', quantity: 1, unitPrice: 45000000, lineTotal: 45000000, discountAmount: 0 }]
        }
    ];

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => salesApi.orders.updateStatus(id, status as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast.success('Cập nhật trạng thái thành công!');
        },
        onError: () => toast.error('Cập nhật thất bại!')
    });

    const createOrderMutation = useMutation({
        mutationFn: (data: any) => salesApi.orders.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast.success('Tạo đơn hàng thành công!');
            setIsCreateModalOpen(false);
        },
        onError: () => toast.error('Tạo đơn hàng thất bại!')
    });

    const rawOrders = (response?.orders && response.orders.length > 0) ? response.orders : mockOrders;

    // Apply client-side filters for payment status and date range
    const orders = rawOrders.filter(order => {
        // Payment status filter
        if (filters.paymentStatus !== 'all' && order.paymentStatus !== filters.paymentStatus) return false;

        // Date range filter
        if (filters.dateRange.from) {
            const orderDate = new Date(order.orderDate);
            const fromDate = new Date(filters.dateRange.from);
            if (orderDate < fromDate) return false;
        }
        if (filters.dateRange.to) {
            const orderDate = new Date(order.orderDate);
            const toDate = new Date(filters.dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (orderDate > toDate) return false;
        }

        return true;
    });
    const total = response?.total || rawOrders.length;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Draft': return { color: 'text-amber-500', bg: 'bg-amber-50', icon: <Clock size={16} />, label: 'Bản nháp' };
            case 'Confirmed': return { color: 'text-blue-500', bg: 'bg-blue-50', icon: <CheckCircle2 size={16} />, label: 'Xác nhận' };
            case 'Shipped': return { color: 'text-purple-500', bg: 'bg-purple-50', icon: <Truck size={16} />, label: 'Đang giao' };
            case 'Delivered': return { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: <Package size={16} />, label: 'Đã giao' };
            case 'Cancelled': return { color: 'text-rose-500', bg: 'bg-rose-50', icon: <XCircle size={16} />, label: 'Đã hủy' };
            default: return { color: 'text-gray-500', bg: 'bg-gray-50', icon: <Clock size={16} />, label: status };
        }
    };

    const handleCreateOrder = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const productId = formData.get('productId') as string;
        const product = productsData?.products.find(p => p.id === productId);

        if (!product) return;

        const data = {
            items: [{
                productId: product.id,
                productName: product.name,
                unitPrice: product.price,
                quantity: Number(formData.get('quantity'))
            }],
            shippingAddress: formData.get('address') as string,
            notes: formData.get('notes') as string
        };

        createOrderMutation.mutate(data);
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Quản lý <span className="text-[#D70018]">Đơn hàng</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Hệ thống xử lý đơn hàng và vận chuyển toàn quốc
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Tạo đơn hàng
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row items-stretch gap-4">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D70018] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã đơn hàng, địa chỉ..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-14 pr-10 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#D70018]/10 transition-all outline-none placeholder:text-gray-400"
                        />
                        {filters.search && (
                            <button
                                onClick={() => handleFilterChange('search', '')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Filter */}
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className={`px-4 py-4 border rounded-2xl text-xs font-black uppercase tracking-wider outline-none cursor-pointer transition-all ${
                                filters.status !== 'all' ? 'bg-[#D70018]/5 border-[#D70018]/20 text-[#D70018]' : 'bg-gray-50 border-transparent text-gray-700'
                            }`}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="Draft">Bản nháp</option>
                            <option value="Pending">Chờ xác nhận</option>
                            <option value="Confirmed">Đã xác nhận</option>
                            <option value="Shipped">Đang giao</option>
                            <option value="Delivered">Đã giao</option>
                            <option value="Completed">Hoàn tất</option>
                            <option value="Cancelled">Đã hủy</option>
                        </select>

                        {/* Payment Status Filter */}
                        <select
                            value={filters.paymentStatus}
                            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                            className={`px-4 py-4 border rounded-2xl text-xs font-black uppercase tracking-wider outline-none cursor-pointer transition-all ${
                                filters.paymentStatus !== 'all' ? 'bg-[#D70018]/5 border-[#D70018]/20 text-[#D70018]' : 'bg-gray-50 border-transparent text-gray-700'
                            }`}
                        >
                            <option value="all">Thanh toán</option>
                            <option value="Pending">Chờ thanh toán</option>
                            <option value="Paid">Đã thanh toán</option>
                            <option value="Failed">Thất bại</option>
                            <option value="Refunded">Hoàn tiền</option>
                        </select>

                        {/* Date Range */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="date"
                                    value={filters.dateRange.from}
                                    onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, from: e.target.value })}
                                    className={`pl-9 pr-3 py-4 border rounded-2xl text-xs font-bold outline-none cursor-pointer transition-all ${
                                        filters.dateRange.from ? 'bg-[#D70018]/5 border-[#D70018]/20 text-[#D70018]' : 'bg-gray-50 border-transparent text-gray-700'
                                    }`}
                                    placeholder="Từ ngày"
                                />
                            </div>
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={filters.dateRange.to}
                                onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, to: e.target.value })}
                                className={`px-3 py-4 border rounded-2xl text-xs font-bold outline-none cursor-pointer transition-all ${
                                    filters.dateRange.to ? 'bg-[#D70018]/5 border-[#D70018]/20 text-[#D70018]' : 'bg-gray-50 border-transparent text-gray-700'
                                }`}
                                placeholder="Đến ngày"
                            />
                        </div>

                        {/* Reset Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="flex items-center gap-2 px-4 py-4 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-[#D70018] hover:bg-red-50 rounded-2xl transition-all"
                            >
                                <RefreshCw size={14} />
                                Đặt lại
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-6">Đơn hàng</th>
                                <th className="px-8 py-6">Sản phẩm</th>
                                <th className="px-8 py-6">Giá trị thành tiền</th>
                                <th className="px-8 py-6">Trạng thái</th>
                                <th className="px-8 py-6">Ngày tạo</th>
                                <th className="px-8 py-6 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <Loader2 className="mx-auto text-[#D70018] animate-spin mb-4" size={40} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Đang tải dữ liệu đơn hàng...</p>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <Package className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Chưa có đơn hàng nào.</p>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                        const status = getStatusInfo(order.status);
                                        const isHighlighted = order.id === highlightedOrderId;
                                        return (
                                            <tr
                                                key={order.id}
                                                ref={isHighlighted ? highlightedRowRef : undefined}
                                                className={`hover:bg-gray-50/50 transition-all group cursor-pointer ${
                                                    isHighlighted ? 'ring-2 ring-blue-500 ring-inset bg-blue-50 animate-pulse' : ''
                                                }`}
                                            >
                                                <td className="px-8 py-6">
                                                    <span className="text-base font-black text-gray-950 group-hover:text-[#D70018] transition-colors tracking-tight">#{order.orderNumber}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-bold text-gray-800 tabular-nums">{order.items?.[0]?.productName || 'N/A'}</span>
                                                        {order.items?.length > 1 && (
                                                            <span className="text-[11px] font-black text-[#D70018] uppercase tracking-widest leading-none bg-red-50 w-fit px-2 py-1 rounded-md">+{order.items.length - 1} sản phẩm khác</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-lg font-black text-gray-950 tracking-tighter italic">{formatCurrency(order.totalAmount)}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <select
                                                        value={order.status}
                                                        disabled={updateStatusMutation.isPending}
                                                        onChange={(e) => updateStatusMutation.mutate({ id: order.id, status: e.target.value })}
                                                        className={`items-center gap-2 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic border ${status.bg} ${status.color} border-transparent hover:border-current transition-all appearance-none cursor-pointer focus:outline-none`}
                                                    >
                                                        <option value="Draft">Bản nháp</option>
                                                        <option value="Confirmed">Xác nhận</option>
                                                        <option value="Shipped">Đang giao</option>
                                                        <option value="Delivered">Đã giao</option>
                                                        <option value="Completed">Hoàn tất</option>
                                                        <option value="Cancelled">Đã hủy</option>
                                                    </select>
                                                </td>
                                                <td className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase">
                                                    {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-300 hover:text-[#D70018] hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-gray-100"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-10">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                    Hiển thị <span className="text-gray-900">{orders.length}</span> / <span className="text-gray-900">{total}</span> đơn hàng toàn hệ thống
                </span>
                <div className="flex gap-3">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-6 py-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] hover:border-red-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={orders.length < 20}
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] hover:border-red-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                    >
                        Trang kế &gt;
                    </button>
                </div>
            </div>

            {/* Order Detail Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedOrder(null)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-gray-50 sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                                            Đơn hàng <span className="text-[#D70018]">#{selectedOrder.orderNumber}</span>
                                        </h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                            Ngày tạo: {new Date(selectedOrder.orderDate).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-[#D70018] transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Status Update */}
                                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Trạng thái đơn hàng</p>
                                        <select
                                            value={selectedOrder.status}
                                            onChange={(e) => {
                                                updateStatusMutation.mutate({ id: selectedOrder.id, status: e.target.value });
                                                setSelectedOrder({ ...selectedOrder, status: e.target.value as OrderStatus });
                                            }}
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D70018]/20"
                                        >
                                            <option value="Draft">Bản nháp</option>
                                            <option value="Pending">Chờ xác nhận</option>
                                            <option value="Confirmed">Đã xác nhận</option>
                                            <option value="Paid">Đã thanh toán</option>
                                            <option value="Shipped">Đang giao</option>
                                            <option value="Delivered">Đã giao</option>
                                            <option value="Completed">Hoàn tất</option>
                                            <option value="Cancelled">Đã hủy</option>
                                        </select>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổng giá trị</p>
                                        <p className="text-2xl font-black text-[#D70018] italic">{formatCurrency(selectedOrder.totalAmount)}</p>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <Package size={14} className="text-[#D70018]" />
                                        Sản phẩm ({selectedOrder.items?.length || 0})
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items?.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{item.productName}</p>
                                                    <p className="text-xs text-gray-500">x{item.quantity} @ {formatCurrency(item.unitPrice)}</p>
                                                </div>
                                                <p className="text-sm font-black text-gray-900">{formatCurrency(item.lineTotal)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="space-y-3 p-6 bg-gray-50 rounded-2xl">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Tạm tính</span>
                                        <span className="font-bold">{formatCurrency(selectedOrder.subtotalAmount)}</span>
                                    </div>
                                    {selectedOrder.discountAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Giảm giá</span>
                                            <span className="font-bold text-emerald-600">-{formatCurrency(selectedOrder.discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Phí vận chuyển</span>
                                        <span className="font-bold">{formatCurrency(selectedOrder.shippingAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Thuế</span>
                                        <span className="font-bold">{formatCurrency(selectedOrder.taxAmount)}</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-3 flex justify-between">
                                        <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
                                        <span className="text-lg font-black text-[#D70018]">{formatCurrency(selectedOrder.totalAmount)}</span>
                                    </div>
                                </div>

                                {/* Shipping Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={14} className="text-[#D70018]" />
                                        Thông tin giao hàng
                                    </h3>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-700">{selectedOrder.shippingAddress || 'Chưa có địa chỉ'}</p>
                                        {selectedOrder.notes && (
                                            <p className="text-xs text-gray-500 mt-2 italic">Ghi chú: {selectedOrder.notes}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Order Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-[#D70018]">
                                        <ShoppingCart size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                                            Tạo <span className="text-[#D70018]">Đơn hàng mới</span>
                                        </h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Khởi tạo đơn hàng thủ công từ Admin</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-[#D70018] transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateOrder} className="p-8 space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                            <Package size={14} className="text-[#D70018]" />
                                            Thông tin sản phẩm
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Chọn sản phẩm</label>
                                                <select name="productId" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-100 appearance-none">
                                                    {productsData?.products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Số lượng</label>
                                                <input name="quantity" type="number" defaultValue={1} min={1} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-100 placeholder:text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                            <MapPin size={14} className="text-[#D70018]" />
                                            Giao hàng & Ghi chú
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Địa chỉ giao hàng</label>
                                                <input name="address" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-100 placeholder:text-gray-400" placeholder="Số nhà, tên đường, phường/xã..." />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ghi chú đơn hàng</label>
                                                <textarea name="notes" rows={3} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-100 resize-none placeholder:text-gray-400" placeholder="Lưu ý cho đơn vị vận chuyển..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-8 py-4 bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all">
                                        Hủy
                                    </button>
                                    <button type="submit" disabled={createOrderMutation.isPending} className="flex-[2] flex items-center justify-center gap-3 px-8 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all disabled:opacity-50">
                                        {createOrderMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                        Xác nhận tạo đơn
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
