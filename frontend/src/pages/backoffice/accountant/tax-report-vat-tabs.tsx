/**
 * Ba tab thuế GTGT: bảng kê hoá đơn (vat-ledger), tổng hợp theo kỳ
 * (accounting/tax-reports/vat-declaration) và tờ khai 01/GTGT (reports/vat-declaration).
 * Each tab owns exactly one query, enabled only while it is the active tab.
 */
import { useQuery } from '@tanstack/react-query';
import { Money, Select, StatusBadge, Table, TBody, Td, Th, THead, Tr } from '../../../components/ui';
import { formatVnDate } from '../../../api/accounting';
import { taxReportsApi } from '../../../api/tax-reports';
import { Figure, ReportPanel, TextRow } from './tax-report-kit';

export interface PeriodState {
    year: number;
    month: number;
    quarter: number;
}

export const VatLedgerTab = ({ period, active, type, onTypeChange }: {
    period: PeriodState; active: boolean; type: 'in' | 'out'; onTypeChange: (t: 'in' | 'out') => void;
}) => {
    const query = useQuery({
        queryKey: ['tax-reports', 'vat-ledger', period.month, period.year, type],
        queryFn: () => taxReportsApi.vatLedger(period.month, period.year, type),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Bảng kê hoá đơn GTGT"
            subtitle={`Kỳ ${String(period.month).padStart(2, '0')}/${period.year} · ${type === 'out' ? 'hàng bán ra' : 'hàng mua vào'}`}
            query={query}
            actions={
                <Select
                    value={type}
                    onChange={(e) => onTypeChange(e.target.value as 'in' | 'out')}
                    options={[{ value: 'out', label: 'Bán ra' }, { value: 'in', label: 'Mua vào' }]}
                    className="w-36"
                />
            }
            csv={(d) => ({
                filename: `bang-ke-gtgt-${type}-${period.year}${String(period.month).padStart(2, '0')}.csv`,
                headers: ['Số hoá đơn', 'Ngày', 'Đối tượng', 'Tiền hàng', 'Thuế suất (%)', 'Tiền thuế'],
                rows: d.records.map((r) => [r.invoiceNo, formatVnDate(r.date), r.buyer, r.gross, r.taxRate, r.taxAmount]),
            })}
        >
            {(d) => (
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Figure label="Tổng tiền hàng" value={d.totalGross} />
                        <Figure label="Tổng thuế GTGT" value={d.totalTax} strong />
                    </div>
                    {d.records.length === 0 ? (
                        <p className="text-sm text-fg-muted">Kỳ này chưa có hoá đơn nào.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <caption className="sr-only">Bảng kê hoá đơn GTGT kỳ {period.month}/{period.year}</caption>
                                <THead>
                                    <Tr>
                                        <Th>Số hoá đơn</Th><Th>Ngày</Th><Th>Đối tượng</Th>
                                        <Th align="right">Tiền hàng</Th><Th align="right">Thuế suất</Th><Th align="right">Tiền thuế</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {d.records.map((r) => (
                                        <Tr key={`${r.invoiceNo}-${r.date}`}>
                                            <Td><span className="num">{r.invoiceNo}</span></Td>
                                            <Td><span className="num">{formatVnDate(r.date)}</span></Td>
                                            <Td className="max-w-[16rem] truncate" title={r.buyer}>
                                                {/* Máy chủ mới trả mã đối tượng, chưa có tên — xem integration request W3-13 #6. */}
                                                <span className="num text-fg-muted">{r.buyer.length > 12 ? `${r.buyer.slice(0, 8)}…` : r.buyer}</span>
                                            </Td>
                                            <Td align="right"><Money value={r.gross} /></Td>
                                            <Td align="right"><span className="num">{r.taxRate}%</span></Td>
                                            <Td align="right"><Money value={r.taxAmount} /></Td>
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

export const VatPeriodTab = ({ period, active, mode, onModeChange }: {
    period: PeriodState; active: boolean; mode: 'monthly' | 'quarterly'; onModeChange: (m: 'monthly' | 'quarterly') => void;
}) => {
    const periodCode = mode === 'monthly'
        ? `${period.year}-${String(period.month).padStart(2, '0')}`
        : `${period.year}-Q${period.quarter}`;

    const query = useQuery({
        queryKey: ['tax-reports', 'vat-period', periodCode, mode],
        queryFn: () => taxReportsApi.vatPeriodDeclaration(periodCode, mode),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Tổng hợp thuế GTGT theo kỳ"
            subtitle={`Kỳ ${periodCode}`}
            query={query}
            actions={
                <Select
                    value={mode}
                    onChange={(e) => onModeChange(e.target.value as 'monthly' | 'quarterly')}
                    options={[{ value: 'monthly', label: 'Theo tháng' }, { value: 'quarterly', label: 'Theo quý' }]}
                    className="w-40"
                />
            }
            csv={(d) => ({
                filename: `tong-hop-gtgt-${periodCode}.csv`,
                headers: ['Chỉ tiêu', 'Giá trị'],
                rows: [
                    ['Số hoá đơn bán ra', d.outputVat.invoiceCount],
                    ['Doanh thu chưa thuế', d.outputVat.revenue],
                    ['Thuế GTGT đầu ra', d.outputVat.vatAmount],
                    ['Số hoá đơn mua vào', d.inputVat.invoiceCount],
                    ['Thuế GTGT đầu vào', d.inputVat.vatAmount],
                    ['Thuế phải nộp', d.vatPayable],
                    ['Thuế được hoàn', d.vatRefundable],
                ],
            })}
        >
            {(d) => (
                <div className="grid gap-x-8 sm:grid-cols-2">
                    <div>
                        <h4 className="mb-1 text-sm font-semibold text-fg">Đầu ra (bán ra)</h4>
                        <TextRow label="Số hoá đơn" value={<span className="num">{d.outputVat.invoiceCount}</span>} />
                        <Figure label="Doanh thu chưa thuế" value={d.outputVat.revenue} />
                        <Figure label="Thuế GTGT đầu ra" value={d.outputVat.vatAmount} />
                    </div>
                    <div>
                        <h4 className="mb-1 text-sm font-semibold text-fg">Đầu vào (mua vào)</h4>
                        <TextRow label="Số hoá đơn" value={<span className="num">{d.inputVat.invoiceCount}</span>} />
                        <Figure label="Thuế GTGT đầu vào" value={d.inputVat.vatAmount} />
                        <Figure label={d.vatPayable >= 0 ? 'Thuế phải nộp' : 'Thuế được hoàn'} value={d.vatPayable >= 0 ? d.vatPayable : d.vatRefundable} strong />
                    </div>
                </div>
            )}
        </ReportPanel>
    );
};

export const VatFormTab = ({ period, active }: { period: PeriodState; active: boolean }) => {
    const query = useQuery({
        queryKey: ['tax-reports', 'vat-form', period.month, period.year],
        queryFn: () => taxReportsApi.vatDeclarationForm(period.month, period.year),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Tờ khai thuế GTGT — mẫu 01/GTGT"
            subtitle={`Kỳ tính thuế ${String(period.month).padStart(2, '0')}/${period.year}`}
            query={query}
            csv={(d) => ({
                filename: `to-khai-01-gtgt-${period.year}${String(period.month).padStart(2, '0')}.csv`,
                headers: ['Chỉ tiêu', 'Giá trị'],
                rows: [
                    ['[23] Giá trị HHDV mua vào', d.inputVAT.indicator23],
                    ['[25] Thuế GTGT được khấu trừ', d.inputVAT.indicator25],
                    ['[26] Doanh thu HHDV bán ra', d.outputVAT.indicator26],
                    ['[28] Thuế GTGT đầu ra', d.outputVAT.indicator28],
                    ['[40] Thuế GTGT phải nộp', d.indicator40],
                ],
            })}
        >
            {(d) => (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <StatusBadge tone="info">{d.reportType}</StatusBadge>
                        <span className="text-sm text-fg-muted">Thuế suất mặc định {d.defaultVatRate}</span>
                    </div>
                    <Figure label="[23] Giá trị HHDV mua vào" value={d.inputVAT.indicator23} />
                    <Figure label="[25] Thuế GTGT đầu vào được khấu trừ" value={d.inputVAT.indicator25} />
                    <Figure label="[26] Doanh thu HHDV bán ra" value={d.outputVAT.indicator26} />
                    <Figure label="[28] Thuế GTGT đầu ra" value={d.outputVAT.indicator28} />
                    <Figure label="Thuế GTGT còn được khấu trừ kỳ trước" value={d.carryForward} />
                    <Figure label="[40] Thuế GTGT phải nộp kỳ này" value={d.indicator40} strong />
                </div>
            )}
        </ReportPanel>
    );
};
