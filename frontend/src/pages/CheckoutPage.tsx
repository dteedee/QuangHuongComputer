
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { salesApi } from '../api/sales';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

export const CheckoutPage = () => {
    const { items, total, clearCart } = useCart();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shippingAddress, setShippingAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    if (items.length === 0) {
        navigate('/cart');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shippingAddress.trim()) {
            setError('Vui lòng nhập địa chỉ nhận hàng');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const checkoutItems = items.map(item => ({
                productId: item.id,
                productName: item.name,
                unitPrice: item.price,
                quantity: item.quantity
            }));

            const result = await salesApi.checkout({
                items: checkoutItems,
                shippingAddress,
                notes
            });

            clearCart();
            // Redirect to Payment Page
            navigate(`/payment/${result.orderId}`);
        } catch (err: any) {
            console.error('Checkout failed', err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <button
                onClick={() => navigate('/cart')}
                className="flex items-center text-gray-500 hover:text-[#D70018] mb-8 transition font-bold uppercase text-xs"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Quay lại giỏ hàng
            </button>

            <div className="flex flex-col lg:flex-row gap-12">

                <div className="lg:w-2/3">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Thanh toán</h2>
                        <p className="text-gray-500 font-medium">Vui lòng hoàn tất thông tin giao hàng bên dưới.</p>
                    </div>

                    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 uppercase italic">
                                <div className="w-8 h-8 rounded-full bg-[#D70018]/10 text-[#D70018] flex items-center justify-center text-sm">1</div>
                                Thông tin giao hàng
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                                        Địa chỉ giao hàng đầy đủ
                                    </label>
                                    <textarea
                                        required
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        rows={3}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-800 text-sm font-bold focus:outline-none focus:border-[#D70018] transition-all"
                                        placeholder="Số nhà, tên đường, quận/huyện, thành phố..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                                        Ghi chú đơn hàng (Tùy chọn)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-800 text-sm font-bold focus:outline-none focus:border-[#D70018] transition-all"
                                        placeholder="Chỉ dẫn đặc biệt cho người giao hàng..."
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </form>
                </div>

                <div className="lg:w-1/3">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 sticky top-24">
                        <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">Tóm tắt đơn hàng</h3>

                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {items.map(item => (
                                <div key={item.id} className="flex justify-between text-sm py-2">
                                    <div className="text-gray-500 font-bold">
                                        <span className="text-[#D70018] mr-2">{item.quantity}x</span>
                                        {item.name}
                                    </div>
                                    <span className="text-gray-900 font-black">{(item.price * item.quantity).toLocaleString()}₫</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-gray-100 mb-6">
                            <div className="flex justify-between text-gray-400 text-xs font-black uppercase tracking-widest">
                                <span>Tạm tính</span>
                                <span className="text-gray-900 font-black">{total.toLocaleString()}₫</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-xs font-black uppercase tracking-widest">
                                <span>Thuế (10% VAT)</span>
                                <span className="text-gray-900 font-black">{(total * 0.1).toLocaleString()}₫</span>
                            </div>
                            <div className="flex justify-between text-xl font-black items-baseline pt-2">
                                <span className="text-gray-900 uppercase italic tracking-tighter">Tổng cộng</span>
                                <span className="text-[#D70018] tracking-tighter text-2xl">{(total * 1.1).toLocaleString()}₫</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            form="checkout-form"
                            disabled={isSubmitting}
                            className="w-full py-5 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs active:scale-95"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Đặt hàng ngay
                                    <CheckCircle className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

