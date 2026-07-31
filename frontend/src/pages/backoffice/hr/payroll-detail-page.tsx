import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { payrollRunsApi, getPayrollStatusColor } from '../../../api/hr';
import { formatCurrency } from '../../../utils/format';
import { PayrollLineItemsTable } from '../../../components/hr/payroll-line-items-table';
import { Button } from '../../../components/ui/Button';

export default function PayrollDetailPage() {
    const { payrollId } = useParams<{ payrollId: string }>();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['payroll-detail', payrollId],
        queryFn: () => payrollRunsApi.getPayrollDetail(payrollId!),
        enabled: !!payrollId,
    });

    if (!payrollId) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 pb-16 animate-fade-in print:space-y-4">
            <header className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/backoffice/hr/payroll-runs" className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Phiếu lương <span className="text-accent">{data?.employeeName ?? ''}</span>
                        </h1>
                        {data && (
                            <p className="text-xs text-gray-500 mt-1">
                                Kỳ {data.month}/{data.year} · {data.employeeCode ?? ''}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" icon={RefreshCw} onClick={() => refetch()}>Tải lại</Button>
                    <Button icon={Printer} onClick={handlePrint}>In phiếu</Button>
                </div>
            </header>

            {isLoading || !data ? (
                <p className="text-center py-16 text-gray-400">Đang tải phiếu lương...</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="premium-card p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Trạng thái</p>
                                <p className="mt-1">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPayrollStatusColor(data.status)}`}>
                                        {data.status}
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Thực lĩnh</p>
                                <p className="text-3xl font-black text-accent mt-1">{formatCurrency(data.netPay)}</p>
                            </div>
                        </div>

                        <PayrollLineItemsTable
                            lineItems={data.lineItems ?? []}
                            grossPay={data.grossPay}
                            netPay={data.netPay}
                        />
                    </div>

                    <aside className="space-y-4">
                        <div className="premium-card p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Bảng công</h3>
                            <div className="space-y-2 text-sm">
                                <Row label="Công chuẩn" value={String(data.workdaysStandard ?? '—')} />
                                <Row label="Công thực tế" value={String(data.workdaysActual ?? '—')} />
                                <Row label="OT (giờ)" value={String(data.overtimeHours ?? 0)} />
                                <Row label="Đi muộn (phút)" value={String(data.lateMinutes ?? 0)} />
                            </div>
                        </div>

                        <div className="premium-card p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Cơ cấu lương áp dụng</h3>
                            <div className="space-y-2 text-sm">
                                <Row label="Base salary" value={formatCurrency(data.baseSalary)} />
                                <Row label="Insurance" value={formatCurrency(data.insuranceDeduction ?? 0)} />
                                <Row label="Tax PIT" value={formatCurrency(data.taxDeduction ?? 0)} />
                            </div>
                        </div>

                        <div className="premium-card p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Giảm trừ gia cảnh</h3>
                            <p className="text-sm text-slate-900">
                                {data.dependentCount ?? 0} người phụ thuộc
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Tự động lấy từ danh sách Dependents của nhân viên
                            </p>
                        </div>

                        <div className="premium-card p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Chuyển khoản</h3>
                            <div className="space-y-2 text-sm">
                                <Row label="Bank" value={data.employeeBankName ?? '—'} />
                                <Row label="STK" value={data.employeeBankAccount ?? '—'} />
                                {data.bankTransferRef && (
                                    <Row label="Ref" value={data.bankTransferRef} />
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-slate-900">{value}</span>
        </div>
    );
}
