import { ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Pencil, Power, Trash2 } from 'lucide-react';
import { Badge, IconButton, Img, RowActions, StatusBadge } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import type { Category } from '../../../api/catalog/types';
import type { CategoryNode } from './category-tree-model';

interface Props {
  node: CategoryNode;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onToggleActive: (c: Category) => void;
  onMove: (c: Category, direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const vatLabel = (c: Category) =>
  c.vatRate == null ? 'VAT —' : `VAT ${(c.vatRate * 100).toFixed(c.vatRate * 100 % 1 === 0 ? 0 : 1)}%`;

/** Một dòng của cây ngành hàng. Thụt lề theo `depth`, không lồng `<ul>` vô hạn. */
export function CategoryTreeRow({
  node, expanded, onToggleExpand, onEdit, onDelete, onToggleActive, onMove, canMoveUp, canMoveDown,
}: Props) {
  const hasChildren = node.children.length > 0;
  return (
    <li
      className="group/row flex items-center gap-3 border-b border-line/70 px-3 py-2.5 last:border-b-0 hover:bg-fg/[.025]"
      style={{ paddingLeft: `${0.75 + node.depth * 1.5}rem` }}
    >
      {hasChildren ? (
        <IconButton
          aria-label={expanded ? 'Thu gọn nhánh' : 'Mở rộng nhánh'}
          size="sm"
          variant="ghost"
          onClick={onToggleExpand}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </IconButton>
      ) : (
        <span className="w-8" aria-hidden />
      )}

      <div className="w-9 shrink-0">
        {node.imageUrl ? (
          <Img src={node.imageUrl} alt="" ratio="1/1" fit="cover" wrapperClassName="rounded-md" />
        ) : (
          <div className="aspect-square rounded-md bg-sunken" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-13 font-medium text-fg">{node.name}</p>
        <p className="truncate text-xs text-fg-subtle">/{node.slug || '—'}</p>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <Badge variant="neutral">{vatLabel(node)}</Badge>
        {node.vatReductionEligible && <Badge variant="info">Được giảm VAT</Badge>}
        {node.isSerialTracked && <Badge variant="violet">Theo sê-ri</Badge>}
      </div>

      <span className="num w-16 text-right text-xs text-fg-muted">{node.productCount ?? 0} SP</span>
      <StatusBadge tone={node.isActive ? 'success' : 'neutral'}>
        {node.isActive ? 'Hiện' : 'Ẩn'}
      </StatusBadge>

      <RowActions>
        <Can permission={PERMISSIONS.CATALOG_EDIT}>
          <IconButton aria-label="Đưa lên trên" size="sm" variant="ghost" disabled={!canMoveUp} onClick={() => onMove(node, -1)}>
            <ChevronsUp size={15} />
          </IconButton>
          <IconButton aria-label="Đưa xuống dưới" size="sm" variant="ghost" disabled={!canMoveDown} onClick={() => onMove(node, 1)}>
            <ChevronsDown size={15} />
          </IconButton>
          <IconButton aria-label="Sửa ngành hàng" size="sm" variant="ghost" onClick={() => onEdit(node)}>
            <Pencil size={15} />
          </IconButton>
          <IconButton
            aria-label={node.isActive ? 'Ẩn ngành hàng' : 'Hiện ngành hàng'}
            size="sm"
            variant="ghost"
            onClick={() => onToggleActive(node)}
          >
            <Power size={15} />
          </IconButton>
        </Can>
        <Can permission={PERMISSIONS.CATALOG_DELETE}>
          <IconButton aria-label="Xoá ngành hàng" size="sm" variant="ghost" onClick={() => onDelete(node)}>
            <Trash2 size={15} />
          </IconButton>
        </Can>
      </RowActions>
    </li>
  );
}
