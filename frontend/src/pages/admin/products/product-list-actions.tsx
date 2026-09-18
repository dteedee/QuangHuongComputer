import { Copy, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { Button, IconButton, RowActions } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import type { Product } from '../../../api/catalog/types';

export interface ProductRowHandlers {
  onEdit: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onTogglePublish: (p: Product) => void;
  onHide: (p: Product) => void;
}

/** Nút hành động trên từng dòng — `<Can>` gác đúng quyền của backend. */
export function ProductRowActions({ product, handlers }: { product: Product; handlers: ProductRowHandlers }) {
  const published = Boolean(product.publishedAt);
  return (
    <RowActions>
      <Can permission={PERMISSIONS.CATALOG_EDIT}>
        <IconButton aria-label="Sửa sản phẩm" size="sm" variant="ghost" onClick={() => handlers.onEdit(product)}>
          <Pencil size={15} />
        </IconButton>
      </Can>
      <Can permission={PERMISSIONS.CATALOG_CREATE}>
        <IconButton aria-label="Nhân bản sản phẩm" size="sm" variant="ghost" onClick={() => handlers.onDuplicate(product)}>
          <Copy size={15} />
        </IconButton>
      </Can>
      <Can permission={PERMISSIONS.CATALOG_EDIT}>
        <IconButton
          aria-label={published ? 'Gỡ khỏi web' : 'Hiện trên web'}
          size="sm"
          variant="ghost"
          onClick={() => handlers.onTogglePublish(product)}
        >
          {published ? <EyeOff size={15} /> : <Eye size={15} />}
        </IconButton>
      </Can>
      <Can permission={PERMISSIONS.CATALOG_DELETE}>
        <IconButton aria-label="Ẩn sản phẩm" size="sm" variant="ghost" onClick={() => handlers.onHide(product)}>
          <Trash2 size={15} />
        </IconButton>
      </Can>
    </RowActions>
  );
}


export interface ProductBulkActionsProps {
  ids: string[];
  categories: Array<{ value: string; label: string }>;
  onActivate: () => void;
  onChangeCategory: () => void;
  onHide: () => void;
}

/** Thanh hành động hàng loạt nổi ở đáy bảng khi có dòng được chọn. */
export function ProductBulkActions({ ids, onActivate, onChangeCategory, onHide }: ProductBulkActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={PERMISSIONS.CATALOG_EDIT}>
        <Button size="sm" variant="outline" onClick={onActivate}>Mở bán lại</Button>
        <Button size="sm" variant="outline" onClick={onChangeCategory}>Chuyển ngành hàng</Button>
      </Can>
      <Can permission={PERMISSIONS.CATALOG_DELETE}>
        <Button size="sm" variant="danger" onClick={onHide}>Ẩn {ids.length} sản phẩm</Button>
      </Can>
    </div>
  );
}
