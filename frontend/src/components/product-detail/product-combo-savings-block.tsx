import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Plus, ShoppingCart } from 'lucide-react';
import { bundleApi, type BundleView } from '../../api/bundle';
import { useCart } from '../../context/CartContext';
import { Badge, Button, Img, Price, Skeleton, formatDong } from '../ui';

interface ProductComboSavingsBlockProps {
    productId: string;
}

/**
 * "Combo tiết kiệm" trên trang sản phẩm: mọi combo đang bán có chứa sản phẩm này.
 * Giá combo + tiền tiết kiệm do server tính từ giá hiện hành; giỏ hàng tính lại lần nữa.
 * Không có combo nào ⇒ không render gì (không để lại khung trống).
 */
export function ProductComboSavingsBlock({ productId }: ProductComboSavingsBlockProps) {
    const query = useQuery({
        queryKey: ['catalog', 'bundles', 'product', productId],
        queryFn: () => bundleApi.getBundlesByProduct(productId),
        enabled: !!productId,
        staleTime: 60_000,
    });

    if (query.isPending) return <Skeleton className="mt-8 h-40 w-full rounded-xl" />;
    if (query.isError || !query.data || query.data.length === 0) return null;

    return (
        <section aria-labelledby="combo-tiet-kiem" className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-xs lg:p-7">
            <h2 id="combo-tiet-kiem" className="flex items-center gap-2 font-display text-lg font-bold text-fg">
                <Boxes size={20} className="text-brand-text" aria-hidden /> Combo tiết kiệm
            </h2>
            <div className="mt-4 space-y-4">
                {query.data.map(bundle => <ComboCard key={bundle.id} bundle={bundle} />)}
            </div>
        </section>
    );
}

function ComboCard({ bundle }: { bundle: BundleView }) {
    const { addBundleToCart } = useCart();
    const [adding, setAdding] = useState(false);

    const add = async () => {
        setAdding(true);
        try { await addBundleToCart(bundle, 1); } finally { setAdding(false); }
    };

    return (
        <article className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-fg">{bundle.name}</h3>
                {bundle.pricingMode === 'percent' && bundle.discountPercent
                    ? <Badge variant="brand"><span className="num">-{bundle.discountPercent}%</span></Badge>
                    : null}
            </div>

            <ul className="mt-3 flex flex-wrap items-center gap-2">
                {bundle.items.map((item, index) => (
                    <li key={item.id} className="flex items-center gap-2">
                        {index > 0 && <Plus size={14} className="text-fg-subtle" aria-hidden />}
                        <Link
                            to={item.productSlug ? `/san-pham/${item.productSlug}` : `/san-pham/${item.productId}`}
                            className="flex max-w-[14rem] items-center gap-2 rounded-lg bg-sunken p-1.5 pr-3"
                        >
                            <Img src={item.productImage ?? null} alt={item.productName} ratio="1/1" fit="contain" blend
                                className="h-12 w-12 shrink-0 rounded-md" />
                            <span className="line-clamp-2 text-xs text-fg">
                                {item.quantity > 1 && <span className="num font-semibold">{item.quantity} × </span>}
                                {item.productName}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <Price value={bundle.bundlePrice} compareAt={bundle.originalPrice} className="text-lg font-bold" />
                    <p className="mt-1 text-13 font-semibold text-savings">
                        Tiết kiệm <span className="num">{formatDong(bundle.savings)}₫</span>
                    </p>
                </div>
                <Button icon={ShoppingCart} loading={adding} disabled={!bundle.isPurchasable} onClick={() => void add()}>
                    {bundle.isPurchasable ? 'Thêm combo vào giỏ' : 'Combo tạm hết hàng'}
                </Button>
            </div>
        </article>
    );
}

export default ProductComboSavingsBlock;
