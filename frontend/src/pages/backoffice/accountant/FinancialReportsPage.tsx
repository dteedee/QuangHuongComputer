/**
 * Báo cáo tài chính (W3-13) — `docs/api-contracts/reporting.md` §2.
 *
 * Trang cũ dùng `data?.x ?? 0` ở mọi chỗ nên khi API trả 400/500 nó vẫn vẽ biểu
 * đồ rỗng và các ô 0 ₫. Bây giờ mỗi khối nằm trong `QueryBoundary` riêng: khối
 * nào hỏng thì khối đó hiện lỗi + nút thử lại, các khối còn lại vẫn dùng được.
 *
 * Giá vốn của `/profit-margin` là số ƯỚC TÍNH (`isEstimate: true` — không có
 * ảnh chụp giá vốn theo từng lần bán), nên mọi con số lợi nhuận ở đây đều đeo
 * nhãn "ước tính" đúng như hợp đồng ghi.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, TrendingUp } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Input, Money, PageHeader,
    QueryBoundary, Skeleton, StatCard, StatusBadge, Table, TBody, Td, Th, THead, Tr, notify,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { financialApi, getProfitMarginReport } from '../../../api/reporting';
import { formatCurrency, toVnDateInput } from '../../../api/accounting';
import { CashFlowChart, RevenueExpenseChart } from './financial-report-charts';

/**
 * `getProfitMarginReport` in `api/reporting.ts` (not owned by this track) is
 * untyped. Shape below is the documented response of `GET /reports/profit-margin`
 * (reporting contract §1) — `isEstimate` is always true today.
 */
interface ProfitMarginReport {
    products: {
        productId: string; productName: string; revenue: number; totalCost: number;
        profit: number; marginPercent: number; unitsSold: number; isEstimate: boolean;
    }[];
    totalRevenue: number;
    isEstimate: boolean;
}

export function FinancialReportsPage() {
    const today = new Date();
    const [range, setRange] = useState({
        startDate: toVnDateInput(new Date(today.getFullYear(), today.getMonth() - 11, 1)),
        endDate: toVnDateInput(today),
    });
    const [exporting, setExporting] = useState(false);

    const cashFlowQuery = useQuery({
        queryKey: ['reports', 'cash-flow', range],
        queryFn: () => financialApi.getCashFlow(range.startDate, range.endDate),
    });
    const revExpQuery = useQuery({
        queryKey: ['reports', 'revenue-expense', range],
        queryFn: () => financialApi.getRevenueExpense(range.startDate, range.endDate),
    });
    const marginQuery = useQuery({
        queryKey: ['reports', 'profit-margin', range],
        queryFn: (): Promise<ProfitMarginReport> => getProfitMarginReport(range.startDate, range.endDate),
    });

    const exportReport = async () => {
        setExporting(true);
        try {
            await financialApi.exportFinancialReport(range.startDate, range.endDate);
            notify.success('Đã tải báo cáo tài chính');
        } catch {
            notify.error('Không xuất được báo cáo');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Báo cáo tài chính"
                description="Dòng tiền, doanh thu - chi phí và biên lợi nhuận theo kỳ."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Báo cáo tài chính' }]}
                actions={
                    <Can permission={PERMISSIONS.ACCOUNTING_EXPORT}>
                        <Button variant="outline" loading={exporting} onClick={exportReport}>
                            <Download size={16} aria-hidden /> Xuất Excel
                        </Button>
                    </Can>
                }
            />

            <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Input label="Từ ngày" type="date" value={range.startDate}
                        onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="sm:w-48" />
                    <Input label="Đến ngày" type="date" value={range.endDate}
                        onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="sm:w-48" />
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Dòng tiền</CardTitle></CardHeader>
                <CardBody>
                    <QueryBoundary query={cashFlowQuery} errorTitle="Không tải được báo cáo dòng tiền"
                        skeleton={<Skeleton className="h-64 w-full" />}>
                        {(cf) => (
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <StatCard label="Tiền thu vào" value={formatCurrency(cf.totalInflows)} />
                                    <StatCard label="Tiền chi ra" value={formatCurrency(cf.totalOutflows)} />
                                    <StatCard label="Dòng tiền thuần" value={formatCurrency(cf.netCashFlow)} icon={TrendingUp} />
                                </div>
                                <CashFlowChart inflows={cf.monthlyInflows} outflows={cf.monthlyOutflows} />
                                <p className="text-xs text-fg-subtle">
                                    Thu từ hoá đơn bán đã thu tiền, chi từ hoá đơn mua và khoản chi đã chi trả.
                                </p>
                            </div>
                        )}
                    </QueryBoundary>
                </CardBody>
            </Card>

            <Card>
                <CardHeader><CardTitle>Doanh thu và chi phí</CardTitle></CardHeader>
                <CardBody>
                    <QueryBoundary query={revExpQuery} errorTitle="Không tải được báo cáo doanh thu - chi phí"
                        skeleton={<Skeleton className="h-64 w-full" />}>
                        {(re) => (
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-4">
                                    <StatCard label="Doanh thu" value={formatCurrency(re.summary.totalRevenue)} />
                                    <StatCard label="Chi phí" value={formatCurrency(re.summary.totalExpenses)} />
                                    <StatCard label="Lợi nhuận gộp" value={formatCurrency(re.summary.grossProfit)} />
                                    <StatCard label="Biên lợi nhuận" value={`${re.summary.profitMargin.toFixed(1)}%`} />
                                </div>
                                <RevenueExpenseChart rows={re.monthlyData} />
                                {re.expenseByCategory.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <caption className="sr-only">Chi phí theo nhóm</caption>
                                            <THead><Tr><Th>Nhóm chi phí</Th><Th align="right">Số chứng từ</Th><Th align="right">Số tiền</Th></Tr></THead>
                                            <TBody>
                                                {re.expenseByCategory.map((c) => (
                                                    <Tr key={c.categoryName}>
                                                        <Td>{c.categoryName}</Td>
                                                        <Td align="right"><span className="num">{c.count}</span></Td>
                                                        <Td align="right"><Money value={c.total} /></Td>
                                                    </Tr>
                                                ))}
                                            </TBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        )}
                    </QueryBoundary>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Biên lợi nhuận theo sản phẩm</CardTitle>
                    <StatusBadge tone="warning">Giá vốn là số ước tính</StatusBadge>
                </CardHeader>
                <CardBody>
                    <QueryBoundary query={marginQuery} errorTitle="Không tải được biên lợi nhuận"
                        skeleton={<Skeleton className="h-48 w-full" />}
                        isEmpty={(d) => (d.products?.length ?? 0) === 0}
                        empty={{ title: 'Chưa có dữ liệu bán hàng trong kỳ', description: 'Chọn khoảng thời gian khác để xem biên lợi nhuận.' }}>
                        {(m) => (
                            <div className="overflow-x-auto">
                                <Table>
                                    <caption className="sr-only">Biên lợi nhuận theo sản phẩm</caption>
                                    <THead>
                                        <Tr>
                                            <Th>Sản phẩm</Th><Th align="right">Đã bán</Th><Th align="right">Doanh thu</Th>
                                            <Th align="right">Giá vốn (ước tính)</Th><Th align="right">Lợi nhuận</Th><Th align="right">Biên</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {m.products.map((p) => (
                                            <Tr key={p.productId}>
                                                <Td className="max-w-[20rem] truncate">{p.productName}</Td>
                                                <Td align="right"><span className="num">{p.unitsSold}</span></Td>
                                                <Td align="right"><Money value={p.revenue} /></Td>
                                                <Td align="right">
                                                    <Money value={p.totalCost} />
                                                    {p.isEstimate && <span className="ml-1 text-xs text-warning">ước tính</span>}
                                                </Td>
                                                <Td align="right"><Money value={p.profit} /></Td>
                                                <Td align="right"><span className="num">{p.marginPercent.toFixed(1)}%</span></Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            </div>
                        )}
                    </QueryBoundary>
                </CardBody>
            </Card>
        </div>
    );
}

export default FinancialReportsPage;
