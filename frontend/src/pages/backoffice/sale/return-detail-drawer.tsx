/**
 * Xử lý một yêu cầu đổi trả: duyệt / từ chối (có lý do) / kiểm hàng nhận về / hoàn tất.
 * Thứ tự bắt buộc của backend: phải `inspect` trước khi `complete` (chống gian lận hoàn tiền);
 * `complete` nhập lại kho, tính tiền hoàn theo D08/D01 và ĐẢO điểm thưởng của đơn.
 * Không dùng `confirm()`/`prompt()` gốc trình duyệt — dùng `useConfirm` của kit.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Drawer, ErrorState, Money, Select, Skeleton, Textarea, notify } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { useConfirm } from '../../../context/ConfirmContext';
import { salesReturnsAdminApi } from '../../../api/sales/returns-admin';
import { inventoryApi } from '../../../api/inventory';
import type { ReceivedCondition } from '../../../api/sales/types';
import type { AdminReturnRow } from './returns-page';

const CONDITION_LABELS: Record<ReceivedCondition, string> = {
    Intact: 'Nguyên vẹn',
    UsedGood: 'Đã dùng, còn tốt',
    DefectiveTechnical: 'Lỗi kỹ thuật',
    UserDamage: 'Khách làm hỏng',
    MissingAccessories: 'Thiếu phụ kiện',
};

interface ReturnDetailDrawerProps {
    request: AdminReturnRow | null;
    onOpenChange: (open: boolean) => void;
    onChanged: () => void;
}

export default function ReturnDetailDrawer({ request, onOpenChange, onChanged }: ReturnDetailDrawerProps) {
    const confirm = useConfirm();
    const [busy, setBusy] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [condition, setCondition] = useState<ReceivedCondition>('Intact');
    const [warehouseId, setWarehouseId] = useState('');
    const [inspectNotes, setInspectNotes] = useState('');

    const detailQuery = useQuery({
        queryKey: ['sales', 'admin-return', request?.id],
        queryFn: () => salesReturnsAdminApi.adminGetById(request!.id),
        enabled: !!request,
    });

    const warehousesQuery = useQuery({
        queryKey: ['inventory', 'warehouse-dropdown'],
        queryFn: () => inventoryApi.warehouses.getDropdown(),
        enabled: !!request,
        staleTime: 5 * 60 * 1000,
    });

    const detail = (detailQuery.data ?? request) as AdminReturnRow | undefined;

    const run = async (label: string, fn: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await fn();
            notify.success(label);
            onChanged();
            detailQuery.refetch();
        } catch (err) {
            notify.error(`${label} không thành công`, {
                description: (err as { normalized?: { message?: string } })?.normalized?.message,
            });
        } finally {
            setBusy(false);
        }
    };

    const approve = async () => {
        if (!request) return;
        const ok = await confirm({ message: 'Duyệt yêu cầu đổi trả này?', variant: 'warning' });
        if (ok) await run('Đã duyệt yêu cầu', () => salesReturnsAdminApi.approve(request.id));
    };

    const reject = async () => {
        if (!request || !rejectReason.trim()) return;
        await run('Đã từ chối yêu cầu', () => salesReturnsAdminApi.reject(request.id, rejectReason.trim()));
        setRejectReason('');
    };

    const inspect = async () => {
        if (!request || !warehouseId) return;
        await run('Đã ghi nhận kiểm hàng', () => salesReturnsAdminApi.inspect(request.id, {
            condition, warehouseId, notes: inspectNotes.trim() || undefined,
        }));
    };

    const complete = async () => {
        if (!request) return;
        const ok = await confirm({
            message: 'Hoàn tất yêu cầu: nhập lại kho, hoàn tiền theo chính sách và thu hồi điểm thưởng của đơn?',
            variant: 'danger',
        });
        if (ok) await run('Đã hoàn tất đổi trả', () => salesReturnsAdminApi.complete(request.id));
    };

    const canInspect = detail?.status === 'Approved' && !detail?.inspectedAt;
    const canComplete = !!detail?.inspectedAt && detail?.status !== 'Completed' && detail?.status !== 'Refunded';

    return (
        <Drawer open={!!request} onOpenChange={onOpenChange} side="right" title="Chi tiết yêu cầu đổi trả">
            {detailQuery.isPending && <Skeleton className="h-40 w-full" />}
            {detailQuery.isError && <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} inline />}

            {detail && (
                <div className="space-y-4">
                    <div className="space-y-1 text-sm">
                        <p className="num text-xs text-fg-subtle">{detail.id}</p>
                        <p><span className="text-fg-muted">Lý do: </span>{detail.reason}</p>
                        {detail.description && <p className="text-fg-muted">{detail.description}</p>}
                        <p className="flex items-center gap-2">
                            <span className="text-fg-muted">Tiền hoàn dự kiến:</span>
                            <Money value={detail.refundAmount ?? null} />
                        </p>
                        {detail.receivedCondition && (
                            <Badge variant="info">Tình trạng nhận về: {CONDITION_LABELS[detail.receivedCondition]}</Badge>
                        )}
                    </div>

                    <Can permission={PERMISSIONS.SALES_MANAGE_RETURNS}>
                        <div className="space-y-4 border-t border-line pt-4">
                            {detail.status === 'Pending' && (
                                <div className="space-y-2">
                                    <Button onClick={approve} loading={busy}>Duyệt yêu cầu</Button>
                                    <Textarea
                                        label="Lý do từ chối"
                                        rows={2}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                    <Button variant="danger" onClick={reject} disabled={!rejectReason.trim() || busy}>
                                        Từ chối
                                    </Button>
                                </div>
                            )}

                            {canInspect && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Kiểm hàng nhận về</p>
                                    <Select
                                        label="Tình trạng"
                                        value={condition}
                                        onChange={(e) => setCondition(e.target.value as ReceivedCondition)}
                                        options={Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))}
                                    />
                                    <Select
                                        label="Kho nhập lại"
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                        options={[{ value: '', label: '— Chọn kho —' },
                                            ...(warehousesQuery.data ?? []).map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))]}
                                    />
                                    <Textarea label="Ghi chú kiểm hàng" rows={2} value={inspectNotes} onChange={(e) => setInspectNotes(e.target.value)} />
                                    <Button onClick={inspect} disabled={!warehouseId || busy} loading={busy}>Lưu kiểm hàng</Button>
                                </div>
                            )}

                            {canComplete && (
                                <Button variant="danger" onClick={complete} loading={busy}>Hoàn tất + hoàn tiền</Button>
                            )}

                            {!canInspect && !canComplete && detail.status !== 'Pending' && (
                                <p className="text-sm text-fg-muted">Không còn thao tác nào ở trạng thái này.</p>
                            )}
                        </div>
                    </Can>
                </div>
            )}
        </Drawer>
    );
}
