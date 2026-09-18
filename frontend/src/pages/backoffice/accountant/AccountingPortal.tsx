/**
 * Cổng kế toán (W3-13).
 *
 * Lỗi cũ bị bịt ở đây: các ô KPI đọc `res.data` rồi `?? 0`, nên khi
 * `GET /accounting/stats` trả 500 thì màn hình vẫn hiện "0 ₫" — không phân biệt
 * được "không nợ" với "không đọc được". Mọi ô bây giờ đi qua `StatCard` với
 * `value={null}` khi query lỗi (hiện "—") kèm một dòng lỗi có nút thử lại,
 * đúng luật §4 của `docs/ui-kit-components.md`.
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Banknote, BarChart3, CreditCard, Clock, FileText, Receipt, ReceiptText, TrendingUp, Wallet,
} from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Money, PageHeader, QueryBoundary,
    StatCard, StatusBadge, Skeleton,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import {
    einvoiceApi, formatCurrency, formatVnDate, invoiceStatusLabel, invoicesApi, statsApi,
} from '../../../api/accounting';

/** KPI tiles take a preformatted string for money so the ₫ is never dropped. */
const money = (v: number | undefined, failed: boolean) => (failed || v === undefined ? null : formatCurrency(v));

const QUICK_LINKS = [
    { to: '/backoffice/accounting/invoices', label: 'Hoá đơn', description: 'Lập, phát hành và in hoá đơn', icon: FileText, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES },
    { to: '/backoffice/accounting/ar', label: 'Công nợ phải thu', description: 'Tuổi nợ và ghi nhận thu tiền', icon: TrendingUp, permission: PERMISSIONS.ACCOUNTING_MANAGE_DEBT },
    { to: '/backoffice/accounting/ap', label: 'Công nợ phải trả', description: 'Hoá đơn nhà cung cấp', icon: CreditCard, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES },
    { to: '/backoffice/accounting/cash-book', label: 'Sổ quỹ tiền mặt', description: 'Phiếu thu, phiếu chi, số dư', icon: Wallet, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES },
    { to: '/backoffice/accounting/shifts', label: 'Ca thu ngân', description: 'Đối soát quỹ từng ca', icon: Clock, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES },
    { to: '/backoffice/accounting/expenses', label: 'Chi phí', description: 'Duyệt và chi trả khoản chi', icon: Receipt, permission: PERMISSIONS.ACCOUNTING_MANAGE_EXPENSE },
    { to: '/backoffice/accounting/reconciliation', label: 'Đối soát thu tiền', description: 'Tiền về, COD và hoàn tiền', icon: Banknote, permission: PERMISSIONS.PAYMENTS_RECONCILE },
    { to: '/backoffice/accounting/einvoice', label: 'Hoá đơn điện tử', description: 'Hàng đợi chờ xuất HĐĐT', icon: ReceiptText, permission: PERMISSIONS.ACCOUNTING_VIEW_INVOICES },
    { to: '/backoffice/accounting/reports', label: 'Báo cáo tài chính', description: 'Dòng tiền, doanh thu - chi phí', icon: BarChart3, permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS },
    { to: '/backoffice/accounting/tax-reports', label: 'Báo cáo thuế', description: '8 biểu mẫu theo TT133', icon: FileText, permission: PERMISSIONS.ACCOUNTING_VIEW_REPORTS },
];

export const AccountingPortal = () => {
    const statsQuery = useQuery({ queryKey: ['accounting', 'stats'], queryFn: statsApi.get });
    const recentQuery = useQuery({
        queryKey: ['accounting', 'invoices', 'recent'],
        queryFn: () => invoicesApi.list({ page: 1, pageSize: 8, sortBy: 'issueDate', sortDir: 'desc' }),
    });
    const queueQuery = useQuery({
        queryKey: ['accounting', 'einvoice', 'queue', 'portal'],
        queryFn: () => einvoiceApi.queue({ page: 1, pageSize: 1, onlyLate: true }),
    });

    const s = statsQuery.data;
    const failed = statsQuery.isError;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Tài chính - Kế toán"
                description="Công nợ, quỹ tiền mặt, chi phí, hoá đơn và báo cáo thuế."
            />

            {failed && (
                <Card>
                    <CardBody className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-danger">
                            Không đọc được số liệu tổng quan. Các ô bên dưới hiện dấu "—" thay vì 0 để tránh hiểu nhầm.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => statsQuery.refetch()}>Thử lại</Button>
                    </CardBody>
                </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Doanh thu hôm nay" value={money(s?.revenueToday, failed)} icon={TrendingUp} />
                <StatCard label="Tổng phải thu" value={money(s?.totalReceivables, failed)} icon={FileText}
                    hint={failed ? undefined : <>Quá hạn: <Money value={s?.overdueReceivables ?? null} /></>} />
                <StatCard label="Tổng phải trả" value={money(s?.totalPayables, failed)} icon={CreditCard}
                    hint={failed ? undefined : <>Quá hạn: <Money value={s?.overduePayables ?? null} /></>} />
                <StatCard label="Hoá đơn bán ra" value={failed ? null : s?.totalReceivableInvoices ?? null} icon={Receipt}
                    hint={failed ? undefined : `${s?.totalPayableInvoices ?? 0} hoá đơn mua vào`} />
            </div>

            {queueQuery.data && queueQuery.data.total > 0 && (
                <Card>
                    <CardBody className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-fg">
                            <StatusBadge tone="warning">Chờ xuất HĐĐT</StatusBadge>{' '}
                            <span className="num">{queueQuery.data.total}</span> hoá đơn đã quá hạn xuất hoá đơn điện tử.
                        </p>
                        <Link to="/backoffice/accounting/einvoice"><Button size="sm" variant="outline">Xem hàng đợi</Button></Link>
                    </CardBody>
                </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_LINKS.map((link) => (
                    <Can key={link.to} permission={link.permission}>
                        <Link to={link.to} className="block focus-visible:outline-none">
                            <Card interactive className="h-full p-4">
                                <link.icon size={20} className="mb-2 text-fg-subtle" aria-hidden />
                                <p className="font-medium text-fg">{link.label}</p>
                                <p className="mt-0.5 text-sm text-fg-muted">{link.description}</p>
                            </Card>
                        </Link>
                    </Can>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Hoá đơn gần đây</CardTitle>
                    <Link to="/backoffice/accounting/invoices" className="text-sm text-brand-text">Xem tất cả</Link>
                </CardHeader>
                <CardBody>
                    <QueryBoundary
                        query={recentQuery}
                        inline
                        errorTitle="Không tải được hoá đơn gần đây"
                        skeleton={<div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
                        isEmpty={(d) => d.items.length === 0}
                        empty={{ icon: FileText, title: 'Chưa có hoá đơn nào', description: 'Hoá đơn sinh tự động khi đơn hàng được giao hoặc thanh toán.' }}
                    >
                        {(data) => (
                            <ul className="divide-y divide-line">
                                {data.items.map((inv) => (
                                    <li key={inv.id}>
                                        <Link
                                            to={`/backoffice/accounting/invoices/${inv.id}`}
                                            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm hover:bg-sunken"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="num font-medium text-fg">{inv.invoiceNumber}</span>
                                                <StatusBadge tone={invoiceStatusLabel[inv.status]?.tone ?? 'neutral'}>
                                                    {invoiceStatusLabel[inv.status]?.label ?? inv.status}
                                                </StatusBadge>
                                            </span>
                                            <span className="flex items-center gap-4">
                                                <span className="num text-fg-subtle">{formatVnDate(inv.issueDate)}</span>
                                                <Money value={inv.totalAmount} />
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </QueryBoundary>
                </CardBody>
            </Card>
        </div>
    );
};

export default AccountingPortal;
