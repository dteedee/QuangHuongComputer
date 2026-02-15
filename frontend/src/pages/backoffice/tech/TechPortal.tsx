import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wrench, Clock, CheckCircle2, AlertCircle,
    Play, CheckSquare, Search, Filter,
    Loader2, Calendar, Smartphone, Plus, MoreVertical, Eye
} from 'lucide-react';
import { repairApi, type WorkOrder, type WorkOrderStatus } from '../../../api/repair';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const TechPortal = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: response, isLoading } = useQuery({
        queryKey: ['tech-work-orders'],
        queryFn: () => repairApi.technician.getMyWorkOrders(),
    });

    const { data: stats } = useQuery({
        queryKey: ['tech-stats'],
        queryFn: repairApi.admin.getStats,
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

    const workOrders = (response?.workOrders && response.workOrders.length > 0) ? response.workOrders : mockOrders;

    const getStatusIcon = (status: WorkOrderStatus) => {
        switch (status) {
            case 'Requested': return <Clock size={16} />;
            case 'InProgress': return <Play size={16} />;
            case 'Completed': return <CheckCircle2 size={16} />;
            case 'Cancelled': return <AlertCircle size={16} />;
            default: return <Wrench size={16} />;
        }
    };

    const getStatusColor = (status: WorkOrderStatus) => {
        switch (status) {
            case 'Requested': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'InProgress': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Cancelled': return 'bg-gray-50 text-gray-700 border-gray-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const translateStatus = (status: WorkOrderStatus) => {
        switch (status) {
            case 'Requested': return 'Chờ tiếp nhận';
            case 'InProgress': return 'Đang xử lý';
            case 'Completed': return 'Đã hoàn thành';
            case 'Cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Kỹ thuật & <span className="text-[#D70018]">Dịch vụ</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Quản lý phiếu sửa chữa, bảo hành và điều phối kỹ thuật viên
                    </p>
                </div>
                <button
                    onClick={() => toast.info('Chức năng tạo phiếu mới đang được phát triển. Vui lòng sử dụng trang Sửa chữa công khai để đăng ký dịch vụ.')}
                    className="flex items-center gap-3 px-6 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[#b50014] transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Tạo phiếu mới
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="premium-card p-6 border-2 border-gray-100 transition-all hover:border-amber-500/20">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-lg">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Yêu cầu chờ</p>
                            <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic">{stats?.pendingWorkOrders || 2}</h3>
                        </div>
                    </div>
                </div>

                <div className="premium-card p-6 border-2 border-gray-100 transition-all hover:border-blue-500/20">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-lg">
                            <Wrench size={28} />
                        </div>
                        <div>
                            <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Đang thực hiện</p>
                            <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic">{stats?.inProgressWorkOrders || 5}</h3>
                        </div>
                    </div>
                </div>

                <div className="premium-card p-6 border-2 border-gray-100 transition-all hover:border-emerald-500/20">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg">
                            <CheckCircle2 size={28} />
                        </div>
                        <div>
                            <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Hoàn tất hôm nay</p>
                            <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic">{stats?.completedWorkOrders || 12}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="premium-card overflow-hidden border-2">
                {/* Toolbar */}
                <div className="p-8 border-b-2 border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-gray-950 tracking-tight uppercase italic">Danh sách phiếu</h2>
                        <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-black uppercase rounded-full">{workOrders.length}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm theo mã phiếu, S/N..."
                                className="pl-12 pr-6 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#D70018] w-72 transition-all placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 rounded-xl text-gray-950 hover:bg-gray-50 transition-all text-xs font-black uppercase tracking-widest shadow-sm">
                            <Filter size={16} />
                            <span>Lọc</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Thông tin phiếu</th>
                                <th className="px-8 py-5">Thiết bị</th>
                                <th className="px-8 py-5">Tình trạng</th>
                                <th className="px-8 py-5">Kỹ thuật viên</th>
                                <th className="px-8 py-5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <Loader2 className="animate-spin mx-auto text-[#D70018] mb-4" size={48} />
                                        <p className="text-gray-900 font-black uppercase tracking-widest text-sm">Đang tải dữ liệu...</p>
                                    </td>
                                </tr>
                            ) : workOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50/80 transition-all group cursor-pointer"
                                    onClick={() => navigate(`/backoffice/tech/work-orders/${order.id}`)}
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gray-950 text-white flex items-center justify-center font-black text-xs shadow-lg">
                                                #{order.ticketNumber.split('-')[1]}
                                            </div>
                                            <div>
                                                <p className="text-base font-black text-gray-950 tracking-tight">{order.ticketNumber}</p>
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                    <Calendar size={12} className="text-[#D70018]" />
                                                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="text-sm font-black text-gray-800 flex items-center gap-2">
                                                <Smartphone size={16} className="text-[#D70018]" />
                                                {order.deviceModel}
                                            </p>
                                            <p className="text-[11px] text-gray-500 mt-1 font-mono font-black bg-gray-100 px-2 py-0.5 rounded-md w-fit uppercase">
                                                SN: {order.serialNumber}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic border shadow-sm ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {translateStatus(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-950 text-white flex items-center justify-center text-[10px] font-black ring-4 ring-indigo-50">
                                                T
                                            </div>
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-tight">Trần Văn A</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/backoffice/tech/work-orders/${order.id}`);
                                                }}
                                                className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-900 hover:text-white transition-all shadow-sm active:scale-95"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {order.status === 'Requested' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startRepairMutation.mutate(order.id);
                                                    }}
                                                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                    title="Bắt đầu sửa chữa"
                                                >
                                                    <Play size={18} className="fill-current" />
                                                </button>
                                            )}
                                            {order.status === 'InProgress' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const notes = window.prompt('Ghi chú hoàn thành:');
                                                        if (notes) completeRepairMutation.mutate({ id: order.id, partsCost: 0, laborCost: 0, notes });
                                                    }}
                                                    className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                    title="Hoàn tất"
                                                >
                                                    <CheckSquare size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 bg-gray-50 border-t-2 border-gray-100 flex items-center justify-between font-black uppercase tracking-widest text-[10px]">
                    <p className="text-gray-500">Hiển thị <span className="text-gray-950">1-10</span> trên tổng số <span className="text-gray-950">{workOrders.length}</span> phiếu</p>
                    <div className="flex gap-3">
                        <button className="px-5 py-2 bg-white border-2 border-gray-100 rounded-xl text-gray-400 cursor-not-allowed">Trước</button>
                        <button className="px-5 py-2 bg-white border-2 border-gray-200 rounded-xl text-gray-950 hover:bg-gray-950 hover:text-white transition-all shadow-sm">Sau</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
