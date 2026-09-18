/**
 * Hai tab còn lại của màn đối soát (D04): lô COD chờ nộp và hàng đợi hoàn tiền.
 * Tách khỏi `reconciliation-page.tsx` để giữ mỗi tệp dưới 200 dòng.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Truck } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, DataTable, Money, QueryBoundary,
    Skeleton, StatusBadge, notify, type DataTableColumn,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePrompt } from '../../../context/ConfirmContext';
import {
    formatVnDateTime, reconciliationApi, type PaymentIntentRow, type RefundRow,
} from '../../../api/accounting';

export const CodTab = ({ active }: { active: boolean }) => {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<string[]>([]);
    const query = useQuery({
        queryKey: ['payments', 'cod', 'awaiting'],
        queryFn: () => reconciliationApi.payments({ provider: 'COD', status: 'Succeeded', pageSize: 100 }),
        enabled: active,
    });

    /* `GET /payments` has no `settlement` filter yet (integration request W3-13 #8),
       so the awaiting-remittance rows are picked out of the page client-side. */
    const rows = (query.data?.items ?? []).filter((p) => p.settlement === 'AwaitingRemittance');

    const columns: DataTableColumn<PaymentIntentRow>[] = [
        { id: 'paymentCode', header: 'Mã thanh toán', locked: true, cell: (r) => <span className="num">{r.paymentCode ?? r.externalId ?? r.id.slice(0, 8)}</span> },
        { id: 'createdAt', header: 'Ngày tạo', cell: (r) => <span className="num">{formatVnDateTime(r.createdAt)}</span> },
        { id: 'confirmedAt', header: 'Ngày thu', cell: (r) => <span className="num">{formatVnDateTime(r.confirmedAt)}</span> },
        { id: 'amount', header: 'Số tiền', align: 'right', cell: (r) => <Money value={r.amount} /> },
    ];

    const settle = async () => {
        try {
            await reconciliationApi.settleCod(selected);
            notify.success(`Đã ghi nhận nộp ${selected.length} khoản COD`);
            setSelected([]);
            queryClient.invalidateQueries({ queryKey: ['payments', 'cod'] });
        } catch {
            notify.error('Không ghi nhận được lô COD');
        }
    };

    return (
        <DataTable
            caption="COD đã thu chờ nộp về công ty"
            columns={columns}
            rows={query.isPending ? undefined : rows}
            rowKey={(r) => r.id}
            loading={query.isPending}
            error={query.error}
            onRetry={query.refetch}
            selectedIds={selected}
            onSelectionChange={setSelected}
            skeletonRows={6}
            empty={{ icon: Truck, title: 'Không có khoản COD nào chờ nộp', description: 'Shipper đã nộp đủ tiền cho mọi đơn COD đã thu.' }}
            bulkActions={(ids) => (
                <Can permission={PERMISSIONS.PAYMENTS_RECONCILE}>
                    <Button size="sm" onClick={settle}>Ghi nhận đã nộp {ids.length} khoản</Button>
                </Can>
            )}
        />
    );
};

export const RefundTab = ({ active }: { active: boolean }) => {
    const queryClient = useQueryClient();
    const { promptText } = usePrompt();
    const query = useQuery({
        queryKey: ['payments', 'refunds'],
        queryFn: () => reconciliationApi.refunds({ pageSize: 50 }),
        enabled: active,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payments', 'refunds'] });

    const approve = async (r: RefundRow) => {
        try { await reconciliationApi.approveRefund(r.id); notify.success('Đã duyệt yêu cầu hoàn tiền'); invalidate(); }
        catch { notify.error('Không duyệt được yêu cầu hoàn tiền'); }
    };

    const complete = async (r: RefundRow) => {
        const reference = await promptText({ title: 'Hoàn tất hoàn tiền', message: 'Nhập mã tham chiếu chuyển tiền (bắt buộc)', required: true });
        if (reference === null) return;
        try { await reconciliationApi.completeRefund(r.id, { reference }); notify.success('Đã hoàn tất hoàn tiền'); invalidate(); }
        catch { notify.error('Không hoàn tất được', { description: 'Yêu cầu phải được duyệt trước khi hoàn tất.' }); }
    };

    const reject = async (r: RefundRow) => {
        const reason = await promptText({ title: 'Từ chối hoàn tiền', message: 'Nhập lý do', required: true });
        if (reason === null) return;
        try { await reconciliationApi.rejectRefund(r.id, reason); notify.success('Đã từ chối yêu cầu'); invalidate(); }
        catch { notify.error('Không từ chối được yêu cầu'); }
    };

    const tone = (s: RefundRow['status']) =>
        s === 'Completed' ? 'success' : s === 'Rejected' || s === 'Failed' ? 'danger' : s === 'Approved' ? 'info' : 'warning';
    const label = (s: RefundRow['status']) =>
        ({ Requested: 'Chờ duyệt', Approved: 'Đã duyệt', Completed: 'Đã hoàn', Rejected: 'Từ chối', Failed: 'Thất bại' })[s];

    return (
        <Card>
            <CardHeader><CardTitle>Hàng đợi hoàn tiền</CardTitle></CardHeader>
            <CardBody>
                <QueryBoundary
                    query={query} errorTitle="Không tải được hàng đợi hoàn tiền"
                    skeleton={<Skeleton className="h-40 w-full" />}
                    isEmpty={(d) => d.items.length === 0}
                    empty={{ icon: HandCoins, title: 'Không có yêu cầu hoàn tiền nào', description: 'Yêu cầu hoàn tiền phát sinh khi khách trả hàng hoặc huỷ đơn đã thanh toán.' }}
                >
                    {(data) => (
                        <ul className="divide-y divide-line">
                            {data.items.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                    <div>
                                        <p className="flex items-center gap-2 font-medium text-fg">
                                            <Money value={r.amount} />
                                            <StatusBadge tone={tone(r.status)}>{label(r.status)}</StatusBadge>
                                        </p>
                                        <p className="text-xs text-fg-subtle">
                                            Yêu cầu {formatVnDateTime(r.requestedAt)}
                                            {r.reference ? ` · mã ${r.reference}` : ''}
                                        </p>
                                        {r.reason && <p className="text-sm text-fg-muted">{r.reason}</p>}
                                    </div>
                                    <Can permission={PERMISSIONS.PAYMENTS_REFUND}>
                                        <div className="flex gap-2">
                                            {r.status === 'Requested' && (
                                                <>
                                                    <Button size="sm" onClick={() => approve(r)}>Duyệt</Button>
                                                    <Button size="sm" variant="outline" onClick={() => reject(r)}>Từ chối</Button>
                                                </>
                                            )}
                                            {r.status === 'Approved' && (
                                                <Button size="sm" onClick={() => complete(r)}>Hoàn tất</Button>
                                            )}
                                        </div>
                                    </Can>
                                </li>
                            ))}
                        </ul>
                    )}
                </QueryBoundary>
            </CardBody>
        </Card>
    );
};
