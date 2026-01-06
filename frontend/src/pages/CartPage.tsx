
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
                <div className="glass p-16 max-w-2xl mx-auto rounded-[40px] premium-shadow border-white/5">
                    <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-float">
                        <ShoppingBag className="w-12 h-12 text-blue-400" />
                    </div>
                    <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Your Cart is Empty</h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto">Discover the latest tech and build your dream setup today.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                    >
                        Start Exploring
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-16 animate-fade-in">
            <div className="flex items-center gap-4 mb-12">
                <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400">
                    <ShoppingBag size={32} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Review Your Bag</h2>
                    <p className="text-slate-500 font-medium">{items.length} items ready for checkout</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-10">
                {/* List Side */}
                <div className="flex-1 space-y-6">
                    <div className="glass rounded-[32px] overflow-hidden border-white/5 premium-shadow">
                        <div className="p-8 space-y-8">
                            {items.map((item) => (
                                <div key={item.id} className="group flex flex-col md:flex-row items-center gap-8 py-6 first:pt-0 border-b border-white/5 last:border-none last:pb-0">
                                    <div className="w-32 h-32 bg-slate-800/50 rounded-3xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                        <ShoppingBag size={48} className="text-slate-600" />
                                    </div>

                                    <div className="flex-1 text-center md:text-left space-y-1">
                                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{item.name}</h3>
                                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">SKU: {item.id.substring(0, 8)}</p>
                                        <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                                            <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-30"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="text-white font-bold w-6 text-center text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
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
                                        <p className="text-2xl font-black text-white">${(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-sm font-bold text-slate-500">${item.price.toLocaleString()} / unit</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 bg-white/5 border-t border-white/5 flex justify-between items-center">
                            <button
                                onClick={clearCart}
                                className="flex items-center gap-2 text-slate-500 hover:text-rose-400 font-bold transition-colors text-sm"
                            >
                                <RotateCcw size={16} />
                                Clear Shopping Bag
                            </button>
                            <Link to="/" className="text-blue-400 hover:text-blue-300 font-bold text-sm">Continue Shopping</Link>
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: <ShieldCheck className="text-emerald-400" />, title: 'Genuine Warranty', sub: '100% manufacturer support' },
                            { icon: <Truck className="text-blue-400" />, title: 'Premium Logistics', sub: 'Insured & fast shipping' },
                            { icon: <RotateCcw className="text-purple-400" />, title: '7-Day Return', sub: 'Hassle-free exchanges' },
                        ].map((b, i) => (
                            <div key={i} className="glass p-6 rounded-3xl flex items-center gap-4 border-white/5">
                                <div className="p-3 bg-slate-800 rounded-2xl">{b.icon}</div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">{b.title}</h4>
                                    <p className="text-slate-500 text-xs">{b.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary Side */}
                <div className="xl:w-1/3">
                    <div className="glass p-10 rounded-[40px] border-white/10 premium-shadow sticky top-32">
                        <h3 className="text-2xl font-extrabold text-white mb-8 tracking-tight">Order Summary</h3>

                        <div className="space-y-5 mb-10">
                            <div className="flex justify-between text-slate-400 font-medium">
                                <span>Subtotal</span>
                                <span className="text-white font-bold">${total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 font-medium">
                                <span>Estimated Tax (10%)</span>
                                <span className="text-white font-bold">${tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 font-medium pb-6 border-b border-white/5">
                                <span>Shipping Fee</span>
                                <span className="text-emerald-400 font-bold">Complimentary</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-4">
                                <span className="text-lg font-bold text-white">Total Amount</span>
                                <div className="text-right">
                                    <p className="text-4xl font-black text-blue-500 tracking-tighter">${grandTotal.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">VAT Included</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/checkout')}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center gap-3 active:scale-95 text-lg"
                        >
                            Complete Order
                            <ArrowRight size={22} />
                        </button>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <div className="flex items-center justify-center gap-4 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                                <span className="text-[10px] font-black uppercase text-white border border-white px-1.5 py-0.5 rounded">Visa</span>
                                <span className="text-[10px] font-black uppercase text-white border border-white px-1.5 py-0.5 rounded">MasterCard</span>
                                <span className="text-[10px] font-black uppercase text-white border border-white px-1.5 py-0.5 rounded">Napas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

