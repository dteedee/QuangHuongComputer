import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi, type WorkOrder, type WorkOrderStatus, getStatusColor } from '../api/repair';
import { formatCurrency } from '../utils/format';
import { Clock, CheckCircle, XCircle, Play, AlertCircle, FileText, Wrench, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

const translateStatus = (status: WorkOrderStatus): string => {
    const map: Record<WorkOrderStatus, string> = {
        'Requested': 'Chờ tiếp nhận',
        'Assigned': 'Đã phân công',
        'Declined': 'Từ chối',
        'Diagnosed': 'Đã chẩn đoán',
        'Quoted': 'Đã báo giá',
        'AwaitingApproval': 'Chờ duyệt báo giá',
        'Approved': 'Đã duyệt',
        'Rejected': 'Từ chối báo giá',
        'InProgress': 'Đang sửa chữa',
        'OnHold': 'Tạm dừng',
        'Completed': 'Hoàn thành',
        'Cancelled': 'Đã hủy'
    };
    return map[status] || status;
};

const getStatusIcon = (status: WorkOrderStatus) => {
    switch (status) {
        case 'Requested':
        case 'Assigned':
            return <Clock size={15} />;
        case 'InProgress':
        case 'Diagnosed':
            return <Play size={15} />;
        case 'Completed':
        case 'Approved':
            return <CheckCircle size={15} />;
        case 'Cancelled':
        case 'Rejected':
        case 'Declined':
            return <XCircle size={15} />;
        case 'AwaitingApproval':
        case 'Quoted':
            return <FileText size={15} />;
        case 'OnHold':
            return <AlertCircle size={15} />;
        default:
            return <Wrench size={15} />;
    }
};

export const RepairPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deviceModel, setDeviceModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: workOrders, isLoading: loadingWorkOrders } = useQuery<WorkOrder[]>({
        queryKey: ['my-work-orders'],
        queryFn: repairApi.workOrders.getMyWorkOrders,
        enabled: isAuthenticated
    });

    const { data: bookings, isLoading: loadingBookings } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: repairApi.booking.getMyBookings,
        enabled: isAuthenticated
    });

    const createRepair = useMutation({
        mutationFn: (data: { deviceModel: string; serialNumber: string; description: string }) =>
            repairApi.workOrders.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-work-orders'] });
            setSuccess(true);
            setDeviceModel('');
            setSerialNumber('');
            setIssueDescription('');
            setTimeout(() => setSuccess(false), 3000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const schema = z.object({
            deviceModel: z.string().min(1, msg.requireInput('Tên thiết bị / Model')),
            serialNumber: z.string().min(1, msg.requireInput('Số Serial (S/N)')),
            issueDescription: z.string().min(1, msg.requireInput('Mô tả tình trạng'))
        });

        const result = schema.safeParse({ deviceModel, serialNumber, issueDescription });
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const path = issue.path[0]?.toString();
                if (path) fieldErrors[path] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setErrors({});
        createRepair.mutate({ deviceModel, serialNumber, description: issueDescription });
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 min-h-screen py-8 font-sans">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-md mx-auto bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                        <div className="w-14 h-14 bg-red-50 text-accent rounded-xl flex items-center justify-center mx-auto mb-5">
                            <Wrench size={28} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vui lòng đăng nhập</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Bạn cần đăng nhập để đặt lịch sửa chữa và theo dõi tiến độ.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block px-8 py-2.5 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all cursor-pointer"
                        >
                            Đăng nhập ngay
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isLoading = loadingWorkOrders || loadingBookings;
    const allItems = [
        ...(workOrders || []).map(wo => ({ type: 'workorder' as const, data: wo })),
        ...(bookings || []).map(b => ({ type: 'booking' as const, data: b }))
    ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());

    return (
        <div className="bg-gray-50 min-h-screen py-8 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Dịch vụ sửa chữa</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Form + Book button */}
                    <div className="space-y-4">
                        {/* Quick Create Form */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Gửi yêu cầu nhanh</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Tên thiết bị / Model
                                    </label>
                                    <input
                                        value={deviceModel}
                                        onChange={e => setDeviceModel(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm ${errors.deviceModel ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                        placeholder="Ví dụ: Dell XPS 15"
                                    />
                                    {errors.deviceModel && <p className="text-red-500 text-xs mt-1">{errors.deviceModel}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Số Serial (S/N)
                                    </label>
                                    <input
                                        value={serialNumber}
                                        onChange={e => setSerialNumber(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm ${errors.serialNumber ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                        placeholder="Ví dụ: SN123456"
                                    />
                                    {errors.serialNumber && <p className="text-red-500 text-xs mt-1">{errors.serialNumber}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Mô tả tình trạng
                                    </label>
                                    <textarea
                                        value={issueDescription}
                                        onChange={e => setIssueDescription(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm min-h-[100px] resize-none ${errors.issueDescription ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                        placeholder="Thiết bị của bạn đang gặp vấn đề gì?"
                                    />
                                    {errors.issueDescription && <p className="text-red-500 text-xs mt-1">{errors.issueDescription}</p>}
                                </div>
                                {success && (
                                    <p className="text-emerald-600 text-sm font-medium">Đã gửi yêu cầu thành công!</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={createRepair.isPending}
                                    className="w-full py-2.5 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {createRepair.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                </button>
                            </form>
                        </div>

                        {/* Book Service */}
                        <Link
                            to="/booking"
                            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:border-gray-300 transition-all group cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1">Đặt lịch dịch vụ</h3>
                                    <p className="text-gray-500 text-sm">
                                        Sửa tại cửa hàng hoặc tại nhà
                                    </p>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    </div>

                    {/* Right: Repair History */}
                    <div className="lg:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-4">Lịch sử sửa chữa</h3>

                        {isLoading ? (
                            <div className="text-center text-gray-500 py-10 text-sm">Đang tải dữ liệu...</div>
                        ) : allItems.length === 0 ? (
                            <div className="bg-white py-10 px-6 rounded-xl border border-gray-100 shadow-sm text-center text-gray-500 text-sm">
                                Chưa có dữ liệu sửa chữa.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {allItems.map(item => {
                                    if (item.type === 'workorder') {
                                        const repair = item.data as WorkOrder;
                                        const needsAction = repair.status === 'AwaitingApproval' || repair.status === 'Quoted';

                                        return (
                                            <div
                                                key={`wo-${repair.id}`}
                                                className={`bg-white rounded-xl border shadow-sm p-5 transition-all cursor-pointer hover:shadow-md ${needsAction ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gray-100 hover:border-gray-200'}`}
                                                onClick={() => navigate(`/repair/${repair.id}`)}
                                            >
                                                {needsAction && (
                                                    <div className="mb-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2">
                                                        <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                                                        <span className="text-amber-700 text-xs font-semibold">Cần xác nhận báo giá</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                                                    <div>
                                                        <div className="flex items-center gap-2.5">
                                                            <h4 className="font-bold text-gray-900">{repair.deviceModel}</h4>
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                                                                {repair.ticketNumber}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">S/N: {repair.serialNumber || 'N/A'}</p>
                                                    </div>
                                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(repair.status)}`}>
                                                        {getStatusIcon(repair.status)}
                                                        {translateStatus(repair.status)}
                                                    </span>
                                                </div>

                                                <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-2">
                                                    {repair.description}
                                                </p>

                                                <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-50">
                                                    <span>Ngày đặt: {new Date(repair.createdAt).toLocaleDateString('vi-VN')}</span>
                                                    {repair.totalCost > 0 && (
                                                        <span className="text-accent font-bold text-sm">
                                                            {formatCurrency(repair.totalCost)}
                                                        </span>
                                                    )}
                                                </div>

                                                {repair.technicalNotes && (
                                                    <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100">
                                                        <strong className="text-gray-900 block mb-1">Ghi chú kỹ thuật:</strong>
                                                        {repair.technicalNotes}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        const booking = item.data;
                                        return (
                                            <div
                                                key={`booking-${booking.id}`}
                                                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                                                    <div>
                                                        <div className="flex items-center gap-2.5">
                                                            <h4 className="font-bold text-gray-900">{booking.deviceModel}</h4>
                                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">
                                                                Đặt lịch
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {booking.serviceType === 'OnSite' ? 'Sửa tại nhà' : 'Sửa tại cửa hàng'}
                                                        </p>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                        booking.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        booking.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        booking.status === 'Converted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                        {booking.status === 'Pending' ? 'Chờ xác nhận' :
                                                         booking.status === 'Approved' ? 'Đã xác nhận' :
                                                         booking.status === 'Converted' ? 'Đã chuyển thành phiếu' :
                                                         'Đã từ chối'}
                                                    </span>
                                                </div>

                                                <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-2">
                                                    {booking.issueDescription}
                                                </p>

                                                <div className="flex justify-between items-center text-xs text-gray-500">
                                                    <span>Ngày hẹn: {new Date(booking.preferredDate).toLocaleDateString('vi-VN')}</span>
                                                    {booking.onSiteFee > 0 && (
                                                        <span className="text-purple-600 font-semibold text-sm">
                                                            Phí dịch vụ: {formatCurrency(booking.onSiteFee)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
