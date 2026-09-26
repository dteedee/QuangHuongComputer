import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, RefreshCw, Undo2, Wallet } from 'lucide-react';
import { Button, Card, Input, PageHeader, Select, StatCard, formatDong, notify } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { CommissionEntriesTable } from '../../../components/hr/commission-entries-table';
import {
    commissionsApi, commissionErrorMessage, currentCommissionPeriod,
    type CommissionEmployeeSummary, type CommissionStatus,
} from '../../../api/hr/commissions';

const STATUS_OPTIONS = [
    { value: '', label: 'Mọi trạng thái' },
    { value: 'Pending', label: 'Chờ duyệt' },
    { value: 'Approved', label: 'Đã duyệt' },
    { value: 'Paid', label: 'Đã trả' },
    { value: 'Reversed', label: 'Đã huỷ' },
];

/**
 * Hoa hồng kỹ thuật theo kỳ (docs/api-contracts/hr-commission.md). Khoản sinh tự động khi phiếu
 * sửa được thu tiền; HR duyệt ở đây, bảng lương kỳ đó (hoặc kỳ sau) cộng các khoản đã duyệt
 * thành dòng thu nhập chịu thuế. "Đối soát kỳ" quét lại Repair khi sự kiện bị lỡ.
 */
export default function CommissionsPage() {
    const qc = useQueryClient();
    const [period, setPeriod] = useState(currentCommissionPeriod());
    const [employeeId, setEmployeeId] = useState('');
    const [status, setStatus] = useState<'' | CommissionStatus>('');

    const query = useQuery({
        queryKey: ['hr-commissions', period, employeeId, status],
        queryFn: () => commissionsApi.list({
            period,
            employeeId: employeeId || undefined,
            status: status || undefined,
        }),
        enabled: /^\d{4}-\d{2}$/.test(period),
    });

    const syncMut = useMutation({
        mutationFn: () => commissionsApi.sync(period),
        onSuccess: (r) => {
            notify.success(`Đối soát ${r.scanned} phiếu: +${r.created} khoản mới`, r.unmapped.length > 0
                ? { description: `${r.unmapped.length} phiếu chưa gắn kỹ thuật viên với nhân viên: ${r.unmapped.slice(0, 3).join(', ')}` }
                : undefined);
            qc.invalidateQueries({ queryKey: ['hr-commissions'] });
        },
        onError: (e) => notify.error(commissionErrorMessage(e, 'Không đối soát được')),
    });

    const totals = query.data?.totals;
    const byEmployee = query.data?.byEmployee ?? [];

    return (
        <div className="p-6 space-y-5">
            <PageHeader
                density="compact"
                title="Hoa hồng kỹ thuật"
                description="Phiếu sửa đã thu tiền → hoa hồng trên tiền công + phí dịch vụ (không tính linh kiện) → trả qua bảng lương."
                actions={(
                    <Can permission={PERMISSIONS.HR_MANAGE_PAYROLL}>
                        <Button size="sm" variant="outline" icon={RefreshCw} loading={syncMut.isPending} onClick={() => syncMut.mutate()}>
                            Đối soát kỳ
                        </Button>
                    </Can>
                )}
            />

            <Card padded radius="xl">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Input label="Kỳ" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
                    <Select
                        label="Nhân viên"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        options={[{ value: '', label: 'Tất cả nhân viên' }, ...byEmployee.map(toOption)]}
                    />
                    <Select
                        label="Trạng thái"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as '' | CommissionStatus)}
                        options={STATUS_OPTIONS}
                    />
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Chờ duyệt" value={money(totals?.pending)} icon={Clock} />
                <StatCard label="Đã duyệt (chờ trả)" value={money(totals?.approved)} icon={CheckCircle2} />
                <StatCard label="Đã trả qua lương" value={money(totals?.paid)} icon={Wallet} />
                <StatCard label="Đã huỷ" value={money(totals?.reversed)} icon={Undo2} />
            </div>

            {byEmployee.length > 0 && !employeeId && (
                <Card padded radius="xl">
                    <h3 className="mb-3 text-13 font-semibold uppercase tracking-wider text-fg-subtle">Theo nhân viên</h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {byEmployee.map((e) => (
                            <button
                                key={e.employeeId}
                                type="button"
                                onClick={() => setEmployeeId(e.employeeId)}
                                className="rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-sunken"
                            >
                                <p className="text-sm font-medium text-fg">{e.employeeName}</p>
                                <p className="num text-xs text-fg-muted">
                                    {e.count} khoản · duyệt {formatDong(e.approved)} ₫ · chờ {formatDong(e.pending)} ₫ · đã trả {formatDong(e.paid)} ₫
                                </p>
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            <Card padded radius="xl">
                <CommissionEntriesTable
                    rows={query.data?.items}
                    loading={query.isLoading}
                    error={query.error}
                    onRetry={() => query.refetch()}
                />
            </Card>
        </div>
    );
}

function toOption(e: CommissionEmployeeSummary) {
    return { value: e.employeeId, label: e.employeeName };
}

function money(value: number | undefined): string | undefined {
    return value === undefined ? undefined : `${formatDong(value)} ₫`;
}
