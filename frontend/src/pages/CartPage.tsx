import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck, RotateCcw, Tag, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';

export const CartPage = () => {
    const {
        items,
        removeFromCart,
        updateQuantity,
        clearCart,
        couponCode,
        discountAmount,
        applyCoupon,
        removeCoupon,
        subtotal,
        tax,
        total
    } = useCart();
    const navigate = useNavigate();

    const [couponInput, setCouponInput] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setIsApplyingCoupon(true);
        await applyCoupon(couponInput.trim());
        setIsApplyingCoupon(false);
        setCouponInput('');
    };

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-32 text-center animate-fade-in font-sans">
                <div className="bg-white p-12 md:p-16 max-w-2xl mx-auto rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-float">
                        <ShoppingBag className="w-12 h-12 text-accent" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Giỏ hàng đang trống</h2>
                    <p className="text-gray-500 text-base mb-10 max-w-md mx-auto font-medium">Khám phá ngay hàng ngàn sản phẩm công nghệ đỉnh cao tại Quang Hưởng.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center px-8 py-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98] text-sm group"
                    >
                        Bắt đầu mua sắm
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Recently Viewed Products */}
                <div className="mt-12">
                    <RecentlyViewedProducts title="Bạn đã xem gần đây" showClearButton />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-10 font-sans">
            <div className="max-w-[1400px] mx-auto px-4 animate-fade-in">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-100 rounded-2xl text-accent">
                        <ShoppingBag size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Giỏ hàng của bạn</h2>
                        <p className="text-gray-500 font-medium text-sm mt-1">{items.length} sản phẩm đã sẵn sàng thanh toán</p>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-8">
                    {/* List Side */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm">
                            <div className="p-6 space-y-6">
                                {items.map((item) => (
                                    <div key={item.id} className="group flex flex-col md:flex-row items-center gap-6 py-4 first:pt-0 border-b border-gray-50 last:border-none last:pb-0">
                                        <div className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
                                            {/* Ideally real image here, placeholder for now */}
                                            <span className="text-2xl font-black text-gray-200">{item?.name?.charAt(0) || '?'}</span>
                                        </div>

                                        <div className="flex-1 text-center md:text-left space-y-1 md:px-4">
                                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-accent transition-colors line-clamp-2 leading-snug">{item.name}</h3>
                                            <p className="text-xs font-medium text-gray-500">Mã SP: {item.id.substring(0, 8).toUpperCase()}</p>
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-accent transition shadow-sm disabled:opacity-30 font-bold"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="text-gray-900 font-bold w-8 text-center text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-accent transition shadow-sm font-bold"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-xs text-red-500 hover:underline flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} /> Xóa
                                            </button>
                                        </div>

                                        <div className="text-right min-w-[120px]">
                                            <p className="text-xl font-bold text-accent tracking-tight">{formatCurrency(item.price * item.quantity)}</p>
                                            <p className="text-xs font-medium text-gray-500 mt-1">{formatCurrency(item.price)}/cái</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                                <button
                                    onClick={clearCart}
                                    className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-semibold text-sm transition-colors"
                                >
                                    <RotateCcw size={16} />
                                    Xóa tất cả
                                </button>
                                <Link to="/" className="text-accent hover:text-accent-hover font-bold text-sm flex items-center gap-2">
                                    Tiếp tục mua sắm <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { icon: <ShieldCheck className="text-emerald-500" />, title: 'Bảo hành chính hãng', sub: 'Hỗ trợ 100%' },
                                { icon: <Truck className="text-accent" />, title: 'Giao hàng siêu tốc', sub: 'An toàn & nhanh chóng' },
                                { icon: <RotateCcw className="text-amber-500" />, title: 'Đổi trả 7 ngày', sub: 'Lỗi là đổi mới ngay' },
                            ].map((b, i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl flex items-center gap-3 border border-gray-100 shadow-sm">
                                    <div className="p-2 bg-gray-50 rounded-xl">{b.icon}</div>
                                    <div>
                                        <h4 className="text-gray-900 font-semibold text-sm">{b.title}</h4>
                                        <p className="text-gray-500 text-xs mt-0.5">{b.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary Side */}
                    <div className="xl:w-1/3">
                        <div className="bg-white p-6 md:p-8 rounded-[24px] border border-gray-100 shadow-sm sticky top-24">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Tóm tắt đơn hàng</h3>

                            {/* Coupon Input */}
                            <div className="mb-6 p-4 bg-orange-50/50 rounded-xl border border-orange-100/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="w-4 h-4 text-orange-600" />
                                    <span className="text-sm font-semibold text-orange-900">Mã giảm giá</span>
                                </div>

                                {couponCode ? (
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200">
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-emerald-600" />
                                            <span className="font-bold text-emerald-700 uppercase text-sm">{couponCode}</span>
                                        </div>
                                        <button
                                            onClick={removeCoupon}
                                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                            onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                            placeholder="Nhập mã giảm giá"
                                            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent font-medium uppercase transition-shadow shadow-sm"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponInput.trim() || isApplyingCoupon}
                                            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm active:scale-[0.98]"
                                        >
                                            {isApplyingCoupon ? 'Đang áp dụng...' : 'Áp dụng'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-gray-600 text-sm font-medium">
                                    <span>Tạm tính</span>
                                    <span className="text-gray-900 font-semibold">{formatCurrency(subtotal)}</span>
                                </div>

                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-600 text-sm font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Tag className="w-4 h-4" />
                                            Giảm giá
                                        </span>
                                        <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-gray-600 text-sm font-medium">
                                    <span>Thuế GTGT (10%)</span>
                                    <span className="text-gray-900 font-semibold">{formatCurrency(tax)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-sm font-medium pb-4 border-b border-gray-100">
                                    <span>Vận chuyển</span>
                                    <span className="text-emerald-600 font-semibold">Miễn phí</span>
                                </div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-base font-bold text-gray-900">Tổng cộng</span>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-accent tracking-tight leading-none">{formatCurrency(total)}</p>
                                        <p className="text-xs text-gray-500 font-medium mt-1.5">Đã bao gồm VAT</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/checkout')}
                                className="w-full py-4 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] text-base group"
                            >
                                Tiến hành thanh toán
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <p className="text-[10px] text-center text-gray-400 mb-3">Chấp nhận thanh toán</p>
                                <div className="flex items-center justify-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all cursor-default">
                                    <span className="text-[10px] font-black uppercase text-gray-600 border border-gray-200 px-2 py-1 rounded">Visa</span>
                                    <span className="text-[10px] font-black uppercase text-gray-600 border border-gray-200 px-2 py-1 rounded">MasterCard</span>
                                    <span className="text-[10px] font-black uppercase text-gray-600 border border-gray-200 px-2 py-1 rounded">Napas</span>
                                    <span className="text-[10px] font-black uppercase text-gray-600 border border-gray-200 px-2 py-1 rounded">COD</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recently Viewed Products */}
                <div className="mt-8">
                    <RecentlyViewedProducts title="Có thể bạn cũng thích" showClearButton />
                </div>
            </div>
        </div>
    );
};
