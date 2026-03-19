import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi, type WorkOrderStatus, getStatusColor } from '../../../api/repair';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Wrench, Package, FileText, Plus, Trash2, Send,
    CheckCircle, Play, Pause, MessageSquare, Clock, AlertCircle,
    DollarSign, User, Smartphone, Calendar
} from 'lucide-react';

const translateStatus = (status: WorkOrderStatus): string => {
    const map: Record<WorkOrderStatus, string> = {
        'Requested': 'Chờ tiếp nhận',
        'Assigned': 'Đã phân công',
        'Declined': 'Đã từ chối',
        'Diagnosed': 'Đã chẩn đoán',
        'Quoted': 'Đã báo giá',
        'AwaitingApproval': 'Chờ duyệt',
        'Approved': 'Đã duyệt',
        'Rejected': 'Bị từ chối',
        'InProgress': 'Đang sửa',
        'OnHold': 'Tạm dừng',
        'Completed': 'Hoàn thành',
        'Cancelled': 'Đã hủy'
    };
    return map[status] || status;
};

export const WorkOrderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showAddPartModal, setShowAddPartModal] = useState(false);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);

    // Part form
    const [partName, setPartName] = useState('');
    const [partNumber, setPartNumber] = useState('');
    const [partQuantity, setPartQuantity] = useState(1);
    const [partUnitPrice, setPartUnitPrice] = useState(0);

    // Quote form
    const [quoteLaborCost, setQuoteLaborCost] = useState(0);
    const [quoteServiceFee, setQuoteServiceFee] = useState(0);
    const [quoteEstimatedHours, setQuoteEstimatedHours] = useState(1);
    const [quoteHourlyRate, setQuoteHourlyRate] = useState(200000);
    const [quoteDescription, setQuoteDescription] = useState('');
    const [quoteNotes, setQuoteNotes] = useState('');

    // Note form
    const [noteContent, setNoteContent] = useState('');
    const [diagnosisNotes, setDiagnosisNotes] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tech-work-order', id],
        queryFn: () => repairApi.technician.getWorkOrderDetail(id!),
        enabled: !!id
    });

    const workOrder = data?.workOrder;
    const parts = data?.parts || [];
    const logs = data?.logs || [];

    // Mutations
    const updateStatusMutation = useMutation({
        mutationFn: ({ status, notes }: { status: WorkOrderStatus; notes?: string }) =>
            repairApi.technician.updateStatus(id!, status, notes),
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái!');
            refetch();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Có lỗi xảy ra');
        }
    });

    const addPartMutation = useMutation({
        mutationFn: () => repairApi.technician.addPart(id!, {
            inventoryItemId: crypto.randomUUID(), // Should be from inventory selection
            partName,
            partNumber,
            quantity: partQuantity,
            unitPrice: partUnitPrice
        }),
        onSuccess: () => {
            toast.success('Đã thêm linh kiện!');
            setShowAddPartModal(false);
            resetPartForm();
            refetch();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Có lỗi xảy ra');
        }
    });

    const removePartMutation = useMutation({
        mutationFn: (partId: string) => repairApi.technician.removePart(id!, partId),
        onSuccess: () => {
            toast.success('Đã xóa linh kiện!');
            refetch();
        }
    });

    const createQuoteMutation = useMutation({
        mutationFn: () => repairApi.technician.createQuote(id!, {
            partsCost: parts.reduce((sum: number, p: any) => sum + p.totalPrice, 0),
            laborCost: quoteLaborCost,
            serviceFee: quoteServiceFee,
            estimatedHours: quoteEstimatedHours,
            hourlyRate: quoteHourlyRate,
            description: quoteDescription,
            notes: quoteNotes
        }),
        onSuccess: () => {
            toast.success('Đã tạo báo giá!');
            setShowQuoteModal(false);
            refetch();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Có lỗi xảy ra');
        }
    });

    const addNoteMutation = useMutation({
        mutationFn: () => repairApi.technician.addLog(id!, noteContent),
        onSuccess: () => {
            toast.success('Đã thêm ghi chú!');
            setShowNoteModal(false);
            setNoteContent('');
            refetch();
        }
    });

    const resetPartForm = () => {
        setPartName('');
        setPartNumber('');
        setPartQuantity(1);
        setPartUnitPrice(0);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-12 h-12 border-4 border-[#D70018] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!workOrder) {
        return (
            <div className="text-center py-20">
                <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                <p className="text-xl font-bold text-gray-900">Không tìm thấy phiếu sửa chữa</p>
            </div>
        );
    }

    const canDiagnose = workOrder.status === 'Assigned';
    const canAddParts = ['Assigned', 'Diagnosed', 'Quoted'].includes(workOrder.status);
    const canCreateQuote = workOrder.status === 'Diagnosed';
    const canStart = workOrder.status === 'Approved';
    const canComplete = workOrder.status === 'InProgress';
    const canPause = workOrder.status === 'InProgress';
    const canResume = workOrder.status === 'OnHold';

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button
                        onClick={() => navigate('/backoffice/tech')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Quay lại
                    </button>
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                            {workOrder.ticketNumber}
                        </h1>
                        <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase ${getStatusColor(workOrder.status)}`}>
                            {translateStatus(workOrder.status)}
                        </span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                    {canDiagnose && (
                        <button
                            onClick={() => {
                                const notes = prompt('Nhập kết quả chẩn đoán:');
                                if (notes) updateStatusMutation.mutate({ status: 'Diagnosed', notes });
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition"
                        >
                            <Wrench size={18} />
                            Hoàn tất chẩn đoán
                        </button>
                    )}
                    {canStart && (
                        <button
                            onClick={() => updateStatusMutation.mutate({ status: 'InProgress' })}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                        >
                            <Play size={18} />
                            Bắt đầu sửa
                        </button>
                    )}
                    {canPause && (
                        <button
                            onClick={() => {
                                const reason = prompt('Lý do tạm dừng:');
                                if (reason) updateStatusMutation.mutate({ status: 'OnHold', notes: reason });
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition"
                        >
                            <Pause size={18} />
                            Tạm dừng
                        </button>
                    )}
                    {canResume && (
                        <button
                            onClick={() => updateStatusMutation.mutate({ status: 'InProgress' })}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                        >
                            <Play size={18} />
                            Tiếp tục
                        </button>
                    )}
                    {canComplete && (
                        <button
                            onClick={() => {
                                const notes = prompt('Ghi chú hoàn thành:');
                                updateStatusMutation.mutate({ status: 'Completed', notes: notes || undefined });
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
                        >
                            <CheckCircle size={18} />
                            Hoàn thành
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Device Info */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Smartphone size={20} className="text-[#D70018]" />
                            Thông tin thiết bị
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Model</p>
                                <p className="font-bold text-gray-900">{workOrder.deviceModel}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Serial Number</p>
                                <p className="font-mono font-bold text-gray-900">{workOrder.serialNumber || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-gray-500 font-bold uppercase">Mô tả vấn đề</p>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">{workOrder.description}</p>
                            </div>
                            {workOrder.technicalNotes && (
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Ghi chú kỹ thuật</p>
                                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg mt-1 border border-blue-100">
                                        {workOrder.technicalNotes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Parts Section */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <Package size={20} className="text-[#D70018]" />
                                Linh kiện sử dụng
                            </h2>
                            {canAddParts && (
                                <button
                                    onClick={() => setShowAddPartModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#D70018] text-white rounded-lg font-bold text-sm hover:bg-red-700 transition"
                                >
                                    <Plus size={16} />
                                    Thêm linh kiện
                                </button>
                            )}
                        </div>

                        {parts.length === 0 ? (
                            <p className="text-gray-400 text-center py-8 italic">Chưa có linh kiện nào</p>
                        ) : (
                            <div className="space-y-3">
                                {parts.map((part: any) => (
                                    <div key={part.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-bold text-gray-900">{part.partName}</p>
                                            {part.partNumber && (
                                                <p className="text-xs text-gray-500 font-mono">#{part.partNumber}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900">{formatCurrency(part.totalPrice)}</p>
                                                <p className="text-xs text-gray-500">{part.quantity} x {formatCurrency(part.unitPrice)}</p>
                                            </div>
                                            {canAddParts && (
                                                <button
                                                    onClick={() => removePartMutation.mutate(part.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                    <span className="font-bold text-gray-700">Tổng chi phí linh kiện:</span>
                                    <span className="text-xl font-black text-[#D70018]">
                                        {formatCurrency(parts.reduce((sum: number, p: any) => sum + p.totalPrice, 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quote Section */}
                    {canCreateQuote && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                    <FileText size={20} className="text-blue-600" />
                                    Tạo báo giá
                                </h2>
                            </div>
                            <p className="text-gray-600 mb-4">
                                Đã chẩn đoán xong và thêm linh kiện. Tạo báo giá để gửi cho khách hàng duyệt.
                            </p>
                            <button
                                onClick={() => setShowQuoteModal(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                            >
                                <Send size={18} />
                                Tạo báo giá
                            </button>
                        </div>
                    )}

                    {/* Activity Log */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <MessageSquare size={20} className="text-[#D70018]" />
                                Lịch sử hoạt động
                            </h2>
                            <button
                                onClick={() => setShowNoteModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition"
                            >
                                <Plus size={16} />
                                Thêm ghi chú
                            </button>
                        </div>

                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {logs.map((log: any) => (
                                <div key={log.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User size={16} className="text-gray-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">{log.activity}</p>
                                        {log.description && <p className="text-gray-600 text-sm mt-1">{log.description}</p>}
                                        <p className="text-xs text-gray-400 mt-2">
                                            {log.performedByName || 'Hệ thống'} • {new Date(log.createdAt).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Cost Summary */}
                    <div className="bg-gray-900 rounded-2xl p-6 text-white">
                        <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            <DollarSign size={20} className="text-[#D70018]" />
                            Tổng chi phí
                        </h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Linh kiện</span>
                                <span className="font-bold">{formatCurrency(workOrder.partsCost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Nhân công</span>
                                <span className="font-bold">{formatCurrency(workOrder.laborCost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Phí dịch vụ</span>
                                <span className="font-bold">{formatCurrency(workOrder.serviceFee)}</span>
                            </div>
                            <div className="border-t border-gray-700 pt-3 flex justify-between">
                                <span className="font-bold">Tổng cộng</span>
                                <span className="text-2xl font-black text-[#D70018]">{formatCurrency(workOrder.totalCost)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Calendar size={20} className="text-[#D70018]" />
                            Timeline
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <div>
                                    <p className="text-xs text-gray-500">Tạo phiếu</p>
                                    <p className="font-bold text-gray-900">{new Date(workOrder.createdAt).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>
                            {workOrder.assignedAt && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Phân công</p>
                                        <p className="font-bold text-gray-900">{new Date(workOrder.assignedAt).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                            )}
                            {workOrder.diagnosedAt && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Chẩn đoán</p>
                                        <p className="font-bold text-gray-900">{new Date(workOrder.diagnosedAt).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                            )}
                            {workOrder.startedAt && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Bắt đầu sửa</p>
                                        <p className="font-bold text-gray-900">{new Date(workOrder.startedAt).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                            )}
                            {workOrder.finishedAt && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Hoàn thành</p>
                                        <p className="font-bold text-emerald-600">{new Date(workOrder.finishedAt).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Part Modal */}
            {showAddPartModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h3 className="text-xl font-black text-gray-900 mb-6">Thêm linh kiện</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tên linh kiện *</label>
                                <input
                                    type="text"
                                    value={partName}
                                    onChange={(e) => setPartName(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    placeholder="VD: Pin laptop Dell"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mã linh kiện</label>
                                <input
                                    type="text"
                                    value={partNumber}
                                    onChange={(e) => setPartNumber(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    placeholder="VD: PN-123456"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Số lượng</label>
                                    <input
                                        type="number"
                                        value={partQuantity}
                                        onChange={(e) => setPartQuantity(Number(e.target.value))}
                                        min="1"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Đơn giá (VNĐ)</label>
                                    <input
                                        type="number"
                                        value={partUnitPrice}
                                        onChange={(e) => setPartUnitPrice(Number(e.target.value))}
                                        min="0"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    />
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500">Thành tiền:</p>
                                <p className="text-xl font-black text-[#D70018]">{formatCurrency(partQuantity * partUnitPrice)}</p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowAddPartModal(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => addPartMutation.mutate()}
                                disabled={!partName || partQuantity < 1 || addPartMutation.isPending}
                                className="flex-1 py-3 bg-[#D70018] text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
                            >
                                {addPartMutation.isPending ? 'Đang thêm...' : 'Thêm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Quote Modal */}
            {showQuoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black text-gray-900 mb-6">Tạo báo giá</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500">Chi phí linh kiện (tự động tính)</p>
                                <p className="text-xl font-black text-gray-900">
                                    {formatCurrency(parts.reduce((sum: number, p: any) => sum + p.totalPrice, 0))}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Chi phí nhân công</label>
                                    <input
                                        type="number"
                                        value={quoteLaborCost}
                                        onChange={(e) => setQuoteLaborCost(Number(e.target.value))}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Phí dịch vụ</label>
                                    <input
                                        type="number"
                                        value={quoteServiceFee}
                                        onChange={(e) => setQuoteServiceFee(Number(e.target.value))}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Số giờ ước tính</label>
                                    <input
                                        type="number"
                                        value={quoteEstimatedHours}
                                        onChange={(e) => setQuoteEstimatedHours(Number(e.target.value))}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Giá/giờ</label>
                                    <input
                                        type="number"
                                        value={quoteHourlyRate}
                                        onChange={(e) => setQuoteHourlyRate(Number(e.target.value))}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả công việc</label>
                                <textarea
                                    value={quoteDescription}
                                    onChange={(e) => setQuoteDescription(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] min-h-[80px]"
                                    placeholder="Mô tả chi tiết công việc sửa chữa..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú</label>
                                <textarea
                                    value={quoteNotes}
                                    onChange={(e) => setQuoteNotes(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] min-h-[60px]"
                                    placeholder="Ghi chú thêm..."
                                />
                            </div>
                            <div className="p-4 bg-[#D70018] rounded-xl text-white">
                                <p className="text-sm opacity-80">Tổng báo giá:</p>
                                <p className="text-2xl font-black">
                                    {formatCurrency(
                                        parts.reduce((sum: number, p: any) => sum + p.totalPrice, 0) +
                                        quoteLaborCost +
                                        quoteServiceFee
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowQuoteModal(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => createQuoteMutation.mutate()}
                                disabled={createQuoteMutation.isPending}
                                className="flex-1 py-3 bg-[#D70018] text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
                            >
                                {createQuoteMutation.isPending ? 'Đang tạo...' : 'Tạo báo giá'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h3 className="text-xl font-black text-gray-900 mb-6">Thêm ghi chú</h3>
                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D70018] min-h-[120px]"
                            placeholder="Nhập ghi chú..."
                        />
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowNoteModal(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => addNoteMutation.mutate()}
                                disabled={!noteContent.trim() || addNoteMutation.isPending}
                                className="flex-1 py-3 bg-[#D70018] text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
                            >
                                {addNoteMutation.isPending ? 'Đang thêm...' : 'Thêm ghi chú'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrderDetailPage;
