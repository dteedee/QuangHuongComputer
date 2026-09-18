/**
 * All order-detail data + mutations in one hook (W3-10) — detail, legal
 * transitions, ship/cancel/COD/bank-transfer confirm, internal notes.
 * Every mutation invalidates both the detail and the list so the drawer and
 * the table never show stale state after an action.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import type { OrderStatus } from '../../../api/sales/types';
import { useConfirm, usePrompt } from '../../../context/ConfirmContext';
import type { ExtendedOrderStatus } from './order-state-machine';

export const useOrderDetailQuery = (orderId: string | null) =>
    useQuery({
        queryKey: ['admin-order-detail', orderId],
        queryFn: () => salesAdminOrdersApi.getDetail(orderId as string),
        enabled: !!orderId,
    });

export const useOrderTransitionsQuery = (orderId: string | null) =>
    useQuery({
        queryKey: ['admin-order-transitions', orderId],
        queryFn: () => salesAdminOrdersApi.getTransitions(orderId as string),
        enabled: !!orderId,
    });

/** Đọc lỗi 409/400 dạng RFC 9457 (`docs/api-conventions.md`) thành câu tiếng Việt hiển thị được. */
const extractErrorMessage = (err: any, fallback: string): string =>
    err?.response?.data?.error || err?.response?.data?.message || err?.response?.data?.detail || fallback;

export function useOrderActions(orderId: string | null) {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const { promptText } = usePrompt();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-order-detail', orderId] });
        queryClient.invalidateQueries({ queryKey: ['admin-order-transitions', orderId] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    };

    const transitionMutation = useMutation({
        mutationFn: (body: { to: ExtendedOrderStatus; reason?: string; trackingNumber?: string; carrier?: string }) =>
            salesAdminOrdersApi.transition(orderId as string, body as { to: OrderStatus; reason?: string; trackingNumber?: string; carrier?: string }),
        onSuccess: () => {
            invalidateAll();
            toast.success('Đã chuyển trạng thái đơn hàng!');
        },
        onError: (err: any) => toast.error(extractErrorMessage(err, 'Chuyển trạng thái thất bại — bước nhảy không hợp lệ')),
    });

    const cancelMutation = useMutation({
        mutationFn: (reason: string) => salesAdminOrdersApi.cancel(orderId as string, reason),
        onSuccess: () => {
            invalidateAll();
            toast.success('Đã huỷ đơn hàng!');
        },
        onError: (err: any) => toast.error(extractErrorMessage(err, 'Huỷ đơn thất bại!')),
    });

    const confirmCodMutation = useMutation({
        mutationFn: () => salesAdminOrdersApi.confirmCodCollected(orderId as string),
        onSuccess: () => {
            invalidateAll();
            toast.success('Đã ghi nhận thu COD!');
        },
        onError: (err: any) => toast.error(extractErrorMessage(err, 'Không có khoản COD đang chờ thu')),
    });

    const confirmBankTransferMutation = useMutation({
        mutationFn: ({ paymentId, bankReference }: { paymentId: string; bankReference: string }) =>
            salesAdminOrdersApi.confirmBankTransfer(paymentId, bankReference),
        onSuccess: () => {
            invalidateAll();
            toast.success('Đã xác nhận chuyển khoản!');
        },
        onError: (err: any) => toast.error(extractErrorMessage(err, 'Xác nhận chuyển khoản thất bại!')),
    });

    const addNoteMutation = useMutation({
        mutationFn: (note: string) => salesAdminOrdersApi.addNote(orderId as string, note),
        onSuccess: () => {
            invalidateAll();
            toast.success('Đã lưu ghi chú!');
        },
        onError: () => toast.error('Lưu ghi chú thất bại!'),
    });

    /** Xác nhận / Đóng gói / Đã giao / Hoàn tất — mọi bước không cần lý do, chỉ hỏi xác nhận. */
    const runSimpleTransition = async (to: ExtendedOrderStatus, label: string) => {
        const ok = await confirm({ title: `${label}?`, message: `Xác nhận chuyển đơn hàng sang trạng thái "${label}".`, variant: 'info' });
        if (ok) transitionMutation.mutate({ to });
    };

    /** Huỷ — bắt buộc lý do, dùng `usePrompt` thay native `window.prompt`. */
    const runCancel = async () => {
        const reason = await promptText({ title: 'Huỷ đơn hàng', message: 'Lý do huỷ đơn', placeholder: 'Nhập lý do…', required: true });
        if (reason) cancelMutation.mutate(reason);
    };

    return {
        transitionMutation,
        cancelMutation,
        confirmCodMutation,
        confirmBankTransferMutation,
        addNoteMutation,
        runSimpleTransition,
        runCancel,
    };
}
