import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Award, Truck, Wrench } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface ServiceGridProps {
    title: string;
    config: {
        services: Array<{
            title: string;
            desc: string;
            icon: string;
        }>;
        columns?: number;
    };
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({ title, config }) => {
    const { services = [], columns = 4 } = config;

    const renderIcon = (iconName?: string) => {
        if (!iconName) return null;
        const Icon = (LucideIcons as any)[iconName] || LucideIcons.Wrench;
        return Icon ? <Icon size={40} /> : null;
    };

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-16">
            <div className="bg-gradient-to-br from-white via-red-50 to-amber-50 rounded-3xl border-4 border-red-200 p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />
                
                <h2 className="text-3xl md:text-4xl font-black text-center text-gray-800 mb-12 uppercase tracking-tighter relative z-10">
                    {title || 'Tại Sao Chọn Quang Hưởng Computer?'}
                </h2>
                <div className={`grid md:grid-cols-${columns} gap-8 relative z-10`}>
                    {services.map((item, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ scale: 1.05, y: -10 }}
                            className="text-center p-8 bg-white rounded-2xl shadow-lg border-2 border-red-100 group transition-all"
                        >
                            <div className="text-[#D70018] flex justify-center mb-6 group-hover:scale-110 transition-transform">
                                {renderIcon(item.icon)}
                            </div>
                            <h4 className="font-black text-gray-800 text-sm uppercase mb-3">
                                {item.title}
                            </h4>
                            <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
