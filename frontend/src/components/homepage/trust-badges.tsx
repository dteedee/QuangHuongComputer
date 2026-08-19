import { motion } from 'framer-motion';
import { Truck, Shield, HeadphonesIcon, BadgeCheck } from 'lucide-react';

const BADGES = [
    { icon: BadgeCheck, title: 'Chính hãng 100%', desc: 'Cam kết hàng chính hãng', color: 'text-accent bg-red-50' },
    { icon: Shield, title: 'Bảo hành an tâm', desc: 'Bảo hành dài hạn uy tín', color: 'text-emerald-600 bg-emerald-50' },
    { icon: Truck, title: 'Giao hàng nhanh', desc: 'Miễn phí cho đơn từ 500K', color: 'text-blue-600 bg-blue-50' },
    { icon: HeadphonesIcon, title: 'Giá tốt nhất', desc: 'Hotline: 0904.235.090', color: 'text-amber-600 bg-amber-50' },
];

/**
 * 4 trust/confidence badges for the homepage.
 * Displays warranty, shipping, authenticity, and price guarantees.
 */
export const TrustBadges = () => (
    <div className="max-w-[1400px] mx-auto px-4 mt-14">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {BADGES.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-4 group"
                        >
                            <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                                <Icon size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm mb-0.5">
                                    {item.title}
                                </h4>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    </div>
);
