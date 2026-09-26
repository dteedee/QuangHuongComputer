/**
 * Cart page suggestion row: "Thường được mua cùng" for the most valuable line in the cart
 * (the laptop, not the mouse pad), minus anything already in the cart. One tap adds an item.
 * Renders nothing when there is nothing useful to suggest or the request fails.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useBoughtTogether } from '../../api/catalog/bought-together';
import { useCart } from '../../context/CartContext';
import { pickAnchorLine } from './pick-cart-anchor-line';
import { Button, Img, Price } from '../ui';
import { productHref } from '../product-detail/product-href';

export function CartBoughtTogetherRow() {
    const { items, addToCart } = useCart();
    const [addingId, setAddingId] = useState<string | null>(null);
    const anchor = pickAnchorLine(items);
    const query = useBoughtTogether(anchor?.id);

    const suggestions = useMemo(() => {
        const inCart = new Set(items.map((i) => i.id));
        return (query.data?.items ?? []).filter((s) => !inCart.has(s.product.id)).slice(0, 4);
    }, [items, query.data]);

    if (!anchor || suggestions.length === 0) return null;

    const add = async (id: string) => {
        const suggestion = suggestions.find((s) => s.product.id === id);
        if (!suggestion) return;
        setAddingId(id);
        await addToCart(suggestion.product, 1);
        setAddingId(null);
    };

    return (
        <section aria-labelledby="cart-bought-together-heading" className="rounded-xl border border-line bg-surface p-4 shadow-xs">
            <h2 id="cart-bought-together-heading" className="text-base font-semibold text-fg">
                {query.data?.source === 'co-purchase' ? 'Thường được mua cùng' : 'Có thể bạn cần thêm'}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-13 text-fg-muted">Gợi ý cho {anchor.name}</p>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map(({ product }) => (
                    <li key={product.id} className="flex items-center gap-3 rounded-lg border border-line p-2">
                        <Img
                            src={product.thumbnailUrl || product.imageUrl}
                            alt={product.name}
                            blend
                            wrapperClassName="h-14 w-14 flex-shrink-0 rounded-md bg-stage"
                        />
                        <div className="min-w-0 flex-1">
                            <Link to={productHref(product)} className="line-clamp-2 text-13 font-medium leading-5 text-fg hover:text-brand-text">
                                {product.name}
                            </Link>
                            <Price value={product.price} showDiscount={false} className="text-sm" />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            loading={addingId === product.id}
                            disabled={addingId !== null}
                            onClick={() => { void add(product.id); }}
                            aria-label={`Thêm ${product.name} vào giỏ`}
                        >
                            <Plus className="h-4 w-4" aria-hidden /> Thêm
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
