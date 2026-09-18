import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { Badge, IconButton, Img, Price } from '../ui';
import { CartRemoveButton } from './cart-remove-button';
import type { CartItem } from '../../context/CartContext';

interface CartLineRowProps {
  item: CartItem;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  disabled?: boolean;
}

/**
 * Một dòng giỏ hàng — dùng chung cho trang giỏ và ngăn kéo giỏ.
 * Ở <640px các nút số lượng / thành tiền / xoá xuống hàng thứ hai: xếp chung một hàng ở 390px
 * làm trang tràn ngang 7px (đo bằng `document.documentElement.scrollWidth` trên Chrome headless).
 */
export function CartLineRow({ item, onQuantityChange, onRemove, disabled }: CartLineRowProps) {
  const outOfStock = item.stockQuantity <= 0;
  const overStock = item.quantity > item.stockQuantity;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
        <Link to={`/san-pham/${item.id}`} className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-stage">
          <Img src={item.imageUrl} alt={item.name} ratio="1/1" fit="contain" blend className="h-full w-full" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={`/san-pham/${item.id}`}
            className="line-clamp-2 text-sm font-semibold leading-snug text-fg hover:text-brand-text">
            {item.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {item.variantName && <Badge variant="neutral">{item.variantName}</Badge>}
            {outOfStock && <Badge variant="danger">Hết hàng</Badge>}
            {!outOfStock && overStock && <Badge variant="warning">Kho chỉ còn {item.stockQuantity}</Badge>}
          </div>
          <p className="mt-1 text-2xs text-fg-subtle">
            <Price value={item.price} className="text-2xs" showDiscount={false} /> / cái
          </p>
        </div>

      {/* Ở 390px nhóm điều khiển chiếm trọn một hàng; từ 640px trở lên nằm cùng hàng với ảnh. */}
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-sunken p-1">
          <IconButton
            aria-label={`Giảm số lượng ${item.name}`}
            size="sm" variant="ghost"
            disabled={disabled || item.quantity <= 1}
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
          >
            <Minus size={14} />
          </IconButton>
          <span className="num w-8 text-center text-sm font-semibold text-fg" aria-live="polite">{item.quantity}</span>
          <IconButton
            aria-label={`Tăng số lượng ${item.name}`}
            size="sm" variant="ghost"
            disabled={disabled || item.quantity >= item.stockQuantity}
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          >
            <Plus size={14} />
          </IconButton>
        </div>

        <Price value={item.lineTotal} className="text-base font-bold sm:min-w-[110px] sm:justify-end" showDiscount={false} />

        <CartRemoveButton onConfirm={() => onRemove(item.id)} />
      </div>
    </div>
  );
}

export default CartLineRow;
