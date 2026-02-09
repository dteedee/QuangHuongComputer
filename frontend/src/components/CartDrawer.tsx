
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/format';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
    const { items, removeFromCart, updateQuantity, total } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleCheckout = () => {
        if (!isAuthenticated) {
            navigate('/login');
            onClose();
            return;
        }
        navigate('/checkout');
        onClose();
    };

    const handleViewCart = () => {
        navigate('/cart');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="ml-auto relative w-full max-w-md bg-slate-900 h-full shadow-2xl flex flex-col transform transition-transform duration-300">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white">Your Cart</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p>Your cart is empty</p>
                            <button onClick={onClose} className="mt-4 text-blue-400 hover:underline">Continue Shopping</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map(item => (
                                <div key={item.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-white line-clamp-1">{item.name}</h3>
                                        <p className="text-blue-400 font-bold">{formatCurrency(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="w-7 h-7 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 transition"
                                            disabled={item.quantity <= 1}
                                        >-</button>
                                        <span className="text-white w-8 text-center text-sm font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="w-7 h-7 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 transition"
                                        >+</button>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-gray-500 hover:text-red-400 transition"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="p-6 border-t border-white/10 bg-slate-900">
                        <div className="flex justify-between text-xl font-bold text-white mb-6">
                            <span>Total:</span>
                            <span className="text-blue-400">{formatCurrency(total)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleViewCart}
                                className="w-full py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition"
                            >
                                View Cart
                            </button>
                            <button
                                onClick={handleCheckout}
                                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                            >
                                Checkout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

