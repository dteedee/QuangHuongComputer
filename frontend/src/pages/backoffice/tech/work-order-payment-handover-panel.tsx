/**
 * Payment + handover panel (W3-15 step 4 / success criteria: "is completed,
 * paid and handed over — all from the UI"). Wired to the W2-13 endpoints
 * `docs/api-contracts/repair.md` added: ready-for-pickup, pay, handover.
 * No native `prompt()` — receiver name is a controlled input, per standing rule.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PackageCheck, CreditCard, HandCoins, ClipboardCheck } from 'lucide-react';
import { repairApi, type WorkOrder } from '../../../api/repair';

export function WorkOrderPaymentHandoverPanel({ workOrder, workOrderId, refetch }: {
    workOrder: WorkOrder;
    workOrderId: string;
    refetch: () => void;
}) {
    const queryClient = useQueryClient();
    const [paymentReference, setPaymentReference] = useState('');
    const [receivedByName, setReceivedByName] = useState('');

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: ['tech-work-order', workOrderId] });
        refetch();
    };

    const readyMutation = useMutation({
        mutationFn: () => repairApi.admin.readyForPickup(workOrderId),
        onSuccess: () => { toast.success('Đã đánh dấu sẵn sàng trả máy'); invalidate(); },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Có lỗi xảy ra'),
    });

    const payMutation = useMutation({
        mutationFn: () => repairApi.admin.pay(workOrderId, paymentReference || undefined),
        onSuccess: () => { toast.success('Đã ghi nhận thanh toán'); invalidate(); },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Có lỗi xảy ra'),
    });

    const handoverMutation = useMutation({
        mutationFn: () => repairApi.admin.handover(workOrderId, receivedByName),
        onSuccess: () => { toast.success('Đã trả máy cho khách'); invalidate(); },
        onError: (err: any) => toast.error(err?.response?.data?.error || 'Có lỗi xảy ra'),
    });

    if (!['Completed', 'ReadyForPickup', 'Paid', 'Delivered'].includes(workOrder.status)) return null;

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <HandCoins size={20} className="text-accent" />
                Thanh toán &amp; trả máy
            </h2>

            {workOrder.status === 'Completed' && (
                <button
                    onClick={() => readyMutation.mutate()}
                    disabled={readyMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50"
                >
                    <PackageCheck size={18} /> Sẵn sàng trả máy
                </button>
            )}

            {workOrder.status === 'ReadyForPickup' && (
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">Mã tham chiếu thanh toán (tuỳ chọn)</label>
                    <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Số hoá đơn / mã giao dịch..."
                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-accent"
                    />
                    <button
                        onClick={() => payMutation.mutate()}
                        disabled={payMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-lime-600 text-white rounded-xl font-bold hover:bg-lime-700 disabled:opacity-50"
                    >
                        <CreditCard size={18} /> Ghi nhận đã thanh toán
                    </button>
                </div>
            )}

            {workOrder.status === 'Paid' && (
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">Tên người nhận máy *</label>
                    <input
                        type="text"
                        value={receivedByName}
                        onChange={(e) => setReceivedByName(e.target.value)}
                        placeholder="Tên khách hàng / người nhận thay..."
                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-accent"
                    />
                    <button
                        onClick={() => handoverMutation.mutate()}
                        disabled={!receivedByName.trim() || handoverMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <ClipboardCheck size={18} /> Xác nhận trả máy
                    </button>
                </div>
            )}

            {workOrder.status === 'Delivered' && (
                <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">
                    Đã trả máy{workOrder.handoverReceivedByName ? ` cho ${workOrder.handoverReceivedByName}` : ''}
                    {workOrder.handoverAt ? ` lúc ${new Date(workOrder.handoverAt).toLocaleString('vi-VN')}` : ''}.
                </div>
            )}
        </div>
    );
}

export default WorkOrderPaymentHandoverPanel;
