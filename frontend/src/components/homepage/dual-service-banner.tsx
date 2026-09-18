import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, ChevronRight } from 'lucide-react';
import { ROUTES } from '../../routes/route-paths';

/**
 * Promo banner for the fallback layout: repair service, matching hacom.vn's
 * "banner đôi" pattern under the product grids.
 *
 * W0-12 (step 5): PC Builder card đã bỏ — tính năng chưa ra mắt (`/build-pc` không route),
 * ẩn tới khi W3-9 build thật. Repair giữ nguyên, chuyển sang full-width thay vì 2 cột.
 */
export const DualServiceBanner = () => (
    <div className="max-w-[1400px] mx-auto px-4 mt-10">
        <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }} className="max-w-xl mx-auto">
            <Link
                to={ROUTES.REPAIR}
                className="relative flex items-center gap-5 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl p-7 overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
            >
                <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wrench size={140} className="text-white" />
                </div>
                <div className="relative z-10 bg-white/10 rounded-full p-4">
                    <Wrench size={32} className="text-white" />
                </div>
                <div className="relative z-10 flex-1">
                    <h3 className="text-white font-black text-lg uppercase">Dịch Vụ Sửa Chữa</h3>
                    <p className="text-gray-300 text-sm mt-1">Kỹ thuật viên tận tâm, bảo hành rõ ràng</p>
                    <span className="inline-flex items-center gap-1 text-yellow-300 text-sm font-bold mt-3">
                        Đặt lịch ngay <ChevronRight size={16} />
                    </span>
                </div>
            </Link>
        </motion.div>
    </div>
);
