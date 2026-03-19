import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Wrench, Clock, CheckCircle2, AlertCircle,
    Play, CheckSquare, Search, Filter,
    Loader2, Calendar, Smartphone, MoreVertical, Eye,
    ArrowUpDown, ChevronDown, X
} from 'lucide-react';
import { repairApi, type WorkOrder, type WorkOrderStatus } from '../../../api/repair';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

type FilterStatus = 'all' | WorkOrderStatus;

export const TechPortal = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlWorkOrderId = searchParams.get('workOrderId');

    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [highlightedWorkOrderId, setHighlightedWorkOrderId] = useState<string | null>(urlWorkOrderId);
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);

    // Handle workOrderId from URL - highlight the work order
    useEffect(() => {
        if (urlWorkOrderId) {
            setHighlightedWorkOrderId(urlWorkOrderId);
            // Clear the workOrderId from URL after 5 seconds
            const timer = setTimeout(() => {
                searchParams.delete('workOrderId');
                setSearchParams(searchParams, { replace: true });
                setHighlightedWorkOrderId(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [urlWorkOrderId]);

    // Scroll to highlighted work order
    useEffect(() => {
        if (highlightedWorkOrderId && highlightedRowRef.current) {
            highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedWorkOrderId, highlightedRowRef.current]);

    const { data: response, isLoading } = useQuery({
        queryKey: ['tech-work-orders'],
        queryFn: () => repairApi.technician.getMyWorkOrders(),
    });

    const startRepairMutation = useMutation({
        mutationFn: (id: string) => repairApi.admin.startRepair(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tech-work-orders'] });
            toast.success('Đã bắt đầu sửa chữa!');
        }
    });

    const completeRepairMutation = useMutation({
        mutationFn: ({ id, partsCost, laborCost, notes }: { id: string, partsCost: number, laborCost: number, notes?: string }) =>
            repairApi.admin.completeRepair(id, { partsCost, laborCost, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tech-work-orders'] });
            toast.success('Đã hoàn tất sửa chữa!');
        }
    });

    // Mock data if API fails or empty
    const mockOrders: WorkOrder[] = [
        { id: '1', ticketNumber: 'TK-8852', customerId: 'CUST-001', deviceModel: 'MacBook Pro M1', serialNumber: 'C02XXXXX', description: 'Màn hình không lên', status: 'Requested', createdAt: new Date().toISOString(), estimatedCost: 0, actualCost: 0, partsCost: 0, laborCost: 0, serviceFee: 0, totalCost: 0 },
        { id: '2', ticketNumber: 'TK-8853', customerId: 'CUST-002', deviceModel: 'Dell XPS 15', serialNumber: 'DL34234', description: 'Pin chai, cần thay', status: 'InProgress', createdAt: new Date().toISOString(), estimatedCost: 0, actualCost: 0, partsCost: 0, laborCost: 0, serviceFee: 0, totalCost: 0 },
        { id: '3', ticketNumber: 'TK-8854', customerId: 'CUST-003', deviceModel: 'Asus ROG Strix', serialNumber: 'ROG9988', description: 'Vệ sinh máy, tra keo tản nhiệt', status: 'Completed', createdAt: new Date().toISOString(), estimatedCost: 0, actualCost: 0, partsCost: 0, laborCost: 0, serviceFee: 0, totalCost: 0 },
    ];

    const rawWorkOrders = (response?.workOrders && response.workOrders.length > 0) ? response.workOrders : mockOrders;

    // Filter and sort
    const workOrders = useMemo(() => {
        let filtered = rawWorkOrders;

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(o =>
                o.ticketNumber?.toLowerCase().includes(term) ||
                o.serialNumber?.toLowerCase().includes(term) ||
                o.deviceModel?.toLowerCase().includes(term) ||
                o.description?.toLowerCase().includes(term)
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(o => o.status === filterStatus);
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                const statusOrder = ['Requested', 'Assigned', 'InProgress', 'Completed', 'Cancelled'];
                const orderA = statusOrder.indexOf(a.status);
                const orderB = statusOrder.indexOf(b.status);
                return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
            }
        });

        return filtered;
    }, [rawWorkOrders, searchTerm, filterStatus, sortBy, sortOrder]);

    // Calculate stats from my work orders only
    const stats = useMemo(() => {
        return {
            pending: rawWorkOrders.filter(o => o.status === 'Requested' || o.status === 'Assigned').length,
            inProgress: rawWorkOrders.filter(o => o.status === 'InProgress').length,
            completed: rawWorkOrders.filter(o => o.status === 'Completed').length,
        };
    }, [rawWorkOrders]);

    const getStatusIcon = (status: WorkOrderStatus) => {
        switch (status) {
            case 'Requested': return <Clock size={16} />;
            case 'Assigned': return <Clock size={16} />;
            case 'InProgress': return <Play size={16} />;
            case 'Completed': return <CheckCircle2 size={16} />;
            case 'Cancelled': return <AlertCircle size={16} />;
            default: return <Wrench size={16} />;
        }
    };

    const getStatusColor = (status: WorkOrderStatus) => {
        switch (status) {
            case 'Requested': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Assigned': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'InProgress': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Cancelled': return 'bg-gray-50 text-gray-700 border-gray-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const translateStatus = (status: WorkOrderStatus) => {
        switch (status) {
            case 'Requested': return 'Chờ tiếp nhận';
            case 'Assigned': return 'Được giao';
            case 'InProgress': return 'Đang xử lý';
            case 'Completed': return 'Đã hoàn thành';
            case 'Cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    const statusOptions: { value: FilterStatus; label: string; count?: number }[] = [
        { value: 'all', label: 'Tất cả', count: rawWorkOrders.length },
        { value: 'Requested', label: 'Chờ tiếp nhận', count: rawWorkOrders.filter(o => o.status === 'Requested').length },
        { value: 'Assigned', label: 'Được giao', count: rawWorkOrders.filter(o => o.status === 'Assigned').length },
        { value: 'InProgress', label: 'Đang xử lý', count: rawWorkOrders.filter(o => o.status === 'InProgress').length },
        { value: 'Completed', label: 'Hoàn thành', count: rawWorkOrders.filter(o => o.status === 'Completed').length },
        { value: 'Cancelled', label: 'Đã hủy', count: rawWorkOrders.filter(o => o.status === 'Cancelled').length },
    ];

    return (
        <div className="space-y-8 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
                        Phiếu sửa chữa <span className="text-[#D70018]">của tôi</span>
                    </h1>
                    <p className="text-gray-600 font-medium">
                        Quản lý các phiếu sửa chữa được giao cho bạn
                    </p>
                </div>
            </div>

            {/* Quick Stats - Only my work orders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <button
                    onClick={() => setFilterStatus(filterStatus === 'Requested' ? 'all' : 'Requested')}
                    className={`premium-card p-5 border-2 transition-all hover:shadow-md text-left ${
                        filterStatus === 'Requested' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100 hover:border-amber-200'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold text-xs uppercase tracking-wider">Chờ xử lý</p>
                            <h3 className="text-3xl font-black text-gray-900">{stats.pending}</h3>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setFilterStatus(filterStatus === 'InProgress' ? 'all' : 'InProgress')}
                    className={`premium-card p-5 border-2 transition-all hover:shadow-md text-left ${
                        filterStatus === 'InProgress' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-blue-200'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold text-xs uppercase tracking-wider">Đang thực hiện</p>
                            <h3 className="text-3xl font-black text-gray-900">{stats.inProgress}</h3>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setFilterStatus(filterStatus === 'Completed' ? 'all' : 'Completed')}
                    className={`premium-card p-5 border-2 transition-all hover:shadow-md text-left ${
                        filterStatus === 'Completed' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-100 hover:border-emerald-200'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold text-xs uppercase tracking-wider">Đã hoàn thành</p>
                            <h3 className="text-3xl font-black text-gray-900">{stats.completed}</h3>
                        </div>
                    </div>
                </button>
            </div>

            {/* Main Content */}
            <div className="premium-card overflow-hidden border-2">
                {/* Toolbar */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">Danh sách phiếu</h2>
                        <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded-full">{workOrders.length}</span>
                        {filterStatus !== 'all' && (
                            <button
                                onClick={() => setFilterStatus('all')}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full hover:bg-gray-200 transition-all"
                            >
                                {translateStatus(filterStatus as WorkOrderStatus)}
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm theo mã phiếu, S/N..."
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D70018] focus:border-transparent w-64 transition-all placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold"
                            >
                                <Filter size={16} />
                                <span>Lọc</span>
                                <ChevronDown size={16} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showFilterDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2">
                                        {statusOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setFilterStatus(option.value);
                                                    setShowFilterDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center justify-between hover:bg-gray-50 transition-all ${
                                                    filterStatus === option.value ? 'text-[#D70018] bg-red-50' : 'text-gray-700'
                                                }`}
                                            >
                                                <span>{option.label}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    filterStatus === option.value ? 'bg-[#D70018] text-white' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {option.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sort */}
                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold"
                        >
                            <ArrowUpDown size={16} />
                            <span>{sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Thông tin phiếu</th>
                                <th className="px-6 py-4">Thiết bị</th>
                                <th className="px-6 py-4">Mô tả</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-[#D70018] mb-3" size={40} />
                                        <p className="text-gray-500 font-semibold text-sm">Đang tải dữ liệu...</p>
                                    </td>
                                </tr>
                            ) : workOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <Wrench size={32} className="text-gray-300" />
                                        </div>
                                        <p className="text-gray-500 font-semibold">Không tìm thấy phiếu sửa chữa nào</p>
                                        {(searchTerm || filterStatus !== 'all') && (
                                            <button
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setFilterStatus('all');
                                                }}
                                                className="mt-3 text-sm text-[#D70018] font-semibold hover:underline"
                                            >
                                                Xóa bộ lọc
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : workOrders.map((order) => {
                                const isHighlighted = order.id === highlightedWorkOrderId;
                                return (
                                <tr
                                    key={order.id}
                                    ref={isHighlighted ? highlightedRowRef : undefined}
                                    className={`hover:bg-gray-50/80 transition-all group cursor-pointer ${
                                        isHighlighted ? 'ring-2 ring-blue-500 ring-inset bg-blue-50 animate-pulse' : ''
                                    }`}
                                    onClick={() => navigate(`/backoffice/tech/work-orders/${order.id}`)}
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow">
                                                #{order.ticketNumber?.split('-')[1] || '??'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{order.ticketNumber}</p>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                                    <Calendar size={12} />
                                                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                                <Smartphone size={14} className="text-gray-400" />
                                                {order.deviceModel}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1 font-mono bg-gray-100 px-2 py-0.5 rounded w-fit">
                                                SN: {order.serialNumber}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm text-gray-600 max-w-xs truncate" title={order.description}>
                                            {order.description}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {translateStatus(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/backoffice/tech/work-orders/${order.id}`);
                                                }}
                                                className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-900 hover:text-white transition-all"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {(order.status === 'Requested' || order.status === 'Assigned') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startRepairMutation.mutate(order.id);
                                                    }}
                                                    className="p-2.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                    title="Bắt đầu sửa chữa"
                                                >
                                                    <Play size={16} className="fill-current" />
                                                </button>
                                            )}
                                            {order.status === 'InProgress' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const notes = window.prompt('Ghi chú hoàn thành:');
                                                        if (notes !== null) completeRepairMutation.mutate({ id: order.id, partsCost: 0, laborCost: 0, notes: notes || undefined });
                                                    }}
                                                    className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                                    title="Hoàn tất"
                                                >
                                                    <CheckSquare size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {workOrders.length > 0 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm">
                        <p className="text-gray-500">
                            Hiển thị <span className="font-semibold text-gray-900">{workOrders.length}</span> phiếu
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
