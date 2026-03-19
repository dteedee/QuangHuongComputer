import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';

interface BannerGridProps {
    title: string;
    config: {
        banners: Array<{
            title: string;
            subtitle?: string;
            icon?: string;
            gradient?: string;
            link: string;
        }>;
        columns?: number;
    };
}

export const BannerGrid: React.FC<BannerGridProps> = ({ config }) => {
    const { banners = [], columns = 3 } = config;

    const renderIcon = (iconName?: string) => {
        if (!iconName) return null;
        const Icon = (LucideIcons as any)[iconName];
        return Icon ? <Icon size={32} /> : null;
    };

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-6">
            <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6`}>
                {banners.map((banner, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ scale: 1.05, y: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <Link
                            to={banner.link}
                            className={`block bg-gradient-to-br ${banner.gradient || 'from-red-500 to-pink-600'} rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all group relative overflow-hidden`}
                        >
                            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                {renderIcon(banner.icon)}
                            </div>
                            <div className="relative z-10">
                                <div className="mb-3">{renderIcon(banner.icon)}</div>
                                <h4 className="text-xl font-black uppercase leading-tight">
                                    {banner.title}
                                </h4>
                                {banner.subtitle && (
                                    <p className="text-sm font-semibold text-white/90 mt-1">
                                        {banner.subtitle}
                                    </p>
                                )}
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
