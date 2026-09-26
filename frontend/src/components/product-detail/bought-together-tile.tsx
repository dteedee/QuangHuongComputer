/**
 * One product in the "Thường được mua cùng" row: image, name (links to the PDP), price and a
 * checkbox. The anchor tile ("Sản phẩm đang xem") is always included — its checkbox is locked.
 */
import { Link } from 'react-router-dom';
import type { Product } from '../../api/catalog/types';
import { productHref } from './product-href';
import { Checkbox, Img, Price } from '../ui';

interface BoughtTogetherTileProps {
    product: Product;
    checked: boolean;
    onToggle?: (checked: boolean) => void;
    /** Anchor product: always part of the bundle, checkbox disabled. */
    anchor?: boolean;
    /** "12 đơn" social proof; hidden for the related fallback (0). */
    orderCount?: number;
}

export function BoughtTogetherTile({ product, checked, onToggle, anchor = false, orderCount = 0 }: BoughtTogetherTileProps) {
    const inputId = `bt-${product.id}`;
    return (
        <li className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
                <Checkbox
                    id={inputId}
                    checked={checked}
                    disabled={anchor}
                    onChange={(e) => onToggle?.(e.target.checked)}
                    aria-label={anchor ? `${product.name} (sản phẩm đang xem)` : `Chọn mua kèm ${product.name}`}
                />
                {anchor ? (
                    <span className="text-2xs font-medium text-fg-subtle">Đang xem</span>
                ) : orderCount > 0 ? (
                    <span className="num text-2xs text-fg-subtle">{orderCount} đơn mua cùng</span>
                ) : null}
            </div>
            <Img
                src={product.thumbnailUrl || product.imageUrl}
                alt={product.name}
                ratio="1/1"
                blend
                wrapperClassName="rounded-lg bg-stage"
            />
            {anchor ? (
                <span className="line-clamp-2 min-h-[2.5rem] text-13 font-medium leading-5 text-fg">{product.name}</span>
            ) : (
                <Link
                    to={productHref(product)}
                    className="line-clamp-2 min-h-[2.5rem] text-13 font-medium leading-5 text-fg hover:text-brand-text"
                >
                    {product.name}
                </Link>
            )}
            <Price value={product.price} compareAt={product.oldPrice} showDiscount={false} />
        </li>
    );
}
