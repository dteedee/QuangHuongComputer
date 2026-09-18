import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useCompanyInfo } from '../../hooks/use-company-info';

/**
 * Dải khuyến mãi trên cùng trang chủ.
 *
 * W0 gate: bản cũ dùng một dòng `whitespace-nowrap` + `animate-marquee` duy nhất cho mọi
 * kích thước màn hình. Ở 390px, khung `overflow-hidden` cắt ngang chữ ("Miễn phí giao hàng ch")
 * nên nhìn như lỗi hiển thị; nếu người dùng bật "giảm chuyển động" (`prefers-reduced-motion`,
 * index.css tắt animation) thì dòng chữ đứng im ở trạng thái bị cắt.
 *
 * Nay tách 2 chế độ:
 * - < sm: các mục xuống dòng gọn gàng, đọc được trọn vẹn, không cắt chữ, không tràn ngang.
 * - ≥ sm: giữ marquee chạy như cũ (có đủ chiều rộng nên không bị cắt giữa từ).
 * `animate-marquee` là class CSS thuần (index.css) nên không có biến thể responsive của Tailwind
 * ⇒ phải dùng 2 nhánh markup thay vì `sm:animate-marquee`.
 */
const PROMO_ITEMS = [
    'Miễn phí giao hàng cho đơn từ 500K',
    'Trả góp 0% lãi suất',
    'Bảo hành chính hãng',
    'Hỗ trợ 24/7',
];

/* D09: the hotline is config-driven (`useCompanyInfo`), never a literal — the
 * hardcoded value here disagreed with the Footer and the contact page. */
export const PromoMarqueeStrip = () => {
    const { companyInfo } = useCompanyInfo();
    const HOTLINE = companyInfo.hotline;

    return (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-accent to-[#b91c1c] text-white py-2 sm:py-2.5 overflow-hidden"
    >
        <div className="flex items-center justify-center gap-2 px-3 sm:px-4">
            <Zap className="text-yellow-300 flex-shrink-0" size={16} aria-hidden="true" />

            {/* Mobile: wrap gọn, không cắt chữ */}
            <div className="sm:hidden flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] font-bold leading-tight text-center">
                {PROMO_ITEMS.map(item => (
                    <span key={item} className="whitespace-nowrap">
                        {item}
                        <span className="ml-2 text-yellow-300">•</span>
                    </span>
                ))}
                <span className="whitespace-nowrap">Hotline: {HOTLINE}</span>
            </div>

            {/* Desktop: marquee một dòng như thiết kế gốc */}
            <div className="hidden sm:block min-w-0 overflow-hidden">
                <p className="text-sm font-bold tracking-wide whitespace-nowrap animate-marquee">
                    {PROMO_ITEMS.join('  •  ')}
                    {'  |  '}
                    Hotline: {HOTLINE}
                </p>
            </div>

            <Zap className="text-yellow-300 flex-shrink-0" size={16} aria-hidden="true" />
        </div>
    </motion.div>
    );
};

export default PromoMarqueeStrip;
