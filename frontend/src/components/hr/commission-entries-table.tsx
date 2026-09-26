import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Undo2 } from 'lucide-react';
import { Button, DataTable, Dialog, IconButton, Input, RowActions, StatusBadge, formatDong, notify, type DataTableColumn } from '../ui';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import { commissionsApi, commissionErrorMessage, type CommissionEntryDto } from '../../api/hr/commissions';
import { commissionSourceLabel, commissionStatus } from './commission-status';

interface Props {
    rows: CommissionEntryDto[] | undefined;
    loading?: boolean;
    error?: unknown;
    onRetry?: () => void;
}

/** Sổ hoa hồng: chọn các khoản chờ duyệt để duyệt hàng loạt; huỷ từng khoản kèm lý do. */
export function CommissionEntriesTable({ rows, loading, error, onRetry }: Props) {
    const qc = useQueryClient();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission(PERMISSIONS.HR_MANAGE_PAYROLL);
    const [selected, setSelected] = useState<string[]>([]);
    const [reversing, setReversing] = useState<CommissionEntryDto | null>(null);
    const [reason, setReason] = useState('');

    const refresh = () => qc.invalidateQueries({ queryKey: ['hr-commissions'] });

    const approveMut = useMutation({
        mutationFn: (ids: string[]) => commissionsApi.approve(ids),
        onSuccess: (r) => {
            notify.success(`Đã duyệt ${r.approved} khoản`);
            setSelected([]);
            refresh();
        },
        onError: (e) => notify.error(commissionErrorMessage(e, 'Không duyệt được')),
    });

    const reverseMut = useMutation({
        mutationFn: ({ id, why }: { id: string; why: string }) => commissionsApi.reverse(id, why),
        onSuccess: (r) => {
            notify.success('Đã huỷ khoản hoa hồng', r.payrollNeedsRecalculation
                ? { description: 'Khoản này đã vào bảng lương nháp — hãy tính lại kỳ lương.' }
                : undefined);
            setReversing(null);
            setReason('');
            refresh();
        },
        onError: (e) => notify.error(commissionErrorMessage(e, 'Không huỷ được')),
    });

    const pendingIds = new Set((rows ?? []).filter((r) => r.status === 'Pending').map((r) => r.id));

    const columns: DataTableColumn<CommissionEntryDto>[] = [
        { id: 'employee', header: 'Nhân viên', cell: (r) => <span className="font-medium">{r.employeeName}</span> },
        {
            id: 'source', header: 'Chứng từ',
            cell: (r) => <span className="num">{commissionSourceLabel(r.sourceType)} · {r.sourceReference}</span>,
        },
        { id: 'earnedAt', header: 'Ngày', nowrap: true, cell: (r) => new Date(r.earnedAt).toLocaleDateString('vi-VN') },
        { id: 'base', header: 'Căn cứ (công + DV)', align: 'right', cell: (r) => <span className="num">{formatDong(r.baseAmount)} ₫</span> },
        {
            id: 'rate', header: 'Mức', align: 'right',
            cell: (r) => <span className="num">{r.ratePercent}%{r.fixedAmount ? ` + ${formatDong(r.fixedAmount)} ₫` : ''}</span>,
        },
        { id: 'amount', header: 'Hoa hồng', align: 'right', cell: (r) => <span className="num font-semibold">{formatDong(r.amount)} ₫</span> },
        { id: 'status', header: 'Trạng thái', align: 'center', cell: (r) => <StatusBadge {...commissionStatus(r.status)} /> },
        {
            id: 'actions', header: '', width: '1%', locked: true,
            cell: (r) => canManage && (r.status === 'Pending' || r.status === 'Approved') ? (
                <RowActions>
                    <IconButton aria-label="Huỷ khoản này" size="sm" variant="danger" onClick={() => setReversing(r)}>
                        <Undo2 size={16} />
                    </IconButton>
                </RowActions>
            ) : null,
        },
    ];

    return (
        <>
            <DataTable
                density="compact"
                caption="Sổ hoa hồng kỹ thuật"
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                loading={loading}
                error={error}
                onRetry={onRetry}
                selectedIds={canManage ? selected : undefined}
                onSelectionChange={canManage ? (ids) => setSelected(ids.filter((id) => pendingIds.has(id))) : undefined}
                bulkActions={(ids) => (
                    <Button size="sm" icon={CheckCheck} loading={approveMut.isPending} onClick={() => approveMut.mutate(ids)}>
                        Duyệt {ids.length} khoản
                    </Button>
                )}
                empty={{ title: 'Chưa có hoa hồng trong kỳ', description: 'Bấm "Đối soát kỳ" để quét lại các phiếu sửa đã thu tiền.' }}
            />

            <Dialog
                open={reversing !== null}
                onOpenChange={(open) => { if (!open) setReversing(null); }}
                title="Huỷ khoản hoa hồng"
                description={reversing ? `${reversing.employeeName} · ${reversing.sourceReference} · ${formatDong(reversing.amount)} ₫` : undefined}
                footer={(
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setReversing(null)}>Đóng</Button>
                        <Button
                            size="sm"
                            variant="danger"
                            disabled={!reason.trim()}
                            loading={reverseMut.isPending}
                            onClick={() => reversing && reverseMut.mutate({ id: reversing.id, why: reason.trim() })}
                        >
                            Huỷ khoản
                        </Button>
                    </>
                )}
            >
                <Input label="Lý do huỷ" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: phân công nhầm kỹ thuật viên" />
            </Dialog>
        </>
    );
}
