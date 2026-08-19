import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

// Text-logo pills (no third-party brand artwork) — matches hacom.vn's brand
// strip pattern while staying image-free/legal-safe.
const BRANDS = ['ASUS', 'MSI', 'DELL', 'HP', 'ACER', 'LENOVO', 'LOGITECH', 'GIGABYTE'];

/**
 * Brand row for the fallback homepage layout: simple bold text pills instead
 * of external logo images, hover-highlighted like hacom's brand filter bar.
 */
export const BrandRow = () => (
    <div className="max-w-[1400px] mx-auto px-4 mt-10">
        <div className="flex items-center gap-2 mb-4">
            <Award size={20} className="text-accent" />
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                Thương hiệu phân phối
            </h2>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {BRANDS.map((brand, i) => (
                <motion.div
                    key={brand}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                >
                    <Link
                        to="/products"
                        className="flex items-center justify-center h-16 bg-white rounded-xl border-2 border-gray-100 hover:border-accent hover:text-accent text-gray-500 font-black text-sm tracking-wide transition-all hover:shadow-md"
                    >
                        {brand}
                    </Link>
                </motion.div>
            ))}
        </div>
    </div>
);
