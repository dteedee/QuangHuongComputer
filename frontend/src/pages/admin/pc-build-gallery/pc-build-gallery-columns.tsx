import { Pencil, Trash2 } from 'lucide-react';
import { IconButton, Money, RowActions, Switch, type DataTableColumn } from '../../../components/ui';
import { PcVerdictBadge } from '../../../components/pc-builder/pc-verdict-badge';
import type { PcGalleryBuild } from '../../../api/pcbuilder-gallery';

interface ColumnActions {
    onEdit: (row: PcGalleryBuild) => void;
    onDelete: (row: PcGalleryBuild) => void;
    onToggle: (row: PcGalleryBuild, field: 'isFeatured' | 'isPublic', value: boolean) => void;
}

export function buildGalleryColumns({ onEdit, onDelete, onToggle }: ColumnActions): DataTableColumn<PcGalleryBuild>[] {
    return [
        {
            id: 'title', header: 'Cấu hình', locked: true, nowrap: false,
            cell: (b) => (
                <div className="min-w-0">
                    <p className="line-clamp-1 text-13 font-medium text-fg">{b.title}</p>
                    <p className="num text-2xs text-fg-subtle">Mã {b.buildCode} · {b.items.length} linh kiện</p>
                </div>
            ),
        },
        { id: 'tag', header: 'Nhu cầu', cell: (b) => b.useCaseLabel },
        { id: 'total', header: 'Giá hiện hành', align: 'right', cell: (b) => <Money value={b.liveTotal} /> },
        { id: 'verdict', header: 'Tương thích', cell: (b) => <PcVerdictBadge verdict={b.overallVerdict} /> },
        { id: 'sortOrder', header: 'Thứ tự', align: 'right', cell: (b) => <span className="num">{b.sortOrder}</span> },
        {
            id: 'isFeatured', header: 'Nổi bật', align: 'center',
            cell: (b) => (
                <Switch size="sm" checked={b.isFeatured} aria-label={`Nổi bật: ${b.title}`}
                    onCheckedChange={(v) => onToggle(b, 'isFeatured', v)} />
            ),
        },
        {
            id: 'isPublic', header: 'Công khai', align: 'center',
            cell: (b) => (
                <Switch size="sm" checked={b.isPublic} aria-label={`Công khai: ${b.title}`}
                    onCheckedChange={(v) => onToggle(b, 'isPublic', v)} />
            ),
        },
        {
            id: 'actions', header: '', locked: true, align: 'right', width: '1%',
            cell: (b) => (
                <RowActions onClick={(e) => e.stopPropagation()}>
                    <IconButton aria-label={`Sửa ${b.title}`} size="sm" variant="ghost" onClick={() => onEdit(b)}>
                        <Pencil size={15} />
                    </IconButton>
                    <IconButton aria-label={`Gỡ ${b.title}`} size="sm" variant="ghost" onClick={() => onDelete(b)}>
                        <Trash2 size={15} />
                    </IconButton>
                </RowActions>
            ),
        },
    ];
}
