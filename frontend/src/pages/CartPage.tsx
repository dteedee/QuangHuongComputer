import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, RotateCcw, ShieldCheck, ShoppingBag, Tag, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ROUTES } from '../routes/route-paths';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';
import { FreeShippingProgress } from '../components/cart/free-shipping-progress';
import { useFreeShipping } from '../hooks/use-free-shipping';
import { CartLineRow } from '../components/cart/cart-line-row';
import { CartTotals } from '../components/cart/cart-totals';
import { CartBoughtTogetherRow } from '../components/cart/cart-bought-together-row';
import { CartBundleGroupList } from '../components/cart/cart-bundle-group-list';
import {
    Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton,
} from '../components/ui';
import { fadeUp, stagger } from '../design-system/motion';

const TRUST = [
    { icon: ShieldCheck, title: 'Bảo hành chính hãng', tone: 'text-success' },
    { icon: Truck, title: 'Giao hàng toàn quốc', tone: 'text-brand' },
    { icon: RotateCcw, title: 'Đổi trả trong 7 ngày', tone: 'text-warning' },
] as const;

export const CartPage = () => {
    const {
        items, isGuest, removeFromCart, updateQuantity, clearCart, couponCode,
        subtotal, discountAmount, shippingAmount, total, tax, vatBreakdown,
        isLoading, isUpdating, error, refreshCart,
    } = useCart();
    const standaloneItems = items.filter(i => !i.bundleId);
    const navigate = useNavigate();
    const [confirmClear, setConfirmClear] = useState(false);
    // Gọi ở đầu component: bên dưới có nhiều nhánh return sớm (lỗi / đang tải / giỏ rỗng),
    // đặt hook sau chúng sẽ vi phạm rules-of-hooks.
    const freeShipping = useFreeShipping(Math.max(0, subtotal - discountAmount));

    // ---------- 1. Lỗi ----------
    if (error && items.length === 0) {
        return (
            <div className="mx-auto max-w-shell px-4 sm:px-6 py-16">
                <ErrorState
                    title="Không tải được giỏ hàng"
                    description={error}
                    onRetry={() => { void refreshCart(); }}
                />
            </div>
        );
    }

    // ---------- 2. Đang tải ----------
    if (isLoading && items.length === 0) {
        return (
            <div className="mx-auto max-w-shell px-4 sm:px-6 py-10 space-y-6">
                <Skeleton className="h-9 w-56" />
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-3">
                        {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                    </div>
                    <Skeleton className="lg:w-[360px] h-72 rounded-xl" />
                </div>
            </div>
        );
    }

    // ---------- 3. Rỗng ----------
    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-shell px-4 sm:px-6 py-16">
                <EmptyState
                    icon={ShoppingBag}
                    title="Giỏ hàng đang trống"
                    description="Chọn sản phẩm bạn thích rồi quay lại đây để đặt hàng. Giỏ hàng được giữ lại kể cả khi bạn chưa đăng nhập."
                    action={{ label: 'Xem tất cả sản phẩm', onClick: () => navigate(ROUTES.PRODUCTS) }}
                />
                <div className="mt-12">
                    <RecentlyViewedProducts title="Bạn đã xem gần đây" showClearButton />
                </div>
            </div>
        );
    }

    // ---------- 4. Có hàng ----------
    const progressAmount = Math.max(0, subtotal - discountAmount);

    return (
        <div className="bg-bg min-h-screen py-6 lg:py-10">
            <div className="mx-auto max-w-shell px-4 sm:px-6">
                <PageHeader
                    title="Giỏ hàng của bạn"
                    description={`${items.length} sản phẩm đang chờ thanh toán`}
                />

                {isGuest && (
                    <Card className="mb-6">
                        <CardBody className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <span className="text-fg-muted">
                                Bạn đang mua với tư cách khách. Đăng nhập để giữ giỏ hàng trên mọi thiết bị và tích điểm.
                            </span>
                            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LOGIN, { state: { from: ROUTES.CART } })}>
                                Đăng nhập
                            </Button>
                        </CardBody>
                    </Card>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 min-w-0 space-y-4">
                        <FreeShippingProgress amount={progressAmount} threshold={freeShipping.threshold} />

                        <CartBundleGroupList />

                        {standaloneItems.length > 0 && (
                        <motion.div
                            variants={stagger()} initial="hidden" animate="show"
                            className="rounded-xl border border-line bg-surface shadow-xs divide-y divide-line"
                        >
                            {standaloneItems.map((item) => (
                                <motion.div key={`${item.id}-${item.variantId ?? ''}`} variants={fadeUp}>
                                    <CartLineRow
                                        item={item}
                                        disabled={isUpdating}
                                        onQuantityChange={(id, qty) => { void updateQuantity(id, qty); }}
                                        onRemove={(id) => { void removeFromCart(id); }}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                        )}

                        <div className="flex flex-wrap justify-between items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
                                <RotateCcw size={14} /> Xóa tất cả
                            </Button>
                            <Link to={ROUTES.PRODUCTS} className="text-sm font-semibold text-brand-text hover:underline inline-flex items-center gap-1">
                                Tiếp tục mua sắm <ArrowRight size={14} />
                            </Link>
                        </div>

                        <CartBoughtTogetherRow />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {TRUST.map(({ icon: Icon, title, tone }) => (
                                <div key={title} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-xs">
                                    <Icon size={18} className={tone} aria-hidden />
                                    <span className="text-13 font-medium text-fg-muted">{title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:w-[360px] flex-shrink-0">
                        <Card className="lg:sticky lg:top-24">
                            <CardBody className="space-y-5">
                                <h2 className="text-base font-semibold text-fg">Tóm tắt đơn hàng</h2>

                                {couponCode && (
                                    <div className="flex items-center gap-2 rounded-lg bg-success-subtle px-3 py-2 text-13 text-success">
                                        <Tag size={14} aria-hidden />
                                        Mã đã áp: <Badge variant="success">{couponCode}</Badge>
                                    </div>
                                )}

                                <CartTotals
                                    subtotal={subtotal}
                                    discountAmount={discountAmount}
                                    shippingAmount={shippingAmount}
                                    total={total}
                                    tax={tax}
                                    vatBreakdown={vatBreakdown}
                                    shippingUnknown={isGuest}
                                    freeShippingReached={freeShipping.reached}
                                />

                                <p className="text-2xs text-fg-subtle">
                                    Giá đã bao gồm VAT. Mã giảm giá và khuyến mãi tự động được áp ở bước thanh toán.
                                </p>

                                <Button className="w-full" size="lg" onClick={() => navigate(ROUTES.CHECKOUT)} disabled={isUpdating}>
                                    Tiến hành thanh toán <ArrowRight size={18} />
                                </Button>
                            </CardBody>
                        </Card>
                    </div>
                </div>

                <div className="mt-10">
                    <RecentlyViewedProducts title="Có thể bạn cũng thích" showClearButton />
                </div>
            </div>

            <ConfirmDialog
                open={confirmClear}
                onOpenChange={setConfirmClear}
                title="Xóa toàn bộ giỏ hàng?"
                description="Tất cả sản phẩm trong giỏ sẽ bị gỡ. Bạn có thể thêm lại bất cứ lúc nào."
                confirmLabel="Xóa tất cả"
                tone="danger"
                onConfirm={() => { void clearCart(); }}
            />
        </div>
    );
};

export default CartPage;
