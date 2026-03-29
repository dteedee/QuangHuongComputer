import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import { motion } from 'framer-motion';
import {
    Monitor, ChevronRight, Gamepad, Server, Cpu,
    Wifi, Wrench, Zap, Laptop, Gift, Star, Speaker,
    Camera, Headset, MousePointer2
} from 'lucide-react';
import { catalogApi, type Category } from '../../api/catalog';

// Import Swiper styles
import 'swiper/swiper-bundle.css';
interface HeroSliderProps {
    title: string;
    config: {
        slides?: Array<{
            title: string;
            subtitle?: string;
            description?: string;
            image: string;
            link: string;
            badge?: string;
            gradient?: string;
        }>;
        showSidebar?: boolean;
    };
}

const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('laptop')) return <Laptop size={16} />;
    if (lowerName.includes('game') || lowerName.includes('gaming')) return <Gamepad size={16} />;
    if (lowerName.includes('workstation') || lowerName.includes('đồ họa')) return <Server size={16} />;
    if (lowerName.includes('màn') || lowerName.includes('monitor')) return <Monitor size={16} />;
    if (lowerName.includes('linh kiện') || lowerName.includes('cpu') || lowerName.includes('ram')) return <Cpu size={16} />;
    if (lowerName.includes('phím') || lowerName.includes('chuột') || lowerName.includes('gear')) return <MousePointer2 size={16} />;
    if (lowerName.includes('mạng') || lowerName.includes('wifi')) return <Wifi size={16} />;
    if (lowerName.includes('camera') || lowerName.includes('cam')) return <Camera size={16} />;
    if (lowerName.includes('loa') || lowerName.includes('âm thanh') || lowerName.includes('mic')) return <Speaker size={16} />;
    if (lowerName.includes('phụ kiện') || lowerName.includes('tai nghe')) return <Headset size={16} />;
    return <Wrench size={16} />;
};

export const HeroSlider: React.FC<HeroSliderProps> = ({ config }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const { slides = [], showSidebar = true } = config;

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await catalogApi.getCategories();
                setCategories(data.filter(c => c.isActive));
            } catch (err) {
                console.error('Failed to fetch categories', err);
            }
        };
        fetchCategories();
    }, []);

    return (
        <div className="max-w-[1400px] mx-auto px-4 pt-6">
            <div className={`grid ${showSidebar ? 'lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                {showSidebar && (
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="hidden lg:flex flex-col bg-white overflow-hidden rounded-2xl shadow-xl border border-gray-100 h-[500px]"
                    >
                        <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white px-4 py-3 flex-shrink-0">
                            <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                <Gift size={18} />
                                DANH MỤC SẢN PHẨM
                            </h3>
                        </div>
                        <div className="py-2 flex-1 overflow-y-auto custom-scrollbar">
                            {categories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    to={`/products?category=${cat.id}`}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-accent transition-all group border-l-4 border-transparent hover:border-accent"
                                >
                                    <span className="text-gray-400 group-hover:text-accent transition-colors">
                                        {getCategoryIcon(cat.name)}
                                    </span>
                                    <span className="flex-1 line-clamp-1">{cat.name}</span>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className={`${showSidebar ? 'lg:col-span-3' : ''} rounded-2xl overflow-hidden shadow-2xl border-4 border-white h-[500px] bg-gray-100`}
                >
                    <Swiper
                        modules={[Navigation, Pagination, Autoplay, EffectFade]}
                        navigation
                        pagination={{ clickable: true }}
                        autoplay={{ delay: 5000, disableOnInteraction: false }}
                        effect="fade"
                        fadeEffect={{ crossFade: true }}
                        loop
                        className="h-full"
                    >
                        {slides.map((slide, i) => (
                            <SwiperSlide key={i}>
                                <div className="relative w-full h-full">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${slide.image.startsWith('/uploads') ? `http://localhost:5000${slide.image}` : slide.image})` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-700 to-amber-600 opacity-80" />
                                    </div>

                                    <div className="relative h-full flex items-center p-8 md:p-16 text-white z-10">
                                        <div className="max-w-4xl w-full">
                                            {slide.badge && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    whileInView={{ scale: 1 }}
                                                    className="inline-flex bg-yellow-400 text-red-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg mb-4 items-center gap-2"
                                                >
                                                    <Star size={14} className="fill-current" />
                                                    {slide.badge}
                                                </motion.div>
                                            )}
                                            <h1 className="text-3xl md:text-5xl lg:text-[56px] tracking-tight font-black leading-tight drop-shadow-2xl">
                                                {slide.title}
                                            </h1>
                                            <h2 className="text-lg md:text-2xl font-bold mt-2 text-yellow-200 drop-shadow-lg">
                                                {slide.subtitle}
                                            </h2>
                                            <p className="text-lg mt-4 text-white/90 font-semibold drop-shadow">
                                                {slide.description}
                                            </p>
                                            <div className="mt-8">
                                                <Link
                                                    to={slide.link}
                                                    className="inline-flex items-center gap-3 bg-white text-red-600 px-8 py-4 rounded-full font-black text-lg uppercase hover:bg-yellow-400 hover:text-red-700 transition-all shadow-2xl hover:scale-105"
                                                >
                                                    <Zap className="fill-current" size={24} />
                                                    MUA NGAY
                                                    <ChevronRight size={24} />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </motion.div>
            </div>
        </div>
    );
};
