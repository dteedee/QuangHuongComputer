/**
 * Năm tab báo cáo tài chính / thuế theo TT133: B01-DNN, B02-DNN, B09-DNN,
 * thuế TNDN và quyết toán TNCN 05/KK-TNCN.
 *
 * Trước W3-13 các tab này gọi `/api/reporting/tax/*`, một tiền tố chưa bao giờ
 * tồn tại → 404. Đường dẫn đúng là `/api/reports/*` (W2-25).
 */
import { useQuery } from '@tanstack/react-query';
import { Money, StatusBadge, Table, TBody, Td, Th, THead, Tr } from '../../../components/ui';
import { taxReportsApi } from '../../../api/tax-reports';
import { Figure, ReportPanel, TextRow } from './tax-report-kit';
import type { PeriodState } from './tax-report-vat-tabs';

const pct = (v: number) => `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

export const BalanceSheetTab = ({ period, active }: { period: PeriodState; active: boolean }) => {
    const query = useQuery({
        queryKey: ['tax-reports', 'balance-sheet', period.year],
        queryFn: () => taxReportsApi.balanceSheet(period.year),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Báo cáo tình hình tài chính (B01-DNN)"
            subtitle={`Năm tài chính ${period.year}`}
            query={query}
            csv={(d) => ({
                filename: `b01-dnn-${period.year}.csv`,
                headers: ['Khoản mục', 'Giá trị'],
                rows: [
                    ['Tiền và tương đương tiền', d.assets.shortTerm.cash],
                    ['Phải thu khách hàng', d.assets.shortTerm.accountsReceivable],
                    ['Hàng tồn kho', d.assets.shortTerm.inventory],
                    ['Tổng tài sản', d.assets.total],
                    ['Phải trả người bán', d.liabilities.accountsPayable],
                    ['Chi phí phải trả', d.liabilities.pendingExpenses],
                    ['Tổng nợ phải trả', d.liabilities.total],
                    ['Vốn chủ sở hữu', d.equity.total],
                ],
            })}
        >
            {(d) => (
                <div className="grid gap-x-8 sm:grid-cols-2">
                    <div>
                        <h4 className="mb-1 text-sm font-semibold text-fg">Tài sản</h4>
                        <Figure label="Tiền và tương đương tiền" value={d.assets.shortTerm.cash} />
                        <Figure label="Phải thu khách hàng" value={d.assets.shortTerm.accountsReceivable} />
                        <Figure label="Hàng tồn kho" value={d.assets.shortTerm.inventory} />
                        <Figure label="Tài sản dài hạn" value={d.assets.longTerm.total} />
                        <Figure label="Tổng tài sản" value={d.assets.total} strong />
                    </div>
                    <div>
                        <h4 className="mb-1 text-sm font-semibold text-fg">Nguồn vốn</h4>
                        <Figure label="Phải trả người bán" value={d.liabilities.accountsPayable} />
                        <Figure label="Chi phí phải trả" value={d.liabilities.pendingExpenses} />
                        <Figure label="Tổng nợ phải trả" value={d.liabilities.total} />
                        <Figure label="Lợi nhuận chưa phân phối" value={d.equity.retainedEarnings} />
                        <Figure label="Tổng nguồn vốn" value={d.totalLiabilitiesAndEquity} strong />
                    </div>
                </div>
            )}
        </ReportPanel>
    );
};

export const IncomeStatementTab = ({ period, active }: { period: PeriodState; active: boolean }) => {
    const query = useQuery({
        queryKey: ['tax-reports', 'income-statement', period.year],
        queryFn: () => taxReportsApi.incomeStatement(period.year),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Báo cáo kết quả hoạt động kinh doanh (B02-DNN)"
            subtitle={`Năm ${period.year}`}
            query={query}
            csv={(d) => ({
                filename: `b02-dnn-${period.year}.csv`,
                headers: ['Chỉ tiêu', 'Giá trị'],
                rows: [
                    ['Doanh thu thuần', d.revenue.netRevenue],
                    ['Giá vốn hàng bán', d.cogs],
                    ['Lợi nhuận gộp', d.grossProfit],
                    ['Chi phí hoạt động', d.operatingExpenses],
                    ['Lợi nhuận trước thuế', d.profitBeforeTax],
                    ['Thuế TNDN', d.incomeTax],
                    ['Lợi nhuận sau thuế', d.netProfit],
                ],
            })}
        >
            {(d) => (
                <div className="space-y-2">
                    <StatusBadge tone="warning">
                        Giá vốn là số ƯỚC TÍNH theo giá vốn bình quân hiện tại
                    </StatusBadge>
                    <Figure label="Doanh thu bán hàng và cung cấp dịch vụ" value={d.revenue.goodsAndServices} />
                    <Figure label="Các khoản giảm trừ" value={d.revenue.discounts} />
                    <Figure label="Doanh thu thuần" value={d.revenue.netRevenue} />
                    <Figure label="Giá vốn hàng bán (ước tính)" value={d.cogs} />
                    <Figure label="Lợi nhuận gộp" value={d.grossProfit} />
                    <Figure label="Chi phí hoạt động" value={d.operatingExpenses} />
                    <Figure label="Lợi nhuận trước thuế" value={d.profitBeforeTax} />
                    <Figure label="Chi phí thuế TNDN" value={d.incomeTax} />
                    <Figure label="Lợi nhuận sau thuế" value={d.netProfit} strong />
                    <TextRow label="Tỷ suất lợi nhuận" value={<span className="num">{pct(d.profitMargin)}</span>} />
                </div>
            )}
        </ReportPanel>
    );
};

export const FinancialNotesTab = ({ period, active }: { period: PeriodState; active: boolean }) => {
    const query = useQuery({
        queryKey: ['tax-reports', 'financial-notes', period.year],
        queryFn: () => taxReportsApi.financialNotes(period.year),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Thuyết minh báo cáo tài chính (B09-DNN)"
            subtitle={`Năm tài chính ${period.year}`}
            query={query}
            csv={(d) => ({
                filename: `b09-dnn-${period.year}.csv`,
                headers: ['Nhóm chi phí', 'Số tiền', 'Số chứng từ'],
                rows: d.notes.operatingExpenses.map((e) => [e.categoryName, e.total, e.count]),
            })}
        >
            {(d) => (
                <div className="space-y-4">
                    <div>
                        <h4 className="mb-1 text-sm font-semibold text-fg">Đơn vị báo cáo</h4>
                        <TextRow label="Tên đơn vị" value={d.company.name} />
                        <TextRow label="Chế độ kế toán" value={d.company.accountingStandard} />
                        <TextRow label="Đơn vị tiền tệ" value={d.company.currency} />
                    </div>
                    <div>
                        <h4 className="mb-1 text-sm font-semibold text-fg">Phải thu khách hàng</h4>
                        <Figure label="Tổng giá trị hoá đơn" value={d.notes.accountsReceivable.totalInvoiced} />
                        <Figure label="Còn phải thu" value={d.notes.accountsReceivable.outstanding} />
                        <TextRow label="Tỷ lệ thu hồi" value={<span className="num">{pct(d.notes.accountsReceivable.collectionRate)}</span>} />
                    </div>
                    <div>
                        <h4 className="mb-1 text-sm font-semibold text-fg">Hàng tồn kho</h4>
                        <Figure label="Giá trị tồn kho" value={d.notes.inventory.totalValue} />
                        <TextRow label="Số mặt hàng" value={<span className="num">{d.notes.inventory.itemCount}</span>} />
                        <TextRow label="Phương pháp tính giá" value={d.notes.inventory.valuationMethod} />
                    </div>
                    {d.notes.operatingExpenses.length > 0 && (
                        <div className="overflow-x-auto">
                            <h4 className="mb-1 text-sm font-semibold text-fg">Chi phí hoạt động theo nhóm</h4>
                            <Table>
                                <caption className="sr-only">Chi phí hoạt động theo nhóm năm {period.year}</caption>
                                <THead><Tr><Th>Nhóm</Th><Th align="right">Số chứng từ</Th><Th align="right">Số tiền</Th></Tr></THead>
                                <TBody>
                                    {d.notes.operatingExpenses.map((e) => (
                                        <Tr key={e.categoryName}>
                                            <Td>{e.categoryName}</Td>
                                            <Td align="right"><span className="num">{e.count}</span></Td>
                                            <Td align="right"><Money value={e.total} /></Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}
        </ReportPanel>
    );
};
