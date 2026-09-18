import { Link } from 'react-router-dom';
import { Img, Money, StatusBadge } from '../../../components/ui';
import { paths } from '../../../routes';
import type { DataTableColumn } from '../../../components/ui';
import type { Product } from '../../../api/catalog/types';
import { formatDate } from './admin-formatting';
import type { StockState } from './use-admin-product-list';

const STOCK_TONE: Record<StockState, 'success' | 'warning' | 'danger' | 'neutral'> = {
  in: 'success', low: 'warning', out: 'danger', all: 'neutral',
};
const STOCK_LABEL: Record<StockState, string> = {
  in: 'Còn hàng', low: 'Sắp hết', out: 'Hết hàng', all: '—',
};

/** Cột của bảng sản phẩm. Tách file để `product-list-page.tsx` dưới 200 dòng. */
export function buildProductColumns(stockOf: (p: Product) => StockState): DataTableColumn<Product>[] {
  return [
    {
      id: 'name',
      header: 'Sản phẩm',
      sortable: true,
      locked: true,
      width: '20rem',
      cell: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          {p.thumbnailUrl || p.imageUrl ? (
            <div className="w-10 shrink-0">
              <Img src={p.thumbnailUrl || p.imageUrl} alt={p.name} ratio="1/1" blend wrapperClassName="rounded-md" />
            </div>
          ) : (
            /* `Img`'s own "Chưa có ảnh" placeholder carries a caption that does not fit a 40px
               thumbnail — at this size an empty tile plus the row's own text is clearer. */
            <div className="h-10 w-10 shrink-0 rounded-md bg-sunken" aria-hidden />
          )}
          <div className="min-w-0">
            <Link
              to={paths.backoffice.productEdit(p.id)}
              className="line-clamp-2 block max-w-[15rem] text-13 font-medium text-fg hover:text-brand-text"
            >
              {p.name}
            </Link>
            <p className="num text-xs text-fg-subtle">{p.sku || '—'}</p>
          </div>
        </div>
      ),
    },
    { id: 'categoryName', header: 'Ngành hàng', width: '10rem', cell: (p) => <span className="block max-w-[7rem] truncate">{p.categoryName || '—'}</span> },
    { id: 'brandName', header: 'Thương hiệu', defaultHidden: true, cell: (p) => p.brandName || '—' },
    { id: 'price', header: 'Giá bán', align: 'right', sortable: true, cell: (p) => <Money value={p.price} /> },
    { id: 'costPrice', header: 'Giá vốn', align: 'right', defaultHidden: true, cell: (p) => <Money value={p.costPrice ?? null} /> },
    {
      id: 'stockQuantity',
      header: 'Tồn kho',
      align: 'right',
      sortable: true,
      cell: (p) => <span className="num">{p.stockQuantity.toLocaleString('vi-VN')}</span>,
    },
    {
      id: 'stockState',
      header: 'Tình trạng',
      cell: (p) => {
        const s = stockOf(p);
        return <StatusBadge tone={STOCK_TONE[s]}>{STOCK_LABEL[s]}</StatusBadge>;
      },
    },
    {
      id: 'publishedAt',
      header: 'Hiển thị',
      cell: (p) =>
        !p.isActive ? (
          <StatusBadge tone="neutral">Ngừng bán</StatusBadge>
        ) : p.publishedAt ? (
          <StatusBadge tone="success">Trên web</StatusBadge>
        ) : (
          <StatusBadge tone="warning">Chưa đăng</StatusBadge>
        ),
    },
    {
      id: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      defaultHidden: true,
      cell: (p) => <span className="num">{formatDate(p.createdAt)}</span>,
    },
  ];
}
