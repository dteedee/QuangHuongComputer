/**
 * Hai tab thuế doanh nghiệp: thuế TNDN tạm tính và quyết toán thuế TNCN
 * (05/KK-TNCN). Tách khỏi `tax-report-financial-tabs.tsx` để giữ dưới 200 dòng.
 */
import { useQuery } from '@tanstack/react-query';
import { Money, Table, TBody, Td, Th, THead, Tr } from '../../../components/ui';
import { taxReportsApi } from '../../../api/tax-reports';
import { Figure, ReportPanel, TextRow } from './tax-report-kit';
import type { PeriodState } from './tax-report-vat-tabs';

const pct = (v: number) => `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

export const CitTab = ({ period, active }: { period: PeriodState; active: boolean }) => {
    const query = useQuery({
        queryKey: ['tax-reports', 'cit', period.year],
        queryFn: () => taxReportsApi.citReport(period.year),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Thuế thu nhập doanh nghiệp"
            subtitle={`Tạm tính năm ${period.year} — doanh thu từ hoá đơn bán ra, chi phí từ khoản chi đã chi trả`}
            query={query}
            csv={(d) => ({
                filename: `thue-tndn-${period.year}.csv`,
                headers: ['Chỉ tiêu', 'Giá trị'],
                rows: [
                    ['Doanh thu chưa thuế', d.totalRevenue],
                    ['Chi phí được trừ', d.deductibleExpenses],
                    ['Thu nhập chịu thuế', d.taxableIncome],
                    ['Thuế suất (%)', d.citRate],
                    ['Thuế TNDN phải nộp', d.citPayable],
                ],
            })}
        >
            {(d) => (
                <div className="space-y-2">
                    <Figure label="Doanh thu chưa thuế" value={d.totalRevenue} />
                    <Figure label="Chi phí được trừ" value={d.deductibleExpenses} />
                    <Figure label="Thu nhập chịu thuế" value={d.taxableIncome} />
                    <TextRow label="Thuế suất" value={<span className="num">{pct(d.citRate)}</span>} />
                    <Figure label="Thuế TNDN phải nộp" value={d.citPayable} strong />
                </div>
            )}
        </ReportPanel>
    );
};

export const PitSettlementTab = ({ period, active }: { period: PeriodState; active: boolean }) => {
    const query = useQuery({
        queryKey: ['tax-reports', 'pit-settlement', period.year],
        queryFn: () => taxReportsApi.pitSettlement(period.year),
        enabled: active,
    });

    return (
        <ReportPanel
            title="Quyết toán thuế TNCN (05/KK-TNCN)"
            subtitle={`Năm quyết toán ${period.year}`}
            query={query}
            csv={(d) => ({
                filename: `05-kk-tncn-${period.year}.csv`,
                headers: ['Nhân viên', 'MST', 'Số tháng', 'Thu nhập chịu thuế', 'Bảo hiểm', 'Giảm trừ bản thân', 'Thu nhập tính thuế', 'Thuế phải nộp', 'Đã khấu trừ', 'Nộp thừa', 'Nộp thiếu'],
                rows: d.employees.map((e) => [
                    e.fullName, e.taxCode, e.monthsWorked, e.totalTaxableIncome, e.insuranceDeduction,
                    e.personalDeduction, e.assessableIncome, e.pitTax, e.pitWithheld, e.pitOverpayment, e.pitShortfall,
                ]),
            })}
        >
            {(d) => (
                <div className="space-y-4">
                    <div className="grid gap-x-8 sm:grid-cols-2">
                        <div>
                            <TextRow label="Số người lao động" value={<span className="num">{d.summary.totalEmployees}</span>} />
                            <Figure label="Tổng thu nhập chịu thuế" value={d.summary.totalTaxableIncome} />
                            <Figure label="Tổng bảo hiểm" value={d.summary.totalInsurance} />
                        </div>
                        <div>
                            <Figure label="Giảm trừ bản thân / tháng" value={d.summary.personalDeductionPerMonth} />
                            <Figure label="Giảm trừ người phụ thuộc / tháng" value={d.summary.dependentDeductionPerMonth} />
                            <Figure label="Tổng thuế TNCN phải nộp" value={d.summary.totalPitTax} strong />
                        </div>
                    </div>
                    {d.legalBasis && <p className="text-xs text-fg-subtle">Căn cứ: {d.legalBasis}</p>}
                    {d.employees.length > 0 && (
                        <div className="overflow-x-auto">
                            <Table>
                                <caption className="sr-only">Quyết toán thuế TNCN từng người lao động năm {period.year}</caption>
                                <THead>
                                    <Tr>
                                        <Th>Người lao động</Th><Th>MST</Th><Th align="right">Tháng</Th>
                                        <Th align="right">Thu nhập chịu thuế</Th><Th align="right">Thuế phải nộp</Th>
                                        <Th align="right">Đã khấu trừ</Th><Th align="right">Chênh lệch</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {d.employees.map((e) => (
                                        <Tr key={e.employeeId}>
                                            <Td>{e.fullName}</Td>
                                            <Td><span className="num">{e.taxCode}</span></Td>
                                            <Td align="right"><span className="num">{e.monthsWorked}</span></Td>
                                            <Td align="right"><Money value={e.totalTaxableIncome} /></Td>
                                            <Td align="right"><Money value={e.pitTax} /></Td>
                                            <Td align="right"><Money value={e.pitWithheld} /></Td>
                                            <Td align="right">
                                                {e.pitOverpayment > 0
                                                    ? <span className="text-success">Nộp thừa <Money value={e.pitOverpayment} /></span>
                                                    : e.pitShortfall > 0
                                                        ? <span className="text-danger">Nộp thiếu <Money value={e.pitShortfall} /></span>
                                                        : <span className="text-fg-subtle">—</span>}
                                            </Td>
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
