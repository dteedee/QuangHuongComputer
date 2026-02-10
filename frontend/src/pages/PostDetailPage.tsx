
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import { Loader2, ArrowLeft, Calendar, User, Clock, Tag } from 'lucide-react';
import SEO from '../components/SEO';

export const PostDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();

    const { data: post, isLoading, error } = useQuery({
        queryKey: ['public-post', slug],
        queryFn: () => contentApi.getPost(slug || ''),
        enabled: !!slug,
        retry: false
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="animate-spin text-[#D70018]" />
                    <p className="font-medium text-gray-500">Đang tải bài viết...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy bài viết</h1>
                <p className="text-gray-500 mb-6">Bài viết bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
                <Link to="/" className="px-6 py-2 bg-[#D70018] text-white rounded-lg hover:bg-red-700 transition-colors">
                    Về trang chủ
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20 font-sans">
            <SEO
                title={post.title}
                description={post.summary || post.content?.replace(/<[^>]*>?/gm, '').substring(0, 150)}
                image={post.featuredImage}
                type="article"
            />
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Link to="/" className="hover:text-[#D70018] transition-colors">Trang chủ</Link>
                        <span>/</span>
                        <Link to="/policy/news" className="hover:text-[#D70018] transition-colors">Tin tức & Blog</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-md">{post.title}</span>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="container mx-auto px-4 mt-8">
                <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">

                    {/* Featured Image */}
                    {post.featuredImage && (
                        <div className="w-full h-64 md:h-96 bg-gray-100 relative">
                            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                            <div className="absolute top-4 left-4">
                                <span className="bg-[#D70018] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                    {post.type}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="p-6 md:p-12">
                        {/* Header */}
                        <div className="mb-10 border-b border-gray-100 pb-8">
                            {!post.featuredImage && (
                                <div className="mb-4">
                                    <span className="bg-red-50 text-[#D70018] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                        {post.type}
                                    </span>
                                </div>
                            )}

                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 leading-tight">
                                {post.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-[#D70018]" />
                                    <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-[#D70018]" />
                                    <span>Admin</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-[#D70018]" />
                                    <span>5 phút đọc</span>
                                </div>
                            </div>
                        </div>

                        {/* Body Content */}
                        <div
                            className="prose prose-lg prose-red max-w-none text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Tag size={18} className="text-gray-400" />
                                    <div className="flex flex-wrap gap-2">
                                        {post.tags.map(tag => (
                                            <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-200 cursor-pointer transition-colors">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Back Button */}
                <div className="max-w-4xl mx-auto mt-8 mb-12">
                    <Link to="/policy/news" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D70018] font-bold transition-colors group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách tin tức
                    </Link>
                </div>
            </div>
        </div>
    );
};
