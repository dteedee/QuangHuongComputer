import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Laptop, Gamepad, Server, Monitor, Cpu, 
    MousePointer2, Wifi, Camera, Speaker, Headset, 
    Wrench, LayoutGrid, ChevronRight 
} from 'lucide-react';
import { catalogApi, type Category } from '../../api/catalog';

interface CategoryGridSectionProps {
    title: string;
    config: {
        limit?: number;
        columns?: number;
    };
}

const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('laptop')) return <Laptop size={40} />;
    if (lowerName.includes('game') || lowerName.includes('gaming')) return <Gamepad size={40} />;
    if (lowerName.includes('workstation') || lowerName.includes('đồ họa')) return <Server size={40} />;
    if (lowerName.includes('màn') || lowerName.includes('monitor')) return <Monitor size={40} />;
    if (lowerName.includes('linh kiện') || lowerName.includes('cpu') || lowerName.includes('ram')) return <Cpu size={40} />;
    if (lowerName.includes('phím') || lowerName.includes('chuột') || lowerName.includes('gear')) return <MousePointer2 size={40} />;
    if (lowerName.includes('mạng') || lowerName.includes('wifi')) return <Wifi size={40} />;
    if (lowerName.includes('camera') || lowerName.includes('cam')) return <Camera size={40} />;
    if (lowerName.includes('loa') || lowerName.includes('âm thanh') || lowerName.includes('mic')) return <Speaker size={40} />;
    if (lowerName.includes('phụ kiện') || lowerName.includes('tai nghe')) return <Headset size={40} />;
    return <Wrench size={40} />;
};

export const CategoryGridSection: React.FC<CategoryGridSectionProps> = ({ title, config }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const { limit = 8, columns = 4 } = config;

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await catalogApi.getCategories();
                setCategories(data.filter(c => c.isActive).slice(0, limit));
            } catch (err) {
                console.error('Failed to fetch categories', err);
            }
        };
        fetchCategories();
    }, []);

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-16">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                    <span className="text-accent"><LayoutGrid size={28} /></span>
                    {title || 'DANH MỤC SẢN PHẨM'}
                </h2>
                <Link
                    to="/products"
                    className="text-sm font-bold text-accent hover:underline flex items-center gap-1 uppercase tracking-wider"
                >
                    Tất cả danh mục <ChevronRight size={16} />
                </Link>
            </div>
            <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-6`}>
                {categories.map((cat, i) => (
                    <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -8 }}
                    >
                        <Link
                            to={`/products?category=${cat.id}`}
                            className="block bg-white rounded-3xl p-8 text-center border-4 border-gray-50 hover:border-red-100 shadow-lg hover:shadow-2xl transition-all"
                        >
                            <div className="text-accent flex justify-center mb-6 transform group-hover:scale-110 transition-transform">
                                {getCategoryIcon(cat.name)}
                            </div>
                            <h4 className="font-black text-gray-800 text-sm uppercase leading-tight h-10 flex items-center justify-center">
                                {cat.name}
                            </h4>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
