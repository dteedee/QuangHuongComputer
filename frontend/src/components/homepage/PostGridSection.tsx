import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Calendar, ChevronRight } from 'lucide-react';
import { contentApi, type Post } from '../../api/content';

interface PostGridSectionProps {
    title: string;
    config: {
        postType?: 'News' | 'Promotion' | 'Article';
        limit?: number;
        columns?: number;
    };
}

export const PostGridSection: React.FC<PostGridSectionProps> = ({ title, config }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const { postType = 'News', limit = 4, columns = 4 } = config;

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const data = await contentApi.getPosts(postType as any);
                setPosts(data.slice(0, limit));
            } catch (err) {
                console.error('Failed to fetch posts', err);
            }
        };
        fetchPosts();
    }, [postType, limit]);

    if (posts.length === 0) return null;

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-16">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                    <span className="text-[#D70018]"><FileText size={28} /></span>
                    {title || 'TIN TỨC & KHUYẾN MÃI'}
                </h2>
                <Link
                    to={postType === 'News' ? '/policy/news' : '/policy/promotions'}
                    className="text-sm font-bold text-[#D70018] hover:underline flex items-center gap-1 uppercase tracking-wider"
                >
                    Xem tất cả <ChevronRight size={16} />
                </Link>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
                {posts.map((post, i) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="group"
                    >
                        <Link to={`/posts/${post.slug}`} className="block h-full bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-100 h-full">
                            <div className="aspect-video overflow-hidden">
                                <img 
                                    src={post.featuredImage || 'https://images.unsplash.com/photo-1517433447755-d1490d892477?w=800&h=450&fit=crop'} 
                                    alt={post.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#D70018] uppercase mb-3">
                                    <Calendar size={14} />
                                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Dec 24, 2025'}
                                </div>
                                <h3 className="font-black text-gray-800 text-lg group-hover:text-[#D70018] transition-colors line-clamp-2 leading-tight">
                                    {post.title}
                                </h3>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
