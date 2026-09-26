import type { CartItem } from '../../context/CartContext';

/** The cart line the "mua kèm" suggestions are anchored on: highest server line total (the laptop, not the mouse pad). */
export function pickAnchorLine(items: CartItem[]): CartItem | undefined {
    return items.reduce<CartItem | undefined>(
        (best, item) => (!best || item.lineTotal > best.lineTotal ? item : best), undefined);
}
