/**
 * "Thường được mua cùng" on the PDP. The anchor product plus up to 6 suggestions, each with a
 * checkbox; "Thêm tất cả vào giỏ" adds the anchor + every checked item.
 *
 * The total is the SERVER's: unchecking an item re-asks `/bought-together?selected=…` (cached,
 * the item row keeps showing meanwhile). Nothing here adds prices.
 *
 * Hidden while loading-failed or empty — a missing suggestion block is not an error to show a
 * shopper. Not rendered for products with variants (the page decides): the one-click bundle
 * cannot pick a variant for them.
 */
import { useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useBoughtTogether } from '../../api/catalog/bought-together';
import { useCart } from '../../context/CartContext';
import { Button, Price, Skeleton, notify } from '../ui';
import { BoughtTogetherTile } from './bought-together-tile';

interface ProductBoughtTogetherBlockProps {
    productId: string;
}

export default function ProductBoughtTogetherBlock({ productId }: ProductBoughtTogetherBlockProps) {
    const [unchecked, setUnchecked] = useState<Set<string>>(() => new Set());
    const { addToCart } = useCart();
    const [adding, setAdding] = useState(false);

    const base = useBoughtTogether(productId);
    const items = useMemo(() => base.data?.items ?? [], [base.data]);
    const selectedIds = useMemo(
        () => items.map((i) => i.product.id).filter((id) => !unchecked.has(id)),
        [items, unchecked],
    );
    // Only ask for a partial total when the shopper actually unchecked something.
    const priced = useBoughtTogether(productId, 6, unchecked.size > 0 ? selectedIds : undefined);

    if (base.isPending) {
        return <Skeleton className="h-72 w-full rounded-2xl" aria-label="Đang tải gợi ý mua kèm" />;
    }
    if (base.isError || !base.data || items.length === 0) return null;

    const { anchor, source } = base.data;
    const total = priced.data?.total ?? base.data.total;
    const count = selectedIds.length + 1;

    const toggle = (id: string, checked: boolean) =>
        setUnchecked((prev) => {
            const next = new Set(prev);
            if (checked) next.delete(id); else next.add(id);
            return next;
        });

    const addAll = async () => {
        setAdding(true);
        const bundle = [anchor, ...items.filter((i) => !unchecked.has(i.product.id)).map((i) => i.product)];
        let added = 0;
        for (const product of bundle) {
            if (await addToCart(product, 1, { silent: true })) added += 1;
        }
        setAdding(false);
        if (added === bundle.length) notify.success(`Đã thêm ${added} sản phẩm vào giỏ hàng`);
        else if (added > 0) notify.warning(`Đã thêm ${added}/${bundle.length} sản phẩm — một số món không thêm được`);
    };

    return (
        <section aria-labelledby="bought-together-heading" className="rounded-2xl border border-line bg-surface p-5 shadow-xs lg:p-7">
            <h2 id="bought-together-heading" className="text-2xl font-bold tracking-tight text-fg">
                {source === 'co-purchase' ? 'Thường được mua cùng' : 'Gợi ý mua kèm'}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
                {source === 'co-purchase'
                    ? 'Khách mua sản phẩm này thường chọn thêm những món dưới đây.'
                    : 'Sản phẩm cùng danh mục, cùng hãng đang có hàng.'}
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    <BoughtTogetherTile product={anchor} checked anchor />
                    {items.map((item) => (
                        <BoughtTogetherTile
                            key={item.product.id}
                            product={item.product}
                            orderCount={item.orderCount}
                            checked={!unchecked.has(item.product.id)}
                            onToggle={(checked) => toggle(item.product.id, checked)}
                        />
                    ))}
                </ul>

                <div className="flex flex-col justify-center gap-3 rounded-xl bg-sunken p-4 lg:self-start">
                    <span className="text-sm text-fg-muted">
                        Tổng cho <span className="num font-semibold text-fg">{count}</span> sản phẩm
                    </span>
                    <Price value={total} className="text-2xl" />
                    <p className="text-2xs text-fg-subtle">Giá đã gồm VAT; khuyến mãi được áp khi thanh toán.</p>
                    <Button onClick={() => { void addAll(); }} loading={adding} disabled={priced.isFetching}>
                        <ShoppingCart className="h-4 w-4" aria-hidden /> Thêm tất cả vào giỏ
                    </Button>
                </div>
            </div>
        </section>
    );
}
