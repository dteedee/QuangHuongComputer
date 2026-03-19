import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi, type WorkOrder, type WorkOrderStatus, getStatusColor } from '../api/repair';
import { formatCurrency } from '../utils/format';
import { Clock, CheckCircle, XCircle, Play, AlertCircle, FileText, Wrench, ChevronRight } from 'lucide-react';

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
            return <Clock size={16} />;
        case 'InProgress':
        case 'Diagnosed':
            return <Play size={16} />;
        case 'Completed':
        case 'Approved':
            return <CheckCircle size={16} />;
        case 'Cancelled':
        case 'Rejected':
        case 'Declined':
            return <XCircle size={16} />;
        case 'AwaitingApproval':
        case 'Quoted':
            return <FileText size={16} />;
        case 'OnHold':
            return <AlertCircle size={16} />;
        default:
            return <Wrench size={16} />;
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

    // Get work orders
    const { data: workOrders, isLoading: loadingWorkOrders } = useQuery<WorkOrder[]>({
        queryKey: ['my-work-orders'],
        queryFn: repairApi.workOrders.getMyWorkOrders,
        enabled: isAuthenticated
    });

    // Get bookings
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
        createRepair.mutate({ deviceModel, serialNumber, description: issueDescription });
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-32 text-center animate-fade-in font-sans">
                <div className="bg-white p-16 max-w-2xl mx-auto rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase italic tracking-tighter">
                        Vui lòng <span className="text-[#D70018]">Đăng nhập</span>
                    </h2>
                    <p className="text-gray-500 font-medium mb-10 italic">
                        Bạn cần đăng nhập để đặt lịch sửa chữa và theo dõi tiến độ.
                    </p>
                    <Link to="/login" className="inline-block px-10 py-4 bg-[#D70018] text-white font-black rounded-2xl hover:bg-[#b00014] transition shadow-lg shadow-red-600/20 uppercase tracking-widest text-[10px] active:scale-95">
                        Đăng nhập ngay
                    </Link>
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
        <div className="container mx-auto px-4 py-12 max-w-6xl font-sans">
            <h2 className="text-4xl font-black text-gray-900 mb-12 uppercase italic tracking-tighter">
                Dịch vụ <span className="text-[#D70018]">Sửa chữa</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Options */}
                <div className="space-y-6">
                    {/* Quick Create Form */}
                    <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100">
                        <h3 className="text-xl font-black text-blue-600 mb-6 uppercase italic tracking-tighter">
                            Gửi yêu cầu nhanh
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">
                                    Tên thiết bị / Model
                                </label>
                                <input
                                    value={deviceModel}
                                    onChange={e => setDeviceModel(e.target.value)}
                                    className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                                    placeholder="Ví dụ: Dell XPS 15"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">
                                    Số Serial (S/N)
                                </label>
                                <input
                                    value={serialNumber}
                                    onChange={e => setSerialNumber(e.target.value)}
                                    className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                                    placeholder="Ví dụ: SN123456"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">
                                    Mô tả tình trạng
                                </label>
                                <textarea
                                    value={issueDescription}
                                    onChange={e => setIssueDescription(e.target.value)}
                                    className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner min-h-[100px] resize-none"
                                    placeholder="Thiết bị của bạn đang gặp vấn đề gì?"
                                    required
                                />
                            </div>
                            {success && (
                                <p className="text-emerald-600 text-xs font-black italic uppercase">
                                    Đã gửi yêu cầu thành công!
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={createRepair.isPending}
                                className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50"
                            >
                                {createRepair.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </button>
                        </form>
                    </div>

                    {/* Book Service Button */}
                    <Link
                        to="/booking"
                        className="block bg-gradient-to-br from-[#D70018] to-red-700 p-8 rounded-[32px] shadow-xl shadow-red-500/20 text-white hover:shadow-2xl hover:shadow-red-500/30 transition-all group"
                    >
                        <h3 className="text-xl font-black mb-2 uppercase italic tracking-tighter flex items-center gap-2">
                            Đặt lịch dịch vụ
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </h3>
                        <p className="text-red-100 text-sm font-medium italic">
                            Đặt lịch sửa chữa tại cửa hàng hoặc tại nhà với nhiều tùy chọn
                        </p>
                    </Link>
                </div>

                {/* Repair History */}
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">
                        Lịch sử sửa chữa
                    </h3>

                    {isLoading ? (
                        <div className="text-center text-gray-400 font-bold py-10 italic">
                            Đang tải dữ liệu...
                        </div>
                    ) : allItems.length === 0 ? (
                        <div className="bg-white p-12 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">
                            Chưa có dữ liệu sửa chữa.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {allItems.map(item => {
                                if (item.type === 'workorder') {
                                    const repair = item.data as WorkOrder;
                                    const needsAction = repair.status === 'AwaitingApproval' || repair.status === 'Quoted';

                                    return (
                                        <div
                                            key={`wo-${repair.id}`}
                                            className={`bg-white p-8 rounded-[32px] border transition-all shadow-lg shadow-gray-200/20 group cursor-pointer hover:shadow-xl ${needsAction ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100 hover:border-[#D70018]/30'
                                                }`}
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            {needsAction && (
                                                <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2">
                                                    <AlertCircle size={16} className="text-amber-600" />
                                                    <span className="text-amber-700 text-xs font-bold uppercase tracking-wider">
                                                        Cần xác nhận báo giá
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-50">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">
                                                            {repair.deviceModel}
                                                        </h4>
                                                        <span className="px-2 py-0.5 bg-gray-900 text-white text-[9px] font-black rounded uppercase">
                                                            {repair.ticketNumber}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 italic">
                                                        S/N: {repair.serialNumber || 'N/A'}
                                                    </p>
                                                </div>
                                                <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic border ${getStatusColor(repair.status)}`}>
                                                    {getStatusIcon(repair.status)}
                                                    {translateStatus(repair.status)}
                                                </span>
                                            </div>

                                            <p className="text-gray-600 text-sm font-medium mb-6 italic leading-relaxed line-clamp-2">
                                                {repair.description}
                                            </p>

                                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-widest italic border-t border-gray-50 pt-6">
                                                <span>Ngày đặt: {new Date(repair.createdAt).toLocaleDateString('vi-VN')}</span>
                                                {repair.totalCost > 0 && (
                                                    <span className="text-[#D70018] text-sm">
                                                        {formatCurrency(repair.totalCost)}
                                                    </span>
                                                )}
                                            </div>

                                            {repair.technicalNotes && (
                                                <div className="mt-6 p-5 bg-gray-50 rounded-2xl text-xs text-gray-500 border border-gray-100 italic">
                                                    <strong className="text-gray-900 font-black uppercase tracking-widest text-[9px] mb-1 block">
                                                        Ghi chú kỹ thuật:
                                                    </strong>
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
                                            className="bg-white p-8 rounded-[32px] border border-purple-200 hover:border-purple-400 transition-all shadow-lg shadow-gray-200/20 group"
                                        >
                                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-50">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">
                                                            {booking.deviceModel}
                                                        </h4>
                                                        <span className="px-2 py-0.5 bg-purple-600 text-white text-[9px] font-black rounded uppercase">
                                                            Đặt lịch
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 italic">
                                                        {booking.serviceType === 'OnSite' ? 'Sửa tại nhà' : 'Sửa tại cửa hàng'}
                                                    </p>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic border ${booking.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
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

                                            <p className="text-gray-600 text-sm font-medium mb-6 italic leading-relaxed line-clamp-2">
                                                {booking.issueDescription}
                                            </p>

                                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-widest italic">
                                                <span>Ngày hẹn: {new Date(booking.preferredDate).toLocaleDateString('vi-VN')}</span>
                                                {booking.onSiteFee > 0 && (
                                                    <span className="text-purple-600 text-sm">
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
    );
};
