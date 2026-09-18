/**
 * Đối soát thu tiền (D04) — ba việc của kế toán mỗi ngày:
 *  1. Tiền về ngân hàng chưa gán đơn: nếu có GỢI Ý khớp số tiền trong cửa sổ
 *     giữ chỗ thì kế toán phải BẤM ĐỒNG Ý, hệ thống không bao giờ tự gán.
 *  2. Tích lô các đơn COD đã thu để ghi nhận đã nộp về công ty.
 *  3. Hàng đợi hoàn tiền: duyệt, hoàn tất (bắt buộc có mã tham chiếu), từ chối.
 *
 * Contract: `docs/api-contracts/payments.md` §5. Quyền: `Payments.Reconcile`
 * cho mục 1-2, `Payments.Refund` cho mục 3.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Check } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Money, PageHeader,
    QueryBoundary, Skeleton, StatusBadge, Tab, TabList, TabPanel, Tabs, notify,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { formatVnDateTime, reconciliationApi, type UnassignedTransaction } from '../../../api/accounting';
import { CodTab, RefundTab } from './reconciliation-tabs';

type TabKey = 'bank' | 'cod' | 'refunds';

export const ReconciliationPage = () => {
    const [tab, setTab] = useState<TabKey>('bank');

    return (
        <div className="space-y-5">
            <PageHeader
                title="Đối soát thu tiền"
                description="Tiền về ngân hàng chưa gán đơn, COD đã thu chờ nộp, và hàng đợi hoàn tiền."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Đối soát thu tiền' }]}
            />
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
                <TabList>
                    <Tab value="bank">Tiền về chưa gán</Tab>
                    <Tab value="cod">COD chờ nộp</Tab>
                    <Tab value="refunds">Hoàn tiền</Tab>
                </TabList>
                <div className="pt-4">
                    <TabPanel value="bank"><BankTab active={tab === 'bank'} /></TabPanel>
                    <TabPanel value="cod"><CodTab active={tab === 'cod'} /></TabPanel>
                    <TabPanel value="refunds"><RefundTab active={tab === 'refunds'} /></TabPanel>
                </div>
            </Tabs>
        </div>
    );
};

const BankTab = ({ active }: { active: boolean }) => {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['payments', 'reconciliation', 'unassigned'],
        queryFn: reconciliationApi.unassigned,
        enabled: active,
    });

    const accept = async (row: UnassignedTransaction) => {
        if (!row.suggestion) return;
        try {
            await reconciliationApi.assign({ transactionId: row.transactionId, paymentId: row.suggestion.paymentId });
            notify.success('Đã gán giao dịch vào đơn thanh toán');
            queryClient.invalidateQueries({ queryKey: ['payments', 'reconciliation'] });
        } catch {
            notify.error('Không gán được giao dịch', { description: 'Đơn thanh toán không còn ở trạng thái chờ hoặc số tiền không khớp.' });
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Giao dịch ngân hàng chưa gán đơn</CardTitle></CardHeader>
            <CardBody>
                <QueryBoundary
                    query={query} errorTitle="Không tải được danh sách giao dịch chưa gán"
                    skeleton={<Skeleton className="h-40 w-full" />}
                    isEmpty={(d) => d.length === 0}
                    empty={{ icon: Banknote, title: 'Không còn giao dịch nào chờ gán', description: 'Mọi khoản tiền về đều đã khớp đơn hàng.' }}
                >
                    {(rows) => (
                        <ul className="divide-y divide-line">
                            {rows.map((row) => (
                                <li key={row.transactionId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                    <div>
                                        <p className="font-medium text-fg"><Money value={row.amount} /></p>
                                        <p className="text-xs text-fg-subtle">
                                            {formatVnDateTime(row.receivedAt)}
                                            {row.bankReference ? ` · ${row.bankReference}` : ''}
                                        </p>
                                        {row.content && <p className="text-sm text-fg-muted">{row.content}</p>}
                                    </div>
                                    {row.suggestion ? (
                                        <div className="flex items-center gap-2">
                                            <StatusBadge tone="info">Gợi ý khớp số tiền</StatusBadge>
                                            <span className="num text-sm text-fg-muted">{row.suggestion.paymentCode ?? row.suggestion.paymentId.slice(0, 8)}</span>
                                            <Can permission={PERMISSIONS.PAYMENTS_RECONCILE}>
                                                <Button size="sm" onClick={() => accept(row)}>
                                                    <Check size={14} aria-hidden /> Đồng ý gán
                                                </Button>
                                            </Can>
                                        </div>
                                    ) : (
                                        <StatusBadge tone="neutral">Chưa có gợi ý</StatusBadge>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </QueryBoundary>
            </CardBody>
        </Card>
    );
};

export default ReconciliationPage;
