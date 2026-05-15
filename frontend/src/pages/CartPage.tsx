import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck, RotateCcw, Tag, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';

export const CartPage = () => {
    const { items, removeFromCart, updateQuantity, clearCart, couponCode, discountAmount, applyCoupon, removeCoupon, subtotal, tax, shippingAmount, total } = useCart();
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center animate-fade-in font-sans">
                <div className="bg-white p-12 max-w-lg mx-auto rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                        <ShoppingBag className="w-10 h-10 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Gio hang trong</h2>
                    <p className="text-gray-500 text-sm mb-8">Kham pha san pham cong nghe tai Quang Huong.</p>
                    <Link to="/" className="inline-flex items-center px-6 py-3 bg-accent hover:bg-red-700 text-white font-semibold rounded-xl transition-all text-sm group">
                        Tiep tuc mua sam
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="mt-12">
                    <RecentlyViewedProducts title="Ban da xem gan day" showClearButton />
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
                        <h2 className="text-2xl font-bold text-gray-900">Gio hang cua ban</h2>
                        <p className="text-gray-500 text-sm">{items.length} san pham</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Items List - 65% */}
                    <div className="flex-1 lg:w-[65%] space-y-4">
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
                                        <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)}/cai</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-accent transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><Minus size={14} /></button>
                                        <span className="text-gray-900 font-bold w-8 text-center text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stockQuantity} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md text-gray-500 hover:text-accent transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title={item.quantity >= item.stockQuantity ? `Kho chi con ${item.stockQuantity}` : ''}><Plus size={14} /></button>
                                    </div>
                                    <div className="text-right min-w-[100px]">
                                        <p className="text-base font-bold text-accent">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center">
                            <button onClick={() => { if (window.confirm('Xoa toan bo gio hang?')) clearCart(); }} className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-medium text-sm transition cursor-pointer"><RotateCcw size={14} /> Xoa tat ca</button>
                            <Link to="/" className="text-accent hover:text-red-700 font-semibold text-sm flex items-center gap-1 cursor-pointer">Tiep tuc mua sam <ArrowRight size={14} /></Link>
                        </div>
                        {/* Trust badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { icon: <ShieldCheck className="text-emerald-500" size={18} />, title: 'Bao hanh chinh hang' },
                                { icon: <Truck className="text-accent" size={18} />, title: 'Giao hang sieu toc' },
                                { icon: <RotateCcw className="text-amber-500" size={18} />, title: 'Doi tra 7 ngay' },
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
                            <h3 className="text-lg font-bold text-gray-900">Tom tat don hang</h3>
                            {/* Coupon */}
                            <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-100/50">
                                <div className="flex items-center gap-2 mb-2"><Tag className="w-4 h-4 text-orange-600" /><span className="text-sm font-semibold text-orange-900">Ma giam gia</span></div>
                                {couponCode ? (
                                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-200">
                                        <span className="font-bold text-emerald-700 uppercase text-sm">{couponCode}</span>
                                        <button onClick={removeCoupon} className="text-red-500 hover:text-red-700 p-1 cursor-pointer"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()} placeholder="Nhap ma" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent font-medium uppercase" />
                                        <button onClick={handleApplyCoupon} disabled={!couponInput.trim() || isApplyingCoupon} className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">{isApplyingCoupon ? '...' : 'Ap dung'}</button>
                                    </div>
                                )}
                            </div>
                            {/* Totals */}
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600"><span>Tam tinh</span><span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span></div>
                                {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Giam gia</span><span className="font-semibold">-{formatCurrency(discountAmount)}</span></div>}
                                <div className="flex justify-between text-gray-600"><span>Thue GTGT (10%)</span><span className="font-semibold text-gray-900">{formatCurrency(tax)}</span></div>
                                <div className="flex justify-between text-gray-600 pb-4 border-b border-gray-100"><span>Van chuyen</span>{shippingAmount === 0 ? <span className="font-semibold text-emerald-600">Mien phi</span> : <span className="font-semibold text-gray-900">{formatCurrency(shippingAmount)}</span>}</div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="font-bold text-gray-900">Tong cong</span>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-accent">{formatCurrency(total)}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Da bao gom VAT</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => navigate('/checkout')} className="w-full py-3.5 bg-accent hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm group">
                                Tien hanh thanh toan <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <RecentlyViewedProducts title="Co the ban cung thich" showClearButton />
                </div>
            </div>
        </div>
    );
};
