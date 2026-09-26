import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { IconButton, RowActions, StatusBadge, Switch, type DataTableColumn } from '../../../components/ui';
import { formatDate, formatNumber } from '../../../utils/format';
import type { UrlRedirect } from '../../../api/content/url-redirects';
import { SOURCE_LABELS, STATUS_META } from './url-redirect-schema';

interface ColumnActions {
  canManage: boolean;
  onEdit: (row: UrlRedirect) => void;
  onDelete: (row: UrlRedirect) => void;
  onToggle: (row: UrlRedirect, active: boolean) => void;
}

/** Cột của bảng chuyển hướng. `canManage` ẩn thao tác ghi với người chỉ có quyền xem. */
export function buildUrlRedirectColumns({ canManage, onEdit, onDelete, onToggle }: ColumnActions): DataTableColumn<UrlRedirect>[] {
  const columns: DataTableColumn<UrlRedirect>[] = [
    {
      id: 'fromPath', header: 'Đường dẫn cũ → mới', sortable: true, locked: true, nowrap: false,
      cell: (r) => (
        <div className="min-w-0">
          <p className="num break-all text-13 font-medium text-fg">{r.fromPath}</p>
          <p className="flex items-start gap-1 text-xs text-fg-muted">
            <ArrowRight size={12} className="mt-0.5 shrink-0" aria-hidden />
            <span className="num break-all">{r.toPath ?? 'Đã gỡ (410)'}</span>
          </p>
          {r.note && <p className="line-clamp-1 text-2xs text-fg-subtle">{r.note}</p>}
        </div>
      ),
    },
    {
      id: 'statusCode', header: 'Mã', align: 'center', sortable: true,
      cell: (r) => <StatusBadge tone={STATUS_META[r.statusCode].tone}>{STATUS_META[r.statusCode].label}</StatusBadge>,
    },
    {
      id: 'hitCount', header: 'Lượt truy cập', align: 'right', sortable: true,
      cell: (r) => <span className="num">{formatNumber(r.hitCount)}</span>,
    },
    {
      id: 'lastHitAt', header: 'Truy cập gần nhất', sortable: true,
      cell: (r) => <span className="text-xs text-fg-muted">{r.lastHitAt ? formatDate(r.lastHitAt) : 'Chưa có'}</span>,
    },
    {
      id: 'source', header: 'Nguồn', defaultHidden: true,
      cell: (r) => <span className="text-xs text-fg-muted">{SOURCE_LABELS[r.source] ?? r.source}</span>,
    },
    {
      id: 'isActive', header: 'Bật', align: 'center',
      cell: (r) => (
        <Switch
          size="sm"
          checked={r.isActive}
          disabled={!canManage}
          aria-label={r.isActive ? `Tắt chuyển hướng ${r.fromPath}` : `Bật chuyển hướng ${r.fromPath}`}
          onCheckedChange={(checked) => onToggle(r, checked)}
        />
      ),
    },
  ];

  if (!canManage) return columns;

  return [
    ...columns,
    {
      id: 'actions', header: '', align: 'right', locked: true, width: '1%',
      cell: (r) => (
        <RowActions onClick={(e) => e.stopPropagation()}>
          <IconButton aria-label={`Sửa ${r.fromPath}`} size="sm" variant="ghost" onClick={() => onEdit(r)}>
            <Pencil size={15} />
          </IconButton>
          <IconButton aria-label={`Xoá ${r.fromPath}`} size="sm" variant="ghost" onClick={() => onDelete(r)}>
            <Trash2 size={15} />
          </IconButton>
        </RowActions>
      ),
    },
  ];
}
