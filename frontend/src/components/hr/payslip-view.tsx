import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency, payrollSelfServiceApi, type PayslipDetail, type PayslipLineItem } from '../../api/hr';

interface PayslipViewProps {
    payrollId: string;
    onClose?: () => void;
}

const CATEGORY_LABEL: Record<PayslipLineItem['category'], string> = {
    Income: 'Thu nhập',
    Bonus: 'Thưởng',
    Allowance: 'Phụ cấp',
    Deduction: 'Khấu trừ khác',
    Insurance: 'Bảo hiểm',
    Tax: 'Thuế TNCN',
    Other: 'Khác',
};

const INCOME_CATS: PayslipLineItem['category'][] = ['Income', 'Bonus', 'Allowance'];

/** Chi tiết phiếu lương — layout A4, hỗ trợ in ấn qua CSS media print. */
export default function PayslipView({ payrollId, onClose }: PayslipViewProps) {
    const [data, setData] = useState<PayslipDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        payrollSelfServiceApi
            .payslip(payrollId)
            .then(d => { if (!cancelled) setData(d); })
            .catch(e => {
                if (!cancelled) {
                    const err = e as { response?: { data?: { error?: string } } };
                    setError(err.response?.data?.error || 'Không tải được phiếu lương');
                }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [payrollId]);

    const handlePrint = () => window.print();

    const handleDownloadPdf = () => {
        // Backend endpoint có thể trả PDF trực tiếp. Nếu chưa có thì rơi về print dialog.
        const url = `/api/hr/payroll/${payrollId}/payslip?format=pdf`;
        window.open(url, '_blank');
    };

    const incomes = data?.lineItems.filter(i => INCOME_CATS.includes(i.category)) ?? [];
    const deductions = data?.lineItems.filter(i => !INCOME_CATS.includes(i.category)) ?? [];
    const totalIncome = data?.totalIncome ?? incomes.reduce((s, i) => s + i.amount, 0);
    const totalDeduction = data?.totalDeductions ?? deductions.reduce((s, i) => s + i.amount, 0);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .payslip-print-root, .payslip-print-root * { visibility: visible; }
                    .payslip-print-root { position: absolute; left: 0; top: 0; width: 100%; }
                    .payslip-no-print { display: none !important; }
                }
            `}</style>
            <div className="payslip-print-root bg-white rounded-2xl w-full max-w-3xl shadow-lg my-8 print:rounded-none print:my-0 print:shadow-none">
                {/* Actions */}
                <div className="payslip-no-print flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-slate-900">Phiếu lương</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="min-h-[36px] px-4 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >In</button>
                        <button
                            onClick={handleDownloadPdf}
                            className="min-h-[36px] px-4 py-1.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90"
                        >Tải PDF</button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="min-h-[36px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                                aria-label="Đóng"
                            >✕</button>
                        )}
                    </div>
                </div>

                {loading && <p className="p-8 text-center text-gray-400">Đang tải phiếu lương...</p>}
                {error && <p className="p-8 text-center text-red-500">{error}</p>}

                {data && !loading && (
                    <div className="p-8 space-y-6 text-sm">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                            <div>
                                <p className="text-xl font-bold text-[var(--accent-primary,#e11d48)]">QUANG HƯỞNG COMPUTER</p>
                                <p className="text-xs text-gray-500 mt-1">Chuyên cung cấp máy tính, laptop, linh kiện chính hãng</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase font-semibold text-gray-400">Phiếu lương</p>
                                <p className="text-base font-bold">Kỳ {String(data.period.month).padStart(2, '0')}/{data.period.year}</p>
                            </div>
                        </div>

                        {/* Employee info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500 text-xs">Nhân viên</p>
                                <p className="font-semibold">{data.employeeName || '—'}</p>
                                {data.employeeCode && <p className="text-xs text-gray-500">Mã: {data.employeeCode}</p>}
                            </div>
                            <div className="text-right">
                                {data.department && <p className="text-xs text-gray-500">{data.department}</p>}
                                {data.position && <p className="text-xs text-gray-500">{data.position}</p>}
                                {data.bankAccount && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        TK: {data.bankAccount} — {data.bankName}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Income table */}
                        <div>
                            <p className="text-xs font-bold text-green-700 uppercase mb-1">Thu nhập</p>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-100">
                                    {incomes.length === 0 ? (
                                        <tr><td className="py-2 text-gray-400 italic">Không có khoản thu nhập</td></tr>
                                    ) : incomes.map((i, idx) => (
                                        <tr key={idx}>
                                            <td className="py-1.5 text-gray-700">
                                                {i.label}
                                                <span className="ml-2 text-[10px] text-gray-400">[{CATEGORY_LABEL[i.category]}]</span>
                                                {i.taxable === false && <span className="ml-1 text-[10px] text-green-600">(miễn thuế)</span>}
                                            </td>
                                            <td className="py-1.5 text-right font-mono">{formatCurrency(i.amount)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-green-100">
                                        <td className="py-2 font-semibold text-green-700">Tổng thu nhập</td>
                                        <td className="py-2 text-right font-bold text-green-700 font-mono">{formatCurrency(totalIncome)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Deduction table */}
                        <div>
                            <p className="text-xs font-bold text-red-700 uppercase mb-1">Khấu trừ</p>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-100">
                                    {deductions.length === 0 ? (
                                        <tr><td className="py-2 text-gray-400 italic">Không có khoản khấu trừ</td></tr>
                                    ) : deductions.map((i, idx) => (
                                        <tr key={idx}>
                                            <td className="py-1.5 text-gray-700">
                                                {i.label}
                                                <span className="ml-2 text-[10px] text-gray-400">[{CATEGORY_LABEL[i.category]}]</span>
                                            </td>
                                            <td className="py-1.5 text-right font-mono text-red-600">− {formatCurrency(i.amount)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-red-100">
                                        <td className="py-2 font-semibold text-red-700">Tổng khấu trừ</td>
                                        <td className="py-2 text-right font-bold text-red-700 font-mono">− {formatCurrency(totalDeduction)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Net pay */}
                        <div className="bg-red-50 border-2 border-[var(--accent-primary,#e11d48)] rounded-xl p-5 flex items-center justify-between">
                            <p className="text-base font-bold text-[var(--accent-primary,#e11d48)] uppercase">Thực lĩnh</p>
                            <p className="text-2xl font-black text-[var(--accent-primary,#e11d48)] font-mono">
                                {formatCurrency(data.netPay)}
                            </p>
                        </div>

                        {data.notes && (
                            <p className="text-xs text-gray-500 italic">Ghi chú: {data.notes}</p>
                        )}

                        <div className="pt-6 grid grid-cols-2 text-xs text-gray-500">
                            <div>
                                <p>Người lập phiếu</p>
                                <p className="italic mt-8">(Ký, ghi rõ họ tên)</p>
                            </div>
                            <div className="text-right">
                                <p>Người nhận</p>
                                <p className="italic mt-8">(Ký, ghi rõ họ tên)</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
