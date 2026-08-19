import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { useProducts } from '../../hooks/useProducts';

/**
 * Dense "flash sale" strip for the fallback homepage layout — mirrors the
 * DynamicHomepage FlashDeal section so both render paths feel equally rich.
 */
export const FallbackFlashStrip = () => {
    const { data: products, isLoading } = useProducts();
    const deals = products?.slice(0, 5) || [];

    if (isLoading && deals.length === 0) return null;
    if (deals.length === 0) return null;

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-10">
            <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 rounded-t-2xl py-4 px-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-yellow-400 text-red-700 rounded-full p-2"
                    >
                        <Zap className="fill-current" size={24} />
                    </motion.div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        Flash Sale - Giá Sốc
                        <span className="bg-yellow-400 text-red-700 px-3 py-1 rounded-full text-xs">HOT</span>
                    </h2>
                </div>
                <Link
                    to="/products"
                    className="hidden md:flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-full font-black text-sm hover:bg-yellow-400 hover:text-red-700 transition-all shadow-lg hover:scale-105"
                >
                    Xem tất cả
                    <ChevronRight size={16} />
                </Link>
            </div>
            <div className="bg-white rounded-b-2xl border-2 border-red-200 p-1 md:p-6 shadow-xl">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
                    {deals.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
};
