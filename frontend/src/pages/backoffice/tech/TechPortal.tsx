import { useState } from 'react';
import {
    Wrench, Clock, CheckCircle2, AlertCircle,
    Play, CheckSquare, Search, Filter,
    Activity, ChevronRight, MoreVertical, X, Check, Loader2, Trash2
} from 'lucide-react';
import { repairApi, type WorkOrder } from '../../../api/repair';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const TechPortal = () => {
    const queryClient = useQueryClient();

    const { data: response, isLoading } = useQuery({
        queryKey: ['tech-work-orders'],
        queryFn: () => repairApi.admin.getWorkOrders(),
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

    const cancelRepairMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string, reason: string }) => repairApi.admin.cancelWorkOrder(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tech-work-orders'] });
            toast.success('Đã hủy phiếu!');
        }
    });

    const workOrders = response?.workOrders || [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending': return <Clock className="text-amber-500" size={16} />;
            case 'InProgress': return <Play className="text-blue-500" size={16} />;
            case 'Completed': return <CheckCircle2 className="text-emerald-500" size={16} />;
            case 'Cancelled': return <AlertCircle className="text-rose-500" size={16} />;
            default: return <Wrench className="text-gray-400" size={16} />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'InProgress': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Cancelled': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-gray-50 text-gray-500 border-gray-100';
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Kỹ thuật & <span className="text-[#D70018]">Sửa chữa</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Quản lý phiếu sửa chữa, điều phối công việc kỹ thuật
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Yêu cầu chờ', value: stats?.pendingWorkOrders || 0, icon: <Clock size={24} />, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Đang thực hiện', value: stats?.inProgressWorkOrders || 0, icon: <Play size={24} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Hoàn tất hôm nay', value: stats?.completedWorkOrders || 0, icon: <CheckCircle2 size={24} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <motion.div whileHover={{ y: -5 }} key={i} className="premium-card p-8 group">
                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">{stat.label}</p>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value} Phiếu</h3>
                    </motion.div>
                ))}
            </div>

            {/* Work Orders List */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="premium-card overflow-hidden">
                <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Danh sách phiếu điều phối</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#D70018]/5 text-[#D70018] text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Mã phiếu</th>
                                <th className="px-8 py-5">Sản phẩm kỹ thuật</th>
                                <th className="px-8 py-5">Trạng thái</th>
                                <th className="px-8 py-5">Khởi tạo</th>
                                <th className="px-8 py-5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-[#D70018]" /></td></tr>
                            ) : workOrders.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-24 text-center text-gray-300 font-black uppercase text-[10px]">Không có phiếu điều phối</td></tr>
                            ) : workOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="font-black text-[#D70018] bg-red-50 px-2.5 py-1.5 rounded-xl text-[11px] uppercase shadow-sm">#{order.ticketNumber}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-xs font-black text-gray-800 uppercase italic tracking-tight">{order.deviceModel}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">S/N: {order.serialNumber}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase">
                                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {order.status === 'Pending' && (
                                                <button
                                                    onClick={() => startRepairMutation.mutate(order.id)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Play size={16} />
                                                </button>
                                            )}
                                            {order.status === 'InProgress' && (
                                                <button
                                                    onClick={() => {
                                                        const notes = window.prompt('Nhập ghi chú kỹ thuật:');
                                                        if (notes !== null) completeRepairMutation.mutate({ id: order.id, partsCost: 0, laborCost: 0, notes });
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                >
                                                    <CheckSquare size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    const reason = window.prompt('Lý do hủy:');
                                                    if (reason !== null) cancelRepairMutation.mutate({ id: order.id, reason });
                                                }}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-300 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};
