
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';
import { ShoppingCart, Star, PackageCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductCardProps {
    product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
    const { addToCart } = useCart();

    // Calculate mock discount
    const oldPrice = product.price * 1.15;
    const discount = 15;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full hover:shadow-xl hover:border-[#D70018] transition-all duration-300"
        >
            {/* Discount Badge */}
            <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-2 left-2 z-20"
            >
                <div className="bg-[#D70018] text-white text-[11px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg shadow-md">
                    -{discount}%
                </div>
            </motion.div>

            {/* Hot/New Badge */}
            <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-2 right-2 z-20"
            >
                <div className="bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm uppercase">
                    Bán chạy
                </div>
            </motion.div>

            {/* Product Image Area */}
            <Link to={`/product/${product.id}`} className="block relative pt-[100%] bg-white group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    {/* Placeholder replacement or actual image if exists */}
                    <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center text-gray-200 border border-gray-100 italic">
                        <span className="text-5xl font-black opacity-10">{product.name.charAt(0)}</span>
                    </div>
                </div>
            </Link>

            {/* Info Area */}
            <div className="p-4 flex flex-col flex-1 border-t border-gray-50">
                <div className="mb-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}
                    <span className="text-[10px] text-gray-400 ml-1">( Mã: QH-{product.id.substring(0, 4)} )</span>
                </div>

                <Link to={`/product/${product.id}`} className="mb-3 block">
                    <h3 className="text-sm font-bold text-gray-800 group-hover:text-[#D70018] transition-colors line-clamp-2 min-h-[40px] leading-tight uppercase italic tracking-tighter">
                        {product.name}
                    </h3>
                </Link>

                <div className="mt-auto space-y-2">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 line-through leading-none">{oldPrice.toLocaleString()}đ</span>
                        <span className="text-lg font-black text-[#D70018] leading-tight">{product.price.toLocaleString()}đ</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <PackageCheck size={14} /> Còn hàng
                        </span>

                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-[#D70018] hover:text-white transition-all active:scale-95"
                            title="Thêm vào giỏ hàng"
                        >
                            <ShoppingCart size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick view overlay on hover */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 transition-all duration-500">
                <button className="bg-white/90 backdrop-blur text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-2xl border border-gray-100 hover:bg-[#D70018] hover:text-white transition-all transform hover:scale-110 active:scale-95">
                    Xem nhanh
                </button>
            </div>
        </motion.div>
    );
};
