import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi, type WorkOrder, type RepairQuote, type WorkOrderStatus, getStatusColor } from '../api/repair';
import { formatCurrency } from '../utils/format';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Clock, CheckCircle, XCircle, Play, AlertCircle,
    FileText, Wrench, Package, DollarSign, Calendar, User, MessageSquare
} from 'lucide-react';

const translateStatus = (status: WorkOrderStatus): string => {
    const map: Record<WorkOrderStatus, string> = {
        'Requested': 'Chờ tiếp nhận',
        'Assigned': 'Đã phân công kỹ thuật viên',
        'Declined': 'Kỹ thuật viên từ chối',
        'Diagnosed': 'Đã chẩn đoán xong',
        'Quoted': 'Đã có báo giá',
        'AwaitingApproval': 'Chờ bạn xác nhận báo giá',
        'Approved': 'Bạn đã duyệt - Đang chuẩn bị sửa',
        'Rejected': 'Bạn đã từ chối báo giá',
        'InProgress': 'Đang sửa chữa',
        'OnHold': 'Tạm dừng',
        'Completed': 'Đã hoàn thành',
        'Cancelled': 'Đã hủy'
    };
    return map[status] || status;
};

const getStatusDescription = (status: WorkOrderStatus): string => {
    const map: Record<WorkOrderStatus, string> = {
        'Requested': 'Yêu cầu của bạn đã được tiếp nhận. Chúng tôi sẽ phân công kỹ thuật viên sớm nhất.',
        'Assigned': 'Kỹ thuật viên đã được phân công và sẽ kiểm tra thiết bị của bạn.',
        'Declined': 'Kỹ thuật viên không thể nhận việc này. Chúng tôi sẽ phân công người khác.',
        'Diagnosed': 'Kỹ thuật viên đã kiểm tra xong và đang chuẩn bị báo giá.',
        'Quoted': 'Đã có báo giá sửa chữa. Vui lòng xem xét và xác nhận.',
        'AwaitingApproval': 'Vui lòng xác nhận hoặc từ chối báo giá để tiếp tục.',
        'Approved': 'Bạn đã đồng ý báo giá. Kỹ thuật viên sẽ bắt đầu sửa chữa.',
        'Rejected': 'Bạn đã từ chối báo giá. Liên hệ chúng tôi nếu cần hỗ trợ thêm.',
        'InProgress': 'Kỹ thuật viên đang tiến hành sửa chữa thiết bị của bạn.',
        'OnHold': 'Việc sửa chữa tạm dừng. Chúng tôi sẽ cập nhật sớm.',
        'Completed': 'Sửa chữa đã hoàn thành! Bạn có thể đến lấy thiết bị.',
        'Cancelled': 'Yêu cầu đã bị hủy.'
    };
    return map[status] || '';
};

export const RepairDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    const { data: workOrder, isLoading } = useQuery<WorkOrder>({
        queryKey: ['work-order', id],
        queryFn: () => repairApi.workOrders.getMyWorkOrder(id!),
        enabled: !!id
    });

    const { data: quote } = useQuery<RepairQuote>({
        queryKey: ['quote', workOrder?.currentQuoteId],
        queryFn: () => repairApi.quotes.get(workOrder!.currentQuoteId!),
        enabled: !!workOrder?.currentQuoteId
    });

    const approveMutation = useMutation({
        mutationFn: () => repairApi.quotes.approve(quote!.id),
        onSuccess: () => {
            toast.success('Đã duyệt báo giá! Kỹ thuật viên sẽ bắt đầu sửa chữa.');
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            queryClient.invalidateQueries({ queryKey: ['quote'] });
        },
        onError: () => {
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: () => repairApi.quotes.reject(quote!.id, rejectReason),
        onSuccess: () => {
            toast.success('Đã từ chối báo giá.');
            setShowRejectModal(false);
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            queryClient.invalidateQueries({ queryKey: ['quote'] });
        },
        onError: () => {
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        }
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center py-20">
                    <div className="animate-spin w-12 h-12 border-4 border-[#D70018] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500 font-bold">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!workOrder) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center py-20">
                    <XCircle size={48} className="mx-auto mb-4 text-red-500" />
                    <p className="text-gray-900 font-bold text-xl mb-4">Không tìm thấy phiếu sửa chữa</p>
                    <Link to="/repair" className="text-[#D70018] font-bold hover:underline">
                        Quay lại trang sửa chữa
                    </Link>
                </div>
            </div>
        );
    }

    const needsAction = workOrder.status === 'AwaitingApproval' || workOrder.status === 'Quoted';

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl font-sans">
            {/* Back button */}
            <button
                onClick={() => navigate('/repair')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold mb-8 transition-colors"
            >
                <ArrowLeft size={20} />
                <span>Quay lại</span>
            </button>

            {/* Header */}
            <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
                                {workOrder.deviceModel}
                            </h1>
                            <span className="px-3 py-1 bg-gray-900 text-white text-xs font-black rounded-lg uppercase">
                                {workOrder.ticketNumber}
                            </span>
                        </div>
                        <p className="text-gray-500 font-medium">S/N: {workOrder.serialNumber || 'N/A'}</p>
                    </div>
                    <span className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider border ${getStatusColor(workOrder.status)}`}>
                        {workOrder.status === 'Completed' ? <CheckCircle size={18} /> :
                            workOrder.status === 'InProgress' ? <Play size={18} /> :
                                workOrder.status === 'AwaitingApproval' ? <AlertCircle size={18} /> :
                                    <Clock size={18} />}
                        {translateStatus(workOrder.status)}
                    </span>
                </div>

                {/* Status description */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-600 font-medium italic">
                        {getStatusDescription(workOrder.status)}
                    </p>
                </div>
            </div>

            {/* Quote Section - Show if there's a quote and needs action */}
            {quote && needsAction && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[32px] shadow-xl border-2 border-amber-200 p-8 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                            <FileText size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">
                                Báo giá sửa chữa
                            </h2>
                            <p className="text-amber-700 text-sm font-bold">
                                Mã báo giá: {quote.quoteNumber}
                            </p>
                        </div>
                    </div>

                    {/* Quote details */}
                    <div className="bg-white rounded-2xl p-6 mb-6 border border-amber-100">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-600 font-medium flex items-center gap-2">
                                    <Package size={16} /> Chi phí linh kiện
                                </span>
                                <span className="font-bold text-gray-900">{formatCurrency(quote.partsCost)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-600 font-medium flex items-center gap-2">
                                    <Wrench size={16} /> Chi phí nhân công
                                </span>
                                <span className="font-bold text-gray-900">{formatCurrency(quote.laborCost)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-600 font-medium flex items-center gap-2">
                                    <DollarSign size={16} /> Phí dịch vụ
                                </span>
                                <span className="font-bold text-gray-900">{formatCurrency(quote.serviceFee)}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 bg-gray-900 rounded-xl px-4 -mx-2">
                                <span className="text-white font-black uppercase tracking-wider">Tổng cộng</span>
                                <span className="text-2xl font-black text-[#D70018]">{formatCurrency(quote.totalCost)}</span>
                            </div>
                        </div>

                        {quote.description && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Mô tả công việc:</p>
                                <p className="text-gray-700">{quote.description}</p>
                            </div>
                        )}

                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                            <Calendar size={14} />
                            <span>Báo giá có hiệu lực đến: {new Date(quote.validUntil).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => approveMutation.mutate()}
                            disabled={approveMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 uppercase tracking-widest text-sm active:scale-95 disabled:opacity-50"
                        >
                            <CheckCircle size={20} />
                            {approveMutation.isPending ? 'Đang xử lý...' : 'Đồng ý báo giá'}
                        </button>
                        <button
                            onClick={() => setShowRejectModal(true)}
                            disabled={rejectMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-white text-red-600 border-2 border-red-200 font-black rounded-xl hover:bg-red-50 transition uppercase tracking-widest text-sm active:scale-95 disabled:opacity-50"
                        >
                            <XCircle size={20} />
                            Từ chối
                        </button>
                    </div>
                </div>
            )}

            {/* Completed Quote Info */}
            {quote && !needsAction && (
                <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-8">
                    <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic mb-6 flex items-center gap-2">
                        <FileText size={20} className="text-[#D70018]" />
                        Thông tin báo giá
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Linh kiện</p>
                            <p className="font-bold text-gray-900">{formatCurrency(quote.partsCost)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Nhân công</p>
                            <p className="font-bold text-gray-900">{formatCurrency(quote.laborCost)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Phí dịch vụ</p>
                            <p className="font-bold text-gray-900">{formatCurrency(quote.serviceFee)}</p>
                        </div>
                        <div className="p-4 bg-[#D70018] rounded-xl">
                            <p className="text-xs text-red-100 font-bold uppercase mb-1">Tổng cộng</p>
                            <p className="font-black text-white text-lg">{formatCurrency(quote.totalCost)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Work Order Details */}
            <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-8">
                <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic mb-6 flex items-center gap-2">
                    <MessageSquare size={20} className="text-[#D70018]" />
                    Chi tiết yêu cầu
                </h2>

                <div className="space-y-6">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Mô tả vấn đề</p>
                        <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">{workOrder.description}</p>
                    </div>

                    {workOrder.technicalNotes && (
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Ghi chú kỹ thuật</p>
                            <p className="text-gray-700 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                {workOrder.technicalNotes}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Ngày tạo</p>
                            <p className="font-bold text-gray-900">{new Date(workOrder.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        {workOrder.assignedAt && (
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Ngày phân công</p>
                                <p className="font-bold text-gray-900">{new Date(workOrder.assignedAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                        )}
                        {workOrder.startedAt && (
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Bắt đầu sửa</p>
                                <p className="font-bold text-gray-900">{new Date(workOrder.startedAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                        )}
                        {workOrder.finishedAt && (
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Hoàn thành</p>
                                <p className="font-bold text-emerald-600">{new Date(workOrder.finishedAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-900 rounded-[32px] p-8 text-white">
                <h2 className="text-xl font-black tracking-tighter uppercase italic mb-4">
                    Cần hỗ trợ?
                </h2>
                <p className="text-gray-400 mb-4">
                    Liên hệ với chúng tôi nếu bạn có bất kỳ câu hỏi nào về phiếu sửa chữa này.
                </p>
                <div className="flex flex-wrap gap-4">
                    <a href="tel:1900123456" className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition">
                        <User size={18} />
                        1900 123 456
                    </a>
                    <a href="mailto:support@quanghuong.com" className="flex items-center gap-2 px-6 py-3 bg-[#D70018] text-white font-bold rounded-xl hover:bg-red-700 transition">
                        <MessageSquare size={18} />
                        Email hỗ trợ
                    </a>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-md w-full">
                        <h3 className="text-xl font-black text-gray-900 mb-4">Từ chối báo giá</h3>
                        <p className="text-gray-600 mb-6">
                            Vui lòng cho chúng tôi biết lý do từ chối để cải thiện dịch vụ.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do từ chối..."
                            className="w-full p-4 border border-gray-200 rounded-xl mb-6 min-h-[100px] focus:outline-none focus:border-[#D70018]"
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => rejectMutation.mutate()}
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {rejectMutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
