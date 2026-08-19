import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck, RotateCcw, Tag } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';
import { FreeShippingProgress } from '../components/cart/free-shipping-progress';
import { CartRemoveButton } from '../components/cart/cart-remove-button';

export const CartPage = () => {
    // Phase 04-C: mã giảm giá chỉ áp ở Checkout (bước 2). Cart chỉ hiển thị mã đã áp nếu có.
    const { items, removeFromCart, updateQuantity, clearCart, couponCode, discountAmount, subtotal, tax, shippingAmount, total, isLoading } = useCart();
    const navigate = useNavigate();

    if (isLoading && items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 font-sans animate-pulse">
                <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 lg:w-[65%] space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-24" />
                        ))}
                    </div>
                    <div className="lg:w-[35%] bg-white rounded-xl border border-gray-100 h-64" />
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center animate-fade-in font-sans">
                <div className="bg-white p-12 max-w-lg mx-auto rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                        <ShoppingBag className="w-10 h-10 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
                    <p className="text-gray-500 text-sm mb-8">Khám phá sản phẩm công nghệ tại Quang Hưởng.</p>
                    <Link to="/" className="inline-flex items-center px-6 py-3 bg-accent hover:bg-red-700 text-white font-semibold rounded-xl transition-all text-sm group">
                        Tiếp tục mua sắm
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="mt-12">
                    <RecentlyViewedProducts title="Bạn đã xem gần đây" showClearButton />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-6 lg:py-10 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-red-100 rounded-xl text-accent"><ShoppingBag size={24} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Giỏ hàng của bạn</h2>
                        <p className="text-gray-500 text-sm">{items.length} sản phẩm</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Items List - 65% */}
                    <div className="flex-1 lg:w-[65%] space-y-4">
                        <FreeShippingProgress amount={total} />
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 p-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-bold text-gray-300">{item?.name?.charAt(0) || '?'}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{item.name}</h3>
                                        {item.variantName && (
                                            <span className="inline-block mt-1 text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                                                {item.variantName}
                                            </span>
                                        )}
                                        <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)}/cái</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-accent transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><Minus size={14} /></button>
                                        <span className="text-gray-900 font-bold w-8 text-center text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stockQuantity} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-accent transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title={item.quantity >= item.stockQuantity ? `Kho chỉ còn ${item.stockQuantity}` : ''}><Plus size={14} /></button>
                                    </div>
                                    <div className="text-right min-w-[100px]">
                                        <p className="text-base font-bold text-accent">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                    <CartRemoveButton onConfirm={() => removeFromCart(item.id)} />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center">
                            <button onClick={() => { if (window.confirm('Xóa toàn bộ giỏ hàng?')) clearCart(); }} className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-medium text-sm transition cursor-pointer"><RotateCcw size={14} /> Xóa tất cả</button>
                            <Link to="/" className="text-accent hover:text-red-700 font-semibold text-sm flex items-center gap-1 cursor-pointer">Tiếp tục mua sắm <ArrowRight size={14} /></Link>
                        </div>
                        {/* Trust badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { icon: <ShieldCheck className="text-emerald-500" size={18} />, title: 'Bảo hành chính hãng' },
                                { icon: <Truck className="text-accent" size={18} />, title: 'Giao hàng siêu tốc' },
                                { icon: <RotateCcw className="text-amber-500" size={18} />, title: 'Đổi trả 7 ngày' },
                            ].map((b, i) => (
                                <div key={i} className="bg-white p-3 rounded-xl flex items-center gap-2.5 border border-gray-100 shadow-sm">
                                    {b.icon}
                                    <span className="text-gray-700 font-medium text-xs">{b.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary - 35% */}
                    <div className="lg:w-[35%]">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm sticky top-24 space-y-5">
                            <h3 className="text-lg font-bold text-gray-900">Tóm tắt đơn hàng</h3>
                            {couponCode && (
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-sm">
                                    <Tag className="w-4 h-4 text-emerald-600" />
                                    <span className="text-emerald-800">Mã đã áp: <span className="font-bold uppercase">{couponCode}</span></span>
                                </div>
                            )}
                            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-800">
                                Áp mã giảm giá & xem tất cả khuyến mãi tự động ở bước Thanh toán.
                            </div>
                            {/* Totals */}
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600"><span>Tạm tính</span><span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span></div>
                                {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Giảm giá</span><span className="font-semibold">-{formatCurrency(discountAmount)}</span></div>}
                                <div className="flex justify-between text-gray-600"><span>Thuế GTGT (10%)</span><span className="font-semibold text-gray-900">{formatCurrency(tax)}</span></div>
                                <div className="flex justify-between text-gray-600 pb-4 border-b border-gray-100"><span>Vận chuyển</span>{shippingAmount === 0 ? <span className="font-semibold text-emerald-600">Miễn phí</span> : <span className="font-semibold text-gray-900">{formatCurrency(shippingAmount)}</span>}</div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="font-bold text-gray-900">Tổng cộng</span>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-accent">{formatCurrency(total)}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Đã bao gồm VAT</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => navigate('/checkout')} className="w-full py-3 bg-accent hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm whitespace-nowrap group">
                                Tiến hành thanh toán <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <RecentlyViewedProducts title="Có thể bạn cũng thích" showClearButton />
                </div>
            </div>
        </div>
    );
};
