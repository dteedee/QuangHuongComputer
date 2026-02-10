
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/format';
import { X, Trash2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react';

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
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="text-[#D70018]" />
                        <h2 className="text-xl font-bold text-gray-900">Giỏ hàng ({items.length})</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                <ShoppingBag size={40} />
                            </div>
                            <div>
                                <p className="text-gray-900 font-medium text-lg">Giỏ hàng trống</p>
                                <p className="text-gray-500 text-sm mt-1">Bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="mt-4 px-6 py-2.5 bg-[#D70018] text-white rounded-lg font-bold text-sm shadow-lg shadow-red-500/30 hover:bg-[#b50014] transition-all hover:-translate-y-0.5"
                            >
                                Tiếp tục mua sắm
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map(item => (
                                <div key={item.id} className="group bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex gap-3">
                                    {/* Image */}
                                    <div className="w-20 h-20 bg-gray-50 rounded-lg flex-shrink-0 border border-gray-100 overflow-hidden flex items-center justify-center">
                                        <img
                                            src={item.imageUrl || `https://placehold.co/100x100?text=${item.name.charAt(0)}`}
                                            alt={item.name}
                                            className="w-full h-full object-contain mix-blend-multiply p-1"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-1 group-hover:text-[#D70018] transition-colors">
                                                {item.name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[#D70018] font-bold text-sm">{formatCurrency(item.price)}</p>
                                                {item.oldPrice && item.oldPrice > item.price && (
                                                    <p className="text-gray-400 text-xs line-through">{formatCurrency(item.oldPrice)}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            {/* Quantity Control */}
                                            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm hover:text-[#D70018] disabled:opacity-50 transition-colors"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold text-gray-700">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm hover:text-[#D70018] transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>

                                            {/* Remove */}
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Xóa sản phẩm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-5 border-t border-gray-100 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-10 sticky bottom-0">
                        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">Tạm tính</span>
                                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
                            </div>
                            <div className="border-t border-gray-200 my-2 pt-2 flex justify-between items-end">
                                <span className="text-gray-900 font-bold">Tổng tiền</span>
                                <div className="text-right">
                                    <span className="block text-xl font-black text-[#D70018]">{formatCurrency(total)}</span>
                                    <span className="text-[10px] text-gray-500 font-normal">(Đã bao gồm VAT)</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleViewCart}
                                className="py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
                            >
                                Xem chi tiết
                            </button>
                            <button
                                onClick={handleCheckout}
                                className="py-3 px-4 bg-[#D70018] text-white font-bold rounded-xl hover:bg-[#b50014] transition-all shadow-lg shadow-red-500/20 text-sm flex items-center justify-center gap-2"
                            >
                                Thanh toán <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
