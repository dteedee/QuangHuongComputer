
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck, RotateCcw } from 'lucide-react';

export const CartPage = () => {
    const { items, removeFromCart, updateQuantity, total, clearCart } = useCart();
    const navigate = useNavigate();

    const tax = total * 0.1;
    const grandTotal = total + tax;

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-32 text-center animate-fade-in">
                <div className="bg-white p-16 max-w-2xl mx-auto rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-float">
                        <ShoppingBag className="w-12 h-12 text-[#D70018]" />
                    </div>
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight uppercase italic">Giỏ hàng đang trống</h2>
                    <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto italic font-medium">Khám phá ngay hàng ngàn sản phẩm công nghệ đỉnh cao tại Quang Hưởng.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center px-10 py-4 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 uppercase tracking-widest text-xs"
                    >
                        Bắt đầu mua sắm
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-16 animate-fade-in font-sans">
            <div className="flex items-center gap-4 mb-12">
                <div className="p-3 bg-red-50 rounded-2xl text-[#D70018]">
                    <ShoppingBag size={32} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Giỏ hàng của bạn</h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{items.length} sản phẩm đã sẵn sàng thanh toán</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-10">
                {/* List Side */}
                <div className="flex-1 space-y-6">
                    <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50">
                        <div className="p-8 space-y-8">
                            {items.map((item) => (
                                <div key={item.id} className="group flex flex-col md:flex-row items-center gap-8 py-6 first:pt-0 border-b border-gray-50 last:border-none last:pb-0">
                                    <div className="w-32 h-32 bg-gray-50 rounded-3xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#D70018]/5 to-transparent" />
                                        <ShoppingBag size={48} className="text-gray-200" />
                                    </div>

                                    <div className="flex-1 text-center md:text-left space-y-1">
                                        <h3 className="text-xl font-black text-gray-900 group-hover:text-[#D70018] transition-colors uppercase italic tracking-tighter leading-none">{item.name}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-1">Mã SP: {item.id.substring(0, 8).toUpperCase()}</p>
                                        <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-[#D70018] transition shadow-sm disabled:opacity-30"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="text-gray-900 font-black w-6 text-center text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-[#D70018] transition shadow-sm"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-3 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-right min-w-[140px]">
                                        <p className="text-2xl font-black text-gray-900 tracking-tighter">{(item.price * item.quantity).toLocaleString()}₫</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">{item.price.toLocaleString()}₫ / sản phẩm</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center">
                            <button
                                onClick={clearCart}
                                className="flex items-center gap-2 text-gray-400 hover:text-[#D70018] font-black uppercase text-[10px] tracking-widest transition-colors"
                            >
                                <RotateCcw size={16} />
                                Xóa tất cả giỏ hàng
                            </button>
                            <Link to="/" className="text-[#D70018] hover:underline font-black uppercase text-[10px] tracking-widest italic">Tiếp tục mua sắm &gt;</Link>
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: <ShieldCheck className="text-emerald-500" />, title: 'Bảo hành chính hãng', sub: 'Hỗ trợ 100% từ nhà sản xuất' },
                            { icon: <Truck className="text-[#D70018]" />, title: 'Giao hàng siêu tốc', sub: 'An toàn & nhanh chóng' },
                            { icon: <RotateCcw className="text-amber-500" />, title: 'Đổi trả 7 ngày', sub: 'Lỗi là đổi mới ngay lập tức' },
                        ].map((b, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl flex items-center gap-4 border border-gray-100 shadow-sm">
                                <div className="p-3 bg-gray-50 rounded-2xl">{b.icon}</div>
                                <div>
                                    <h4 className="text-gray-900 font-black text-xs uppercase italic">{b.title}</h4>
                                    <p className="text-gray-400 text-[10px] font-bold mt-0.5">{b.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary Side */}
                <div className="xl:w-1/3">
                    <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-200/50 sticky top-32">
                        <h3 className="text-2xl font-black text-gray-900 mb-8 uppercase italic tracking-tighter">Tóm tắt đơn hàng</h3>

                        <div className="space-y-5 mb-10">
                            <div className="flex justify-between text-gray-400 text-xs font-black uppercase tracking-widest">
                                <span>Tạm tính</span>
                                <span className="text-gray-900 font-black">{total.toLocaleString()}₫</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-xs font-black uppercase tracking-widest">
                                <span>Thuế GTGT (10%)</span>
                                <span className="text-gray-900 font-black">{tax.toLocaleString()}₫</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-xs font-black uppercase tracking-widest pb-6 border-b border-gray-50">
                                <span>Phí vận chuyển</span>
                                <span className="text-emerald-600 font-black italic">Miễn phí</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-4">
                                <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Tổng tiền</span>
                                <div className="text-right">
                                    <p className="text-4xl font-black text-[#D70018] tracking-tighter">{grandTotal.toLocaleString()}₫</p>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1 italic">Đã bao gồm VAT</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/checkout')}
                            className="w-full py-5 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 active:scale-95 text-xs uppercase tracking-widest"
                        >
                            Tiến hành thanh toán
                            <ArrowRight size={20} />
                        </button>

                        <div className="mt-8 pt-8 border-t border-gray-50">
                            <div className="flex items-center justify-center gap-4 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                                <span className="text-[10px] font-black uppercase text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded italic">Visa</span>
                                <span className="text-[10px] font-black uppercase text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded italic">MasterCard</span>
                                <span className="text-[10px] font-black uppercase text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded italic">Napas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

