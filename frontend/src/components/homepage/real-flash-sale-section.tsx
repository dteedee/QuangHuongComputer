import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { useProducts } from '../../hooks/useProducts';
import { contentApi, type FlashSale } from '../../api/content';
import FlashSaleCountdown from '../FlashSaleCountdown';
import { productsInFlashSale, applyFlashSaleDiscount } from './flash-sale-pricing';

interface RealFlashSaleSectionProps {
    title?: string;
    subtitle?: string;
    limit?: number;
    showViewAll?: boolean;
}

/**
 * W0-12 (step 4, binding D01 override): "remove the fake flash-sale section from the homepage
 * unless /api/content/flash-sales/active returns an active sale (then show real price + endsAt)".
 *
 * Dùng chung cho FlashDeal.tsx (mục CMS `flash_deal`) và fallback-flash-strip.tsx (layout
 * fallback khi CMS trống) — thay thế bản cũ tự bịa "5 sản phẩm đầu, giá nguyên".
 * KHÔNG render gì (null) nếu không có sale đang Active hoặc sale không có sản phẩm nào áp dụng
 * được trong 50 sản phẩm đã tải (giới hạn của useProducts — chấp nhận, W3-1 sẽ có endpoint
 * riêng cho sản phẩm trong sale).
 */
export const RealFlashSaleSection = ({ title, subtitle, limit = 5, showViewAll = true }: RealFlashSaleSectionProps) => {
    const { data: products } = useProducts();
    const [sales, setSales] = useState<FlashSale[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        contentApi.flashSales.getActive()
            .then((data) => { if (!cancelled) setSales(data); })
            .catch(() => { if (!cancelled) setSales([]); })
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    // Sale hiển thị đầu tiên theo displayOrder — nhiều sale cùng lúc để W3-1 (rebuild carousel).
    const sale = useMemo(
        () => [...sales].sort((a, b) => a.displayOrder - b.displayOrder)[0],
        [sales]
    );

    const deals = useMemo(() => {
        if (!sale || !products) return [];
        const inScope = productsInFlashSale(products, sale);
        return inScope.slice(0, limit).map((p) => ({
            ...p,
            price: applyFlashSaleDiscount(p.price, sale),
            oldPrice: p.price,
        }));
    }, [sale, products, limit]);

    // Chưa tải xong, không có sale active, hoặc sale không áp được vào sản phẩm nào -> KHÔNG hiện gì.
    if (!loaded || !sale || deals.length === 0) return null;

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-12">
            <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 rounded-t-2xl py-4 px-6 flex items-center justify-between shadow-lg overflow-hidden relative gap-4">
                <div className="flex items-center gap-4 relative z-10 min-w-0">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-yellow-400 text-red-700 rounded-full p-2 flex-shrink-0"
                    >
                        <Zap className="fill-current" size={28} />
                    </motion.div>
                    <div className="min-w-0">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 truncate">
                            {title || sale.name}
                            <span className="bg-yellow-400 text-red-700 px-3 py-1 rounded-full text-xs flex-shrink-0">HOT</span>
                        </h2>
                        <p className="text-white/80 text-sm font-semibold truncate">
                            {subtitle || sale.description || `Giảm đến ${sale.discountType === 'Percentage' ? `${sale.discountValue}%` : `${sale.discountValue.toLocaleString('vi-VN')}đ`}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 relative z-10 flex-shrink-0">
                    <FlashSaleCountdown endTime={sale.endTime} startTime={sale.startTime} variant="compact" className="text-white" />
                    {showViewAll && (
                        <Link
                            to="/products"
                            className="hidden md:flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-full font-black text-sm hover:bg-yellow-400 hover:text-red-700 transition-all shadow-lg hover:scale-105"
                        >
                            Xem tất cả
                            <ChevronRight size={16} />
                        </Link>
                    )}
                </div>
            </div>
            <div className="bg-white rounded-b-2xl border-2 border-red-200 p-1 md:p-6 shadow-xl relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
                    {deals.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
};
