import { Link } from 'react-router-dom';
import { Zap, Monitor, Briefcase } from 'lucide-react';

interface HeaderTopBarProps {
    isScrolled: boolean;
}

/**
 * Top strip đỏ (~28px) theo layout hacom.vn: tagline chuỗi dịch vụ trái + quick links phải.
 * Ẩn khi cuộn để header thu gọn (sticky compact).
 */
export const HeaderTopBar = ({ isScrolled }: HeaderTopBarProps) => {
    return (
        <div
            className={`bg-accent text-white text-[11px] font-medium hidden md:block overflow-hidden transition-all duration-200 ${
                isScrolled ? 'max-h-0 py-0 opacity-0' : 'max-h-8 py-1.5 opacity-100'
            }`}
        >
            <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
                <span className="tracking-wide">
                    Hệ thống bán lẻ máy tính uy tín — SINCE 2008
                </span>
                <div className="flex items-center gap-5">
                    <Link to="/policy/promotions" className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer">
                        <Zap size={11} /> Khuyến mãi
                    </Link>
                    <Link to="/policy/news" className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer">
                        <Monitor size={11} /> Tin công nghệ
                    </Link>
                    <Link to="/recruitment" className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer">
                        <Briefcase size={11} /> Tuyển dụng
                    </Link>
                </div>
            </div>
        </div>
    );
};
