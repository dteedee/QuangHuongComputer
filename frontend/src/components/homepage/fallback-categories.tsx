import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Laptop, Monitor, Gamepad, Cpu, Wrench, Package, ChevronRight } from 'lucide-react';

const CATEGORIES = [
    { icon: Laptop, name: 'Laptop', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600' },
    { icon: Gamepad, name: 'PC Gaming', color: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600' },
    { icon: Monitor, name: 'Man hinh', color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600' },
    { icon: Cpu, name: 'Linh kien', color: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white hover:border-amber-600' },
    { icon: Wrench, name: 'Sua chua', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600' },
    { icon: Package, name: 'Phu kien', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-600 hover:text-white hover:border-purple-600' },
];

/**
 * Fallback category grid when CMS sections are unavailable.
 * 6 category cards in a responsive grid with hover color transitions.
 */
export const FallbackCategories = () => (
    <div className="max-w-[1400px] mx-auto px-4 mt-14">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Kham pha danh muc
            </h2>
            <Link
                to="/products"
                className="text-sm font-semibold text-accent hover:underline flex items-center gap-1"
            >
                Xem tat ca <ChevronRight size={16} />
            </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((item, i) => {
                const Icon = item.icon;
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <Link
                            to="/products"
                            className={`flex flex-col items-center justify-center p-6 bg-white rounded-xl border transition-all duration-200 group ${item.color}`}
                        >
                            <Icon
                                size={30}
                                className="mb-3 transition-transform duration-200 group-hover:scale-110"
                            />
                            <h4 className="font-semibold text-sm">{item.name}</h4>
                        </Link>
                    </motion.div>
                );
            })}
        </div>
    </div>
);
