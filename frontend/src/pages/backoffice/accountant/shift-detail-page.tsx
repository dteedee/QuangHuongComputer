/**
 * Chi tiết ca thu ngân + đối soát quỹ (W3-13) — contract §6.
 *
 * Reconciliation is shown exactly as the server stores it:
 *   expectedCash = openingBalance + Σthu − Σchi     variance = actualCash − expectedCash
 * The close dialog computes the same difference live so the cashier sees the
 * gap BEFORE confirming, and the reason box becomes required as soon as the
 * counted amount differs — the API answers 400 otherwise.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Money, PageHeader, QueryBoundary,
    Skeleton, StatusBadge, notify,
} from '../../../components/ui';
import { CrudFormDialog, MoneyField, SelectField, TextField } from '../../../components/form';
import { CloseShiftDialog, ShiftTransactions } from './shift-detail-parts';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { formatVnDateTime, shiftsApi } from '../../../api/accounting';
import { shiftTransactionSchema, type ShiftTransactionFormData } from './accounting-schemas';

export const ShiftDetailPage = () => {
    const { id = '' } = useParams<{ id: string }>();
    const [closeOpen, setCloseOpen] = useState(false);
    const [txOpen, setTxOpen] = useState(false);

    const query = useQuery({
        queryKey: ['accounting', 'shifts', 'detail', id],
        queryFn: () => shiftsApi.get(id),
        enabled: Boolean(id),
    });

    const approve = useMutation({
        mutationFn: (note: string | undefined) => shiftsApi.approveVariance(id, note),
        onSuccess: () => { notify.success('Đã duyệt chênh lệch quỹ'); query.refetch(); },
        onError: () => notify.error('Không duyệt được chênh lệch', {
            description: 'Người duyệt phải khác thu ngân của ca và cần quyền quản lý công nợ.',
        }),
    });

    return (
        <div className="space-y-5">
            <QueryBoundary
                query={query}
                errorTitle="Không tải được ca thu ngân"
                skeleton={<div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-64 w-full" /></div>}
            >
                {(shift) => (
                    <>
                        <PageHeader
                            title={`Ca ${formatVnDateTime(shift.openedAt)}`}
                            description={
                                <span className="flex flex-wrap items-center gap-2">
                                    {shift.status === 'Open'
                                        ? <StatusBadge tone="info">Đang mở</StatusBadge>
                                        : <StatusBadge tone="success">Đã chốt {formatVnDateTime(shift.closedAt)}</StatusBadge>}
                                    {shift.variance !== 0 && shift.status === 'Closed' && (
                                        shift.varianceApprovedAt
                                            ? <StatusBadge tone="success">Lệch đã duyệt</StatusBadge>
                                            : <StatusBadge tone="warning">Lệch chờ duyệt</StatusBadge>
                                    )}
                                </span>
                            }
                            breadcrumbs={[
                                { label: 'Tài chính', to: '/backoffice/accounting' },
                                { label: 'Ca thu ngân', to: '/backoffice/accounting/shifts' },
                                { label: 'Chi tiết ca' },
                            ]}
                            actions={
                                <div className="flex flex-wrap gap-2">
                                    {shift.status === 'Open' && (
                                        <Can permission={PERMISSIONS.SALES_POS}>
                                            <Button variant="outline" onClick={() => setTxOpen(true)}>Ghi thu / chi</Button>
                                            <Button onClick={() => setCloseOpen(true)}>
                                                <LockKeyhole size={16} aria-hidden /> Chốt ca
                                            </Button>
                                        </Can>
                                    )}
                                    {shift.status === 'Closed' && shift.variance !== 0 && !shift.varianceApprovedAt && (
                                        <Can permission={PERMISSIONS.ACCOUNTING_MANAGE_DEBT}>
                                            <Button loading={approve.isPending} onClick={() => approve.mutate(undefined)}>
                                                <CheckCircle2 size={16} aria-hidden /> Duyệt chênh lệch
                                            </Button>
                                        </Can>
                                    )}
                                </div>
                            }
                        />

                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card className="lg:col-span-1">
                                <CardHeader><CardTitle>Đối soát quỹ</CardTitle></CardHeader>
                                <CardBody className="space-y-2 text-sm">
                                    <ReconRow label="Tiền đầu ca" value={shift.openingBalance} />
                                    <ReconRow label="Tổng thu trong ca" value={shift.cashIn} />
                                    <ReconRow label="Tổng chi trong ca" value={-shift.cashOut} />
                                    <ReconRow label="Tiền phải có" value={shift.expectedCash} strong />
                                    <ReconRow label="Tiền đếm được" value={shift.closingBalance ?? null} strong />
                                    <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
                                        <span className="font-medium text-fg">Chênh lệch</span>
                                        <span className={shift.variance < 0 ? 'text-danger' : shift.variance > 0 ? 'text-warning' : 'text-success'}>
                                            <Money value={shift.status === 'Open' ? null : shift.variance} />
                                        </span>
                                    </div>
                                    {shift.varianceReason && (
                                        <p className="rounded-md bg-sunken p-2 text-fg-muted">Lý do: {shift.varianceReason}</p>
                                    )}
                                    {shift.status === 'Open' && (
                                        <p className="text-xs text-fg-subtle">
                                            Chênh lệch chỉ có sau khi chốt ca và đếm tiền thực tế.
                                        </p>
                                    )}
                                </CardBody>
                            </Card>

                            <Card className="lg:col-span-2">
                                <CardHeader><CardTitle>Giao dịch tiền mặt trong ca</CardTitle></CardHeader>
                                <CardBody className="overflow-x-auto">
                                    <ShiftTransactions shift={shift} />
                                </CardBody>
                            </Card>
                        </div>

                        <CloseShiftDialog
                            open={closeOpen} onOpenChange={setCloseOpen} shift={shift}
                            onClosed={() => query.refetch()}
                        />

                        <CrudFormDialog<ShiftTransactionFormData>
                            open={txOpen} onOpenChange={setTxOpen}
                            title="Ghi giao dịch tiền mặt"
                            description="Thu thêm vào két hoặc chi ra khỏi két trong ca."
                            schema={shiftTransactionSchema}
                            defaultValues={{ type: 'Credit', amount: 0, description: '', reference: '' }}
                            submitLabel="Ghi giao dịch"
                            knownFields={['type', 'amount', 'description', 'reference']}
                            onSubmit={async (data) => {
                                await shiftsApi.addTransaction(shift.id, {
                                    type: data.type, amount: data.amount,
                                    description: data.description, reference: data.reference || undefined,
                                });
                                notify.success('Đã ghi giao dịch');
                                setTxOpen(false);
                                query.refetch();
                            }}
                        >
                            {(form) => (
                                <>
                                    <SelectField
                                        name="type" control={form.control} label="Loại giao dịch"
                                        options={[{ value: 'Credit', label: 'Thu vào két' }, { value: 'Debit', label: 'Chi ra khỏi két' }]}
                                    />
                                    <MoneyField name="amount" control={form.control} label="Số tiền" />
                                    <TextField name="description" control={form.control} label="Diễn giải" required />
                                    <TextField name="reference" control={form.control} label="Chứng từ tham chiếu" />
                                </>
                            )}
                        </CrudFormDialog>
                    </>
                )}
            </QueryBoundary>
        </div>
    );
};

const ReconRow = ({ label, value, strong = false }: { label: string; value: number | null; strong?: boolean }) => (
    <div className="flex items-center justify-between gap-3">
        <span className={strong ? 'font-medium text-fg' : 'text-fg-muted'}>{label}</span>
        <Money value={value} className={strong ? 'font-semibold' : undefined} />
    </div>
);

export default ShiftDetailPage;
