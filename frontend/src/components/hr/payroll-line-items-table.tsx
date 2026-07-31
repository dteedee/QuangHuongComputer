import type { PayrollLineItem, PayrollLineType } from '../../api/hr';
import { PAYROLL_INCOME_TYPES, PAYROLL_DEDUCTION_TYPES, payrollLineTypeLabels } from '../../api/hr';
import { formatCurrency } from '../../utils/format';

interface Props {
    lineItems: PayrollLineItem[];
    grossPay?: number;
    netPay?: number;
    totalDeductions?: number;
}

/**
 * Reusable payroll line items table grouped into Income and Deductions.
 * Highlights totals and Net Pay (Thực lĩnh).
 */
export function PayrollLineItemsTable({ lineItems, grossPay, netPay, totalDeductions }: Props) {
    const groups = groupByType(lineItems);
    const incomeItems = PAYROLL_INCOME_TYPES.flatMap(t => groups[t] ?? []);
    const deductionItems = PAYROLL_DEDUCTION_TYPES.flatMap(t => groups[t] ?? []);

    const computedGross = grossPay ?? incomeItems.reduce((s, li) => s + li.amount, 0);
    const computedDed = totalDeductions ?? deductionItems.reduce((s, li) => s + li.amount, 0);
    const computedNet = netPay ?? computedGross - computedDed;

    return (
        <div className="premium-card overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-accent/5 text-accent text-xs uppercase tracking-wider">
                        <th className="text-left px-6 py-4 font-semibold">Khoản mục</th>
                        <th className="text-right px-6 py-4 font-semibold w-[160px]">Số tiền (VND)</th>
                        <th className="text-left px-6 py-4 font-semibold w-[240px]">Ghi chú</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    <tr className="bg-emerald-50/40">
                        <td colSpan={3} className="px-6 py-2 font-bold text-emerald-700 uppercase text-xs tracking-wide">
                            Thu nhập
                        </td>
                    </tr>
                    {incomeItems.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-6 py-3 text-gray-400 text-xs italic">Không có khoản thu</td>
                        </tr>
                    ) : incomeItems.map(item => (
                        <tr key={item.id} className="hover:bg-emerald-50/30">
                            <td className="px-6 py-3">
                                <span className="font-medium text-gray-700">{item.label || payrollLineTypeLabels[item.type]}</span>
                                {item.quantity != null && (
                                    <span className="ml-2 text-[10px] text-gray-400">
                                        ({item.quantity}{item.rate != null ? ` x ${formatCurrency(item.rate)}` : ''})
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                                {formatCurrency(item.amount)}
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-500">{item.notes ?? ''}</td>
                        </tr>
                    ))}
                    <tr className="bg-emerald-100/60">
                        <td className="px-6 py-3 font-bold text-emerald-800 uppercase text-xs">Tổng thu</td>
                        <td className="px-6 py-3 text-right font-bold text-emerald-800 tabular-nums">{formatCurrency(computedGross)}</td>
                        <td />
                    </tr>

                    <tr className="bg-red-50/40">
                        <td colSpan={3} className="px-6 py-2 font-bold text-red-700 uppercase text-xs tracking-wide">
                            Khấu trừ
                        </td>
                    </tr>
                    {deductionItems.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-6 py-3 text-gray-400 text-xs italic">Không có khoản khấu trừ</td>
                        </tr>
                    ) : deductionItems.map(item => (
                        <tr key={item.id} className="hover:bg-red-50/30">
                            <td className="px-6 py-3">
                                <span className="font-medium text-gray-700">{item.label || payrollLineTypeLabels[item.type]}</span>
                            </td>
                            <td className="px-6 py-3 text-right font-semibold text-red-600 tabular-nums">
                                -{formatCurrency(item.amount)}
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-500">{item.notes ?? ''}</td>
                        </tr>
                    ))}
                    <tr className="bg-red-100/60">
                        <td className="px-6 py-3 font-bold text-red-800 uppercase text-xs">Tổng khấu trừ</td>
                        <td className="px-6 py-3 text-right font-bold text-red-800 tabular-nums">-{formatCurrency(computedDed)}</td>
                        <td />
                    </tr>

                    <tr className="bg-accent/10">
                        <td className="px-6 py-5 font-black text-accent uppercase text-sm tracking-wide">Thực lĩnh</td>
                        <td className="px-6 py-5 text-right font-black text-accent text-lg tabular-nums">{formatCurrency(computedNet)}</td>
                        <td />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function groupByType(items: PayrollLineItem[]): Record<PayrollLineType, PayrollLineItem[]> {
    const map: Partial<Record<PayrollLineType, PayrollLineItem[]>> = {};
    for (const it of items) {
        if (!map[it.type]) map[it.type] = [];
        map[it.type]!.push(it);
    }
    return map as Record<PayrollLineType, PayrollLineItem[]>;
}
