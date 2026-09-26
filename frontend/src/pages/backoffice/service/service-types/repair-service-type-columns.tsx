import { Pencil, Trash2 } from 'lucide-react';
import { Badge, IconButton, Money, RowActions, StatusBadge, type DataTableColumn } from '../../../../components/ui';
import type { RepairServiceType } from '../../../../api/repair/service-types';
import { formatMinutes } from './repair-service-type-schema';

interface Actions {
    canManage: boolean;
    onEdit: (row: RepairServiceType) => void;
    onDelete: (row: RepairServiceType) => void;
}

export function buildServiceTypeColumns({ canManage, onEdit, onDelete }: Actions): DataTableColumn<RepairServiceType>[] {
    const columns: DataTableColumn<RepairServiceType>[] = [
        {
            id: 'name', header: 'Dịch vụ', locked: true, nowrap: false,
            cell: (r) => (
                <div className="min-w-0">
                    <p className="text-13 font-medium text-fg">{r.name}</p>
                    <p className="num text-2xs text-fg-subtle">{r.code}</p>
                    {r.description && <p className="line-clamp-1 text-xs text-fg-muted">{r.description}</p>}
                </div>
            ),
        },
        { id: 'basePrice', header: 'Giá gốc', align: 'right', cell: (r) => <Money value={r.basePrice} /> },
        { id: 'estimatedMinutes', header: 'Thời gian', cell: (r) => <span className="text-xs">{formatMinutes(r.estimatedMinutes)}</span> },
        { id: 'isOnSite', header: 'Hình thức', cell: (r) => <Badge variant={r.isOnSite ? 'info' : 'neutral'}>{r.isOnSite ? 'Tận nơi' : 'Tại cửa hàng'}</Badge> },
        { id: 'sortOrder', header: 'Thứ tự', align: 'right', defaultHidden: true, cell: (r) => <span className="num">{r.sortOrder}</span> },
        {
            id: 'isActive', header: 'Trạng thái',
            cell: (r) => <StatusBadge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Đang nhận' : 'Đã tắt'}</StatusBadge>,
        },
    ];
    if (!canManage) return columns;
    return [
        ...columns,
        {
            id: 'actions', header: '', align: 'right', locked: true, width: '1%',
            cell: (r) => (
                <RowActions onClick={(e) => e.stopPropagation()}>
                    <IconButton aria-label={`Sửa ${r.name}`} size="sm" variant="ghost" onClick={() => onEdit(r)}><Pencil size={15} /></IconButton>
                    <IconButton aria-label={`Xoá ${r.name}`} size="sm" variant="ghost" onClick={() => onDelete(r)}><Trash2 size={15} /></IconButton>
                </RowActions>
            ),
        },
    ];
}
