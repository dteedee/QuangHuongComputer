
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';

export const CartPage = () => {
    const { items, removeFromCart, updateQuantity, total, clearCart } = useCart();
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 max-w-lg mx-auto">
                    <ShoppingBag className="w-20 h-20 text-gray-500 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-white mb-4">Your cart is empty</h2>
                    <p className="text-gray-400 mb-8">Looks like you haven't added any products to your cart yet.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                        Start Shopping
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <h2 className="text-3xl font-bold text-white mb-8">Shopping Cart</h2>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Cart Items */}
                <div className="lg:w-2/3">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 space-y-6">
                            {items.map((item) => (
                                <div key={item.id} className="flex flex-col sm:flex-row items-center gap-4 py-4 border-b border-white/5 last:border-none">
                                    <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <ShoppingBag className="w-10 h-10 text-gray-600" />
                                    </div>

                                    <div className="flex-1 text-center sm:text-left">
                                        <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
                                        <p className="text-blue-400 font-medium">${item.price.toLocaleString()}</p>
                                    </div>

                                    <div className="flex items-center gap-4 bg-gray-900/50 rounded-lg p-1">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="p-2 hover:bg-white/10 rounded-md text-white transition disabled:opacity-50"
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="p-2 hover:bg-white/10 rounded-md text-white transition"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="text-right min-w-[100px]">
                                        <p className="text-white font-bold text-lg">
                                            ${(item.price * item.quantity).toLocaleString()}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/5 flex justifying-between items-center">
                            <button
                                onClick={clearCart}
                                className="text-gray-400 hover:text-white text-sm font-medium transition"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="lg:w-1/3">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sticky top-24">
                        <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-gray-400">
                                <span>Subtotal</span>
                                <span className="text-white">${total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Tax (Estimate)</span>
                                <span className="text-white">${(total * 0.1).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 pb-4 border-b border-white/10">
                                <span>Shipping</span>
                                <span className="text-green-400">Free</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold">
                                <span className="text-white">Total</span>
                                <span className="text-blue-400">${(total * 1.1).toLocaleString()}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/checkout')}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                        >
                            Proceed to Checkout
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        <p className="mt-4 text-xs text-center text-gray-500">
                            Secure Checkout - SSL Encrypted
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
