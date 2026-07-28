import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, ChevronRight } from 'lucide-react';

interface Brand {
    name: string;
    logoUrl: string;
    link: string;
}

interface BrandShowcaseProps {
    title: string;
    config: {
        brands?: Brand[];
        columns?: number;
        style?: 'grid' | 'carousel';
        showTitle?: boolean;
    };
}

export const BrandShowcase: React.FC<BrandShowcaseProps> = ({ title, config }) => {
    const {
        brands = [],
        columns = 6,
        style = 'grid',
        showTitle = true,
    } = config;

    if (brands.length === 0) return null;

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-8">
            {showTitle && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                        <span className="text-accent"><Award size={24} /></span>
                        {title || 'THƯƠNG HIỆU NỔI BẬT'}
                    </h2>
                </div>
            )}

            {style === 'carousel' ? (
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-4 pb-2">
                        {brands.map((brand, i) => (
                            <BrandCard key={i} brand={brand} index={i} />
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${Math.min(columns, 8)}, 1fr)` }}
                >
                    {brands.map((brand, i) => (
                        <BrandCard key={i} brand={brand} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
};

const BrandCard: React.FC<{ brand: Brand; index: number }> = ({ brand, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.04 }}
    >
        <Link
            to={brand.link || '#'}
            className="flex items-center justify-center bg-white rounded-xl border-2 border-gray-100 hover:border-accent/30 hover:shadow-lg p-4 h-[80px] transition-all group"
        >
            <img
                src={brand.logoUrl}
                alt={brand.name}
                className="max-h-[48px] max-w-full object-contain grayscale group-hover:grayscale-0 transition-all"
                onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        </Link>
        <p className="text-center text-xs text-gray-500 mt-1 font-medium truncate">{brand.name}</p>
    </motion.div>
);
