import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

/**
 * Fixed right-side "skyscraper" banner à la hacom.vn — only shown on very
 * wide screens (>=1536px / Tailwind 2xl) so it never crowds normal desktop
 * or mobile viewports.
 */
export const SkyscraperBanner = () => (
    <Link
        to="/products"
        className="hidden 2xl:flex fixed right-4 top-1/3 z-30 w-[140px] flex-col items-center gap-2 bg-gradient-to-b from-accent to-[#7a0f14] text-white rounded-2xl p-4 shadow-2xl hover:scale-105 transition-transform"
    >
        <Sparkles size={28} className="text-yellow-300" />
        <span className="text-xs font-black uppercase text-center leading-tight">
            Ưu Đãi Back To School
        </span>
        <span className="text-[11px] text-white/80 text-center">Giảm đến 20%</span>
        <span className="mt-1 bg-white text-accent text-[11px] font-bold px-3 py-1 rounded-full">
            Mua ngay
        </span>
    </Link>
);
