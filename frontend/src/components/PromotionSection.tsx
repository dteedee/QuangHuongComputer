import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Tag, Newspaper, Sparkles, ArrowRight, Clock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

// Helper to strip HTML tags and get plain text
const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

// Get category badge color
const getCategoryColor = (type: string, category?: string) => {
    if (type === 'Promotion') return 'bg-gradient-to-r from-red-500 to-orange-500';
    if (type === 'News') return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (category === 'Review') return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (category === 'Hướng dẫn') return 'bg-gradient-to-r from-green-500 to-teal-500';
    return 'bg-gradient-to-r from-gray-600 to-gray-800';
};

// Get category icon
const getCategoryIcon = (type: string) => {
    if (type === 'Promotion') return <Tag size={12} />;
    if (type === 'News') return <Newspaper size={12} />;
    return <Sparkles size={12} />;
};

export const PromotionSection = () => {
    const { data: posts = [], isLoading } = useQuery({
        queryKey: ['public-posts'],
        queryFn: contentApi.getPosts,
    });

    const newsItems = posts
        .filter(p => (p.type === 'Article' || p.type === 'News' || p.type === 'Promotion') && p.isPublished)
        .slice(0, 6);

    // Featured post (first one)
    const featuredPost = newsItems[0];
    // Other posts
    const otherPosts = newsItems.slice(1, 5);

    if (isLoading) {
        return (
            <div className="max-w-[1400px] mx-auto px-4 mt-16 mb-20">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="aspect-[16/10] bg-gray-200 rounded-3xl"></div>
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-[4/3] bg-gray-200 rounded-2xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (newsItems.length === 0) {
        return null;
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-16 mb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-2">
                        Tin tức & <span className="text-[#D70018]">Khuyến mãi</span>
                    </h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                        Cập nhật những thông tin công nghệ và ưu đãi mới nhất
                    </p>
                </div>
                <Link
                    to="/products"
                    className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] transition-colors"
                >
                    Xem tất cả
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:bg-[#D70018] group-hover:border-[#D70018] group-hover:text-white transition-all shadow-sm">
                        <ChevronRight size={14} />
                    </div>
                </Link>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Featured Post */}
                {featuredPost && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="group"
                    >
                        <Link to={`/post/${featuredPost.slug}`} className="block">
                            <div className="relative aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl shadow-gray-300/50">
                                {featuredPost.thumbnailUrl ? (
                                    <img
                                        src={featuredPost.thumbnailUrl}
                                        alt={featuredPost.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                        <Newspaper size={64} className="text-gray-600" />
                                    </div>
                                )}

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                {/* Badge */}
                                <div className="absolute top-4 left-4">
                                    <span className={`${getCategoryColor(featuredPost.type, featuredPost.category)} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5`}>
                                        {getCategoryIcon(featuredPost.type)}
                                        {featuredPost.type === 'Promotion' ? 'Hot Deal' : featuredPost.category || 'Tin tức'}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <div className="flex items-center gap-4 text-white/70 text-xs mb-3">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            {new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString('vi-VN')}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={12} />
                                            5 phút đọc
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white leading-tight mb-3 group-hover:text-[#D70018] transition-colors line-clamp-2">
                                        {featuredPost.title}
                                    </h3>
                                    <p className="text-white/80 text-sm line-clamp-2">
                                        {stripHtml(featuredPost.content).substring(0, 150)}...
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-[#D70018] font-bold text-sm group-hover:gap-3 transition-all">
                                        Đọc ngay <ArrowRight size={16} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                )}

                {/* Other Posts Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {otherPosts.map((item: any, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group"
                        >
                            <Link to={`/post/${item.slug}`} className="block">
                                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg shadow-gray-200/50 mb-3">
                                    {item.thumbnailUrl ? (
                                        <img
                                            src={item.thumbnailUrl}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                            <Newspaper size={32} className="text-gray-400" />
                                        </div>
                                    )}

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className={`${getCategoryColor(item.type, item.category)} text-white text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow flex items-center gap-1`}>
                                            {getCategoryIcon(item.type)}
                                            {item.type === 'Promotion' ? 'KM' : item.type === 'News' ? 'Tin' : 'Bài viết'}
                                        </span>
                                    </div>

                                    {/* Read more overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="bg-white/90 text-gray-900 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2">
                                            <Eye size={14} /> Xem chi tiết
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        <Calendar size={10} className="text-[#D70018]" />
                                        {new Date(item.publishedAt || item.createdAt).toLocaleDateString('vi-VN')}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-[#D70018] transition-colors line-clamp-2">
                                        {item.title}
                                    </h3>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Promotion Banner */}
            {newsItems.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="mt-8"
                >
                    <div className="bg-gradient-to-r from-[#D70018] via-red-600 to-orange-500 rounded-2xl p-6 flex items-center justify-between overflow-hidden relative">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2"></div>

                        <div className="relative z-10">
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Đừng bỏ lỡ</p>
                            <h3 className="text-white text-xl font-black">
                                Flash Sale mỗi cuối tuần - Giảm đến 50%
                            </h3>
                        </div>
                        <Link
                            to="/products"
                            className="relative z-10 bg-white text-[#D70018] px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg"
                        >
                            Mua ngay
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
