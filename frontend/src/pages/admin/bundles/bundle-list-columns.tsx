import { Pencil, Trash2 } from 'lucide-react';
import {
    IconButton, Img, Money, RowActions, StatusBadge, Switch, type DataTableColumn,
} from '../../../components/ui';
import { formatDate } from '../../../utils/format';
import type { BundleView } from '../../../api/bundle';

interface ColumnActions {
    canManage: boolean;
    onEdit: (row: BundleView) => void;
    onDelete: (row: BundleView) => void;
    onToggle: (row: BundleView, active: boolean) => void;
}

/** Trạng thái hiệu lực theo khung ngày (không xét công tắc bật/tắt). */
export function validityOf(b: BundleView, now = new Date()): { tone: 'success' | 'warning' | 'neutral'; label: string } {
    if (b.validTo && new Date(b.validTo) < now) return { tone: 'neutral', label: 'Đã hết hạn' };
    if (b.validFrom && new Date(b.validFrom) > now) return { tone: 'warning', label: 'Sắp áp dụng' };
    return { tone: 'success', label: 'Đang hiệu lực' };
}

const range = (b: BundleView) => {
    if (!b.validFrom && !b.validTo) return 'Không giới hạn';
    return `${b.validFrom ? formatDate(b.validFrom) : '…'} – ${b.validTo ? formatDate(b.validTo) : '…'}`;
};

export function buildBundleColumns({ canManage, onEdit, onDelete, onToggle }: ColumnActions): DataTableColumn<BundleView>[] {
    const columns: DataTableColumn<BundleView>[] = [
        {
            id: 'name', header: 'Combo', locked: true, nowrap: false,
            cell: (b) => (
                <div className="flex items-center gap-3">
                    <Img src={b.imageUrl ?? b.items[0]?.productImage ?? null} alt="" ratio="1/1" fit="contain" blend
                        className="h-10 w-10 shrink-0 rounded-md" />
                    <div className="min-w-0">
                        <p className="line-clamp-1 text-13 font-medium text-fg">{b.name}</p>
                        <p className="line-clamp-1 text-2xs text-fg-subtle">{b.items.map(i => i.productName).join(' + ')}</p>
                    </div>
                </div>
            ),
        },
        { id: 'items', header: 'Số món', align: 'right', cell: (b) => <span className="num">{b.items.length}</span> },
        {
            id: 'price', header: 'Giá combo', align: 'right',
            cell: (b) => (
                <div>
                    <Money value={b.bundlePrice} />
                    <p className="text-2xs text-fg-subtle">{b.pricingMode === 'percent' ? `Giảm ${b.discountPercent}%` : 'Giá cố định'}</p>
                </div>
            ),
        },
        { id: 'savings', header: 'Tiết kiệm', align: 'right', cell: (b) => <span className="text-savings"><Money value={b.savings} /></span> },
        {
            id: 'validity', header: 'Hiệu lực',
            cell: (b) => {
                const v = validityOf(b);
                return (
                    <div className="space-y-0.5">
                        <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                        <p className="num text-2xs text-fg-subtle">{range(b)}</p>
                    </div>
                );
            },
        },
        {
            id: 'isActive', header: 'Đang bán', align: 'center',
            cell: (b) => (
                <Switch size="sm" checked={b.isActive} disabled={!canManage}
                    aria-label={b.isActive ? `Tắt combo ${b.name}` : `Bật combo ${b.name}`}
                    onCheckedChange={(checked) => onToggle(b, checked)} />
            ),
        },
    ];

    if (!canManage) return columns;
    return [
        ...columns,
        {
            id: 'actions', header: '', align: 'right', locked: true, width: '1%',
            cell: (b) => (
                <RowActions onClick={(e) => e.stopPropagation()}>
                    <IconButton aria-label={`Sửa ${b.name}`} size="sm" variant="ghost" onClick={() => onEdit(b)}>
                        <Pencil size={15} />
                    </IconButton>
                    <IconButton aria-label={`Xoá ${b.name}`} size="sm" variant="ghost" onClick={() => onDelete(b)}>
                        <Trash2 size={15} />
                    </IconButton>
                </RowActions>
            ),
        },
    ];
}
