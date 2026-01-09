import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export const PromotionSection = () => {
    const { data: posts = [], isLoading } = useQuery({
        queryKey: ['public-posts'],
        queryFn: contentApi.getPosts,
    });

    const newsItems = posts.filter(p => (p.type === 'Article' || p.type === 'News' || p.type === 'Promotion') && p.isPublished).slice(0, 3);

    // Mock data if empty
    const displayItems = newsItems.length > 0 ? newsItems : [
        {
            id: '1',
            title: 'Tưng bừng khai trương, ưu đãi lên tới 50%',
            slug: 'khai-truong-uu-dai',
            content: 'Hòa chung không khí rộn ràng ngày khai trương, Quang Hưởng mang đến chương trình khuyến mãi cực lớn...',
            createdAt: new Date().toISOString(),
        },
        {
            id: '2',
            title: 'Top 5 Laptop Gaming đáng mua nhất 2026',
            slug: 'top-5-laptop-gaming',
            content: 'Bạn đang tìm kiếm một chiếc laptop vừa mạnh mẽ vừa bền bỉ? Hãy xem ngay danh sách dưới đây...',
            createdAt: new Date().toISOString(),
        },
        {
            id: '3',
            title: 'Hướng dẫn Build PC văn phòng chỉ với 5 triệu đồng',
            slug: 'build-pc-van-phong',
            content: 'Làm thế nào để có một bộ PC văn phòng mượt mà mà vẫn tiết kiệm chi phí? Đừng bỏ lỡ bài viết này...',
            createdAt: new Date().toISOString(),
        }
    ];

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-16 mb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-2">
                        Tin tức & <span className="text-[#D70018]">Khuyến mãi</span>
                    </h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cập nhật những thông tin công nghệ mới nhất</p>
                </div>
                <Link to="/news" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] transition-colors">
                    Xem tất cả tin tức
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm">
                        <ChevronRight size={14} />
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {displayItems.map((item: any, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group cursor-pointer"
                    >
                        <div className="relative aspect-[16/9] rounded-3xl overflow-hidden mb-6 bg-gray-100 shadow-xl shadow-gray-200/50">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <MessageSquare size={48} strokeWidth={1} />
                            </div>
                            <div className="absolute top-4 left-4 z-20">
                                <span className="bg-[#D70018] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">Khuyến mãi</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <Calendar size={12} className="text-[#D70018]" />
                                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                            <h3 className="text-lg font-black text-gray-900 group-hover:text-[#D70018] transition-colors leading-tight uppercase italic truncate-2-lines">
                                {item.title}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium line-clamp-2 italic">
                                {item.content}
                                ...
                            </p>
                            <Link
                                to={`/news/${item.slug}`}
                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#D70018] hover:gap-3 transition-all mt-2"
                            >
                                Đọc chi tiết
                                <ChevronRight size={12} />
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
