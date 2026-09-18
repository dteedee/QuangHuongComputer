/**
 * Reception — bookings queue (W3-15 step 2). Approve/reject/convert a
 * `ServiceBooking` into a `WorkOrder`. Walk-in intake (customer lookup by
 * phone, deposit, printable receipt) needs a staff intake endpoint that does
 * not exist yet on the backend — see `docs/api-contracts/repair.md` "Known
 * gaps" and `integration-requests-w3.md` — so it is not faked here.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertCircle, Calendar, CheckCircle2, Clock, RefreshCw, User, Wrench, XCircle } from 'lucide-react';
import { repairApi, getTimeSlotLabel, type BookingStatus, type TimeSlot } from '../../../api/repair';
import { formatCurrency } from '../../../utils/format';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';

const STATUS_LABEL: Record<BookingStatus, string> = {
    Pending: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Rejected: 'Đã từ chối',
    Converted: 'Đã chuyển phiếu sửa',
};

const STATUS_CLS: Record<BookingStatus, string> = {
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-blue-100 text-blue-700',
    Rejected: 'bg-red-100 text-red-700',
    Converted: 'bg-emerald-100 text-emerald-700',
};

export default function BookingsQueuePage() {
    const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('Pending');
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const queryClient = useQueryClient();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['repair-bookings', statusFilter],
        queryFn: () => repairApi.admin.getAllBookings(1, 50, statusFilter || undefined),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => repairApi.admin.approveBooking(id),
        onSuccess: () => { toast.success('Đã duyệt yêu cầu'); void queryClient.invalidateQueries({ queryKey: ['repair-bookings'] }); },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Không duyệt được'),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => repairApi.admin.rejectBooking(id, reason),
        onSuccess: () => {
            toast.success('Đã từ chối yêu cầu');
            setRejectingId(null);
            setRejectReason('');
            void queryClient.invalidateQueries({ queryKey: ['repair-bookings'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Không từ chối được'),
    });

    const convertMutation = useMutation({
        mutationFn: (id: string) => repairApi.admin.convertBooking(id),
        onSuccess: (res) => {
            toast.success(`Đã tạo phiếu sửa ${res.ticketNumber}`);
            void queryClient.invalidateQueries({ queryKey: ['repair-bookings'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Không chuyển phiếu được'),
    });

    const bookings = data?.bookings ?? [];

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Hàng chờ đặt lịch sửa chữa</h1>
                    <p className="text-gray-500 text-sm mt-1">Duyệt / từ chối / chuyển thành phiếu sửa chữa</p>
                </div>
                <button onClick={() => void refetch()} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Làm mới
                </button>
            </div>

            <div className="flex gap-2">
                {(['Pending', 'Approved', 'Rejected', 'Converted', ''] as const).map(s => (
                    <button
                        key={s || 'all'}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {s ? STATUS_LABEL[s] : 'Tất cả'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-16 text-center text-gray-400">
                        <RefreshCw className="animate-spin inline-block mb-2" size={24} />
                        <p>Đang tải...</p>
                    </div>
                ) : isError ? (
                    <div className="p-16 text-center text-red-500">
                        <AlertCircle className="inline-block mb-2" size={24} />
                        <p>Không tải được danh sách đặt lịch.</p>
                        <button onClick={() => void refetch()} className="mt-3 text-sm underline">Thử lại</button>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="p-16 text-center text-gray-400">
                        <Calendar className="mx-auto mb-2 text-gray-300" size={32} />
                        <p>Không có yêu cầu đặt lịch nào.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {bookings.map((b: any) => (
                            <div key={b.id} className="p-5 flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-bold text-gray-900">{b.deviceModel}</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_CLS[b.status as BookingStatus]}`}>
                                            {STATUS_LABEL[b.status as BookingStatus]}
                                        </span>
                                        {b.serviceType === 'OnSite' && (
                                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">Tại nhà</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">{b.issueDescription}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><User size={12} /> {b.customerName || b.customerId}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {getTimeSlotLabel(b.timeSlot as TimeSlot)}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(b.preferredDate ?? b.createdAt).toLocaleDateString('vi-VN')}</span>
                                        {b.onSiteFee > 0 && <span>Phí tại nhà: {formatCurrency(b.onSiteFee)}</span>}
                                    </div>
                                </div>
                                {b.status === 'Pending' && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Can permission={PERMISSIONS.REPAIR_VIEW_ALL}>
                                            <button
                                                onClick={() => approveMutation.mutate(b.id)}
                                                disabled={approveMutation.isPending}
                                                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <CheckCircle2 size={14} /> Duyệt
                                            </button>
                                            <button
                                                onClick={() => setRejectingId(b.id)}
                                                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
                                            >
                                                <XCircle size={14} /> Từ chối
                                            </button>
                                        </Can>
                                    </div>
                                )}
                                {b.status === 'Approved' && (
                                    <Can permission={PERMISSIONS.REPAIR_VIEW_ALL}>
                                        <button
                                            onClick={() => convertMutation.mutate(b.id)}
                                            disabled={convertMutation.isPending}
                                            className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex-shrink-0"
                                        >
                                            <Wrench size={14} /> Tạo phiếu sửa
                                        </button>
                                    </Can>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Lý do từ chối</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Nhập lý do từ chối yêu cầu..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold">Hủy</button>
                            <button
                                onClick={() => rejectMutation.mutate({ id: rejectingId, reason: rejectReason })}
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                                className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
