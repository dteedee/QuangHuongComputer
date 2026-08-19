import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Cpu, ChevronRight } from 'lucide-react';

/**
 * Two-up promo banner for the fallback layout: repair service + build-PC
 * service, matching hacom.vn's "banner đôi" pattern under the product grids.
 */
export const DualServiceBanner = () => (
    <div className="max-w-[1400px] mx-auto px-4 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link
                    to="/repair"
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

            <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link
                    to="/build-pc"
                    className="relative flex items-center gap-5 bg-gradient-to-br from-accent to-[#7a0f14] rounded-2xl p-7 overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
                >
                    <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cpu size={140} className="text-white" />
                    </div>
                    <div className="relative z-10 bg-white/10 rounded-full p-4">
                        <Cpu size={32} className="text-white" />
                    </div>
                    <div className="relative z-10 flex-1">
                        <h3 className="text-white font-black text-lg uppercase">Xây Dựng Cấu Hình PC</h3>
                        <p className="text-white/80 text-sm mt-1">Tự chọn linh kiện, kiểm tra tương thích tự động</p>
                        <span className="inline-flex items-center gap-1 text-yellow-300 text-sm font-bold mt-3">
                            Build ngay <ChevronRight size={16} />
                        </span>
                    </div>
                </Link>
            </motion.div>
        </div>
    </div>
);
