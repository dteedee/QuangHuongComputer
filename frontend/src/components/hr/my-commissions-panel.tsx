import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, Select, StatCard, StatusBadge, formatDong, type DataTableColumn } from '../ui';
import { commissionsApi, type CommissionEntryDto } from '../../api/hr/commissions';
import { commissionSourceLabel, commissionStatus } from './commission-status';

/** "Hoa hồng của tôi" trong trang tự phục vụ — chỉ dữ liệu của chính người đăng nhập (server lọc). */
export function MyCommissionsPanel() {
    const thisYear = new Date().getFullYear();
    const [year, setYear] = useState(thisYear);
    const query = useQuery({
        queryKey: ['hr-commissions', 'mine', year],
        queryFn: () => commissionsApi.mine(year),
    });

    const columns: DataTableColumn<CommissionEntryDto>[] = [
        { id: 'period', header: 'Kỳ', nowrap: true, cell: (r) => <span className="num">{r.period}</span> },
        { id: 'source', header: 'Chứng từ', cell: (r) => <span className="num">{commissionSourceLabel(r.sourceType)} · {r.sourceReference}</span> },
        { id: 'base', header: 'Căn cứ', align: 'right', cell: (r) => <span className="num">{formatDong(r.baseAmount)} ₫</span> },
        { id: 'amount', header: 'Hoa hồng', align: 'right', cell: (r) => <span className="num font-semibold">{formatDong(r.amount)} ₫</span> },
        { id: 'status', header: 'Trạng thái', align: 'center', cell: (r) => <StatusBadge {...commissionStatus(r.status)} /> },
    ];

    const totals = query.data?.totals;
    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
                <p className="text-sm text-gray-500">Hoa hồng trên tiền công + phí dịch vụ của phiếu sửa bạn thực hiện, trả cùng kỳ lương sau khi được duyệt.</p>
                <div className="w-32 shrink-0">
                    <Select
                        label="Năm"
                        value={String(year)}
                        onChange={(e) => setYear(Number(e.target.value))}
                        options={[0, 1, 2].map((d) => ({ value: String(thisYear - d), label: String(thisYear - d) }))}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Chờ duyệt" value={totals ? `${formatDong(totals.pending)} ₫` : undefined} />
                <StatCard label="Đã duyệt, chờ trả" value={totals ? `${formatDong(totals.approved)} ₫` : undefined} />
                <StatCard label="Đã trả qua lương" value={totals ? `${formatDong(totals.paid)} ₫` : undefined} />
            </div>
            <DataTable
                density="compact"
                caption="Hoa hồng của tôi"
                columns={columns}
                rows={query.data?.items}
                rowKey={(r) => r.id}
                loading={query.isLoading}
                error={query.error}
                onRetry={() => query.refetch()}
                empty={{ title: 'Chưa có hoa hồng trong năm này' }}
            />
        </div>
    );
}
