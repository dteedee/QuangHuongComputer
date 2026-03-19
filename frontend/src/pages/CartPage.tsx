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
                <div className="bg-white p-16 max-w-2xl mx-auto rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50 flex flex-col items-center">
                    <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center mb-8 animate-float">
                        <ShoppingBag className="w-16 h-16 text-[#D70018]" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight uppercase italic">Giỏ hàng đang trống</h2>
                    <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto italic font-medium">Khám phá ngay hàng ngàn sản phẩm công nghệ đỉnh cao tại Quang Hưởng.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center px-12 py-5 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 uppercase tracking-widest text-sm group"
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
                    <div className="p-3 bg-red-100 rounded-2xl text-[#D70018]">
                        <ShoppingBag size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Giỏ hàng của bạn</h2>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{items.length} sản phẩm đã sẵn sàng thanh toán</p>
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
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#D70018]/5 to-transparent" />
                                            {/* Ideally real image here, placeholder for now */}
                                            <span className="text-2xl font-black text-gray-200">{item.name.charAt(0)}</span>
                                        </div>

                                        <div className="flex-1 text-center md:text-left space-y-1">
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#D70018] transition-colors line-clamp-2 uppercase italic tracking-tight">{item.name}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 px-1">Mã SP: {item.id.substring(0, 8).toUpperCase()}</p>
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-[#D70018] transition shadow-sm disabled:opacity-30 font-bold"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="text-gray-900 font-bold w-8 text-center text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-[#D70018] transition shadow-sm font-bold"
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
                                            <p className="text-xl font-black text-[#D70018] tracking-tight">{formatCurrency(item.price * item.quantity)}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 italic">{formatCurrency(item.price)}/cái</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                                <button
                                    onClick={clearCart}
                                    className="flex items-center gap-2 text-gray-400 hover:text-[#D70018] font-bold uppercase text-[10px] tracking-widest transition-colors"
                                >
                                    <RotateCcw size={14} />
                                    Xóa tất cả
                                </button>
                                <Link to="/" className="text-[#D70018] hover:text-[#b50014] font-black uppercase text-[10px] tracking-widest flex items-center gap-1">
                                    Tiếp tục mua sắm <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { icon: <ShieldCheck className="text-emerald-500" />, title: 'Bảo hành chính hãng', sub: 'Hỗ trợ 100%' },
                                { icon: <Truck className="text-[#D70018]" />, title: 'Giao hàng siêu tốc', sub: 'An toàn & nhanh chóng' },
                                { icon: <RotateCcw className="text-amber-500" />, title: 'Đổi trả 7 ngày', sub: 'Lỗi là đổi mới ngay' },
                            ].map((b, i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl flex items-center gap-3 border border-gray-100 shadow-sm">
                                    <div className="p-2 bg-gray-50 rounded-xl">{b.icon}</div>
                                    <div>
                                        <h4 className="text-gray-900 font-bold text-xs uppercase italic">{b.title}</h4>
                                        <p className="text-gray-400 text-[10px] font-bold mt-0.5">{b.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary Side */}
                    <div className="xl:w-1/3">
                        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xl shadow-gray-200/50 sticky top-24">
                            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">Tóm tắt đơn hàng</h3>

                            {/* Coupon Input */}
                            <div className="mb-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="w-4 h-4 text-amber-600" />
                                    <span className="text-xs font-black uppercase tracking-wide text-amber-900">Mã giảm giá</span>
                                </div>

                                {couponCode ? (
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200">
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-emerald-600" />
                                            <span className="font-black text-emerald-700 uppercase text-sm">{couponCode}</span>
                                        </div>
                                        <button
                                            onClick={removeCoupon}
                                            className="text-red-500 hover:text-red-700 transition-colors"
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
                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold uppercase"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponInput.trim() || isApplyingCoupon}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase"
                                        >
                                            {isApplyingCoupon ? 'Đang áp dụng...' : 'Áp dụng'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-gray-500 text-xs font-bold uppercase tracking-wide">
                                    <span>Tạm tính</span>
                                    <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                                </div>

                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-600 text-xs font-bold uppercase tracking-wide">
                                        <span className="flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            Giảm giá
                                        </span>
                                        <span>-{formatCurrency(discountAmount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-gray-500 text-xs font-bold uppercase tracking-wide">
                                    <span>Thuế GTGT (10%)</span>
                                    <span className="text-gray-900">{formatCurrency(tax)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 text-xs font-bold uppercase tracking-wide pb-4 border-b border-gray-100">
                                    <span>Vận chuyển</span>
                                    <span className="text-emerald-600 italic">Miễn phí</span>
                                </div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Tổng cộng</span>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-[#D70018] tracking-tight">{formatCurrency(total)}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Đã bao gồm VAT</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/checkout')}
                                className="w-full py-4 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 text-xs uppercase tracking-widest group"
                            >
                                Tiến hành thanh toán
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
