
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
            setError('Shipping address is required');
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

            await salesApi.checkout({
                items: checkoutItems,
                shippingAddress,
                notes
            });

            clearCart();
            // In a real app, maybe redirect to a success/order details page
            navigate('/profile'); // Redirect to profile to see the new order
        } catch (err) {
            console.error('Checkout failed', err);
            setError('Failed to place order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <button
                onClick={() => navigate('/cart')}
                className="flex items-center text-gray-400 hover:text-white mb-8 transition"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Cart
            </button>

            <div className="flex flex-col lg:flex-row gap-12">

                <div className="lg:w-2/3">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Checkout</h2>
                        <p className="text-gray-400">Complete your purchase details below.</p>
                    </div>

                    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm">1</div>
                                Shipping Information
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        Full Shipping Address
                                    </label>
                                    <textarea
                                        required
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        rows={3}
                                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                                        placeholder="123 Street Name, City, Country"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        Order Notes (Optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                                        placeholder="Special instructions for delivery..."
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
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sticky top-24">
                        <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>

                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {items.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <div className="text-gray-300">
                                        <span className="text-gray-500 mr-2">{item.quantity}x</span>
                                        {item.name}
                                    </div>
                                    <span className="text-white font-medium">${(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/10 mb-6">
                            <div className="flex justify-between text-gray-400">
                                <span>Subtotal</span>
                                <span className="text-white">${total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Tax (10%)</span>
                                <span className="text-white">${(total * 0.1).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold">
                                <span className="text-white">Total</span>
                                <span className="text-blue-400">${(total * 1.1).toLocaleString()}</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            form="checkout-form"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Place Order
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

