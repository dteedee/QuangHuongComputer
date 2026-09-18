import { useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { FreeShippingProgress } from './cart/free-shipping-progress';
import { CartRemoveButton } from './cart/cart-remove-button';
import { CartTotals } from './cart/cart-totals';
import { Badge, Button, Drawer, EmptyState, IconButton, Img, Price, Skeleton } from './ui';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Ngăn kéo giỏ hàng. Khách VÃNG LAI cũng thanh toán được (không còn ép đăng nhập —
 * trước đây nút "Thanh toán" đá thẳng sang /login nên luồng khách vãng lai không bao giờ chạy).
 */
export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
    const {
        items, removeFromCart, updateQuantity, subtotal, discountAmount, shippingAmount,
        total, tax, vatBreakdown, isGuest, isLoading, isUpdating,
    } = useCart();
    const navigate = useNavigate();

    const go = (path: string) => { navigate(path); onClose(); };

    const footer = items.length > 0 ? (
        <div className="space-y-4">
            <CartTotals
                subtotal={subtotal} discountAmount={discountAmount} shippingAmount={shippingAmount}
                total={total} tax={tax} vatBreakdown={vatBreakdown} shippingUnknown={isGuest}
            />
            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => go('/gio-hang')}>Xem giỏ hàng</Button>
                <Button onClick={() => go('/thanh-toan')} disabled={isUpdating}>
                    Thanh toán <ArrowRight size={16} />
                </Button>
            </div>
        </div>
    ) : undefined;

    return (
        <Drawer
            open={isOpen}
            onOpenChange={(next) => { if (!next) onClose(); }}
            title={`Giỏ hàng (${items.length})`}
            side="right"
            footer={footer}
        >
            {isLoading && items.length === 0 ? (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
            ) : items.length === 0 ? (
                <EmptyState
                    icon={ShoppingBag}
                    title="Giỏ hàng trống"
                    description="Bạn chưa thêm sản phẩm nào vào giỏ hàng."
                    action={{ label: 'Tiếp tục mua sắm', onClick: () => go('/san-pham') }}
                />
            ) : (
                <div className="space-y-4">
                    <FreeShippingProgress amount={Math.max(0, subtotal - discountAmount)} />

                    {items.map(item => (
                        <div key={`${item.id}-${item.variantId ?? ''}`}
                            className="flex gap-3 rounded-xl border border-line bg-surface p-3 shadow-xs">
                            <button type="button" onClick={() => go(`/san-pham/${item.id}`)}
                                className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-stage"
                                aria-label={`Xem ${item.name}`}>
                                <Img src={item.imageUrl} alt={item.name} ratio="1/1" fit="contain" blend
                                    className="w-full h-full" />
                            </button>

                            <div className="flex flex-1 flex-col justify-between min-w-0">
                                <div>
                                    <p className="text-13 font-semibold text-fg line-clamp-2 leading-tight">{item.name}</p>
                                    {item.variantName && (
                                        <Badge variant="neutral" className="mt-1">{item.variantName}</Badge>
                                    )}
                                    <Price value={item.lineTotal} className="mt-1 text-sm font-bold" showDiscount={false} />
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1 rounded-lg border border-line bg-sunken p-0.5">
                                        <IconButton aria-label={`Giảm số lượng ${item.name}`} size="sm" variant="ghost"
                                            disabled={isUpdating || item.quantity <= 1}
                                            onClick={() => { void updateQuantity(item.id, item.quantity - 1); }}>
                                            <Minus size={12} />
                                        </IconButton>
                                        <span className="num w-8 text-center text-xs font-semibold text-fg">{item.quantity}</span>
                                        <IconButton aria-label={`Tăng số lượng ${item.name}`} size="sm" variant="ghost"
                                            disabled={isUpdating || item.quantity >= item.stockQuantity}
                                            onClick={() => { void updateQuantity(item.id, item.quantity + 1); }}>
                                            <Plus size={12} />
                                        </IconButton>
                                    </div>
                                    <CartRemoveButton onConfirm={() => { void removeFromCart(item.id); }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Drawer>
    );
};

export default CartDrawer;
