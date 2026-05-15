
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
                    <Loader2 size={36} className="animate-spin text-accent" />
                    <p className="text-sm font-medium text-gray-500">Đang tải bài viết...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy bài viết</h1>
                <p className="text-gray-500 mb-6">Bài viết bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
                <Link
                    to="/"
                    className="px-6 py-2.5 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all cursor-pointer"
                >
                    Về trang chủ
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-12 font-sans">
            <SEO
                title={post.title}
                description={post.summary || (post.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150)}
                image={post.thumbnailUrl}
                type="article"
            />

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Link to="/" className="hover:text-accent transition-colors">Trang chủ</Link>
                        <span>/</span>
                        <Link to="/policy/news" className="hover:text-accent transition-colors">Tin tức & Blog</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-md">{post.title}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Featured Image */}
                    <div className="w-full h-56 md:h-80 bg-gray-100 relative">
                        <img
                            src={
                                post.thumbnailUrl ||
                                `/images/placeholders/${post.type === 'Promotion' ? 'promo' : 'news'}-${((post.slug.length + (post.title.codePointAt(0) || 0)) % (post.type === 'Promotion' ? 6 : 2)) + 1}.png`
                            }
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4">
                            <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                {post.type}
                            </span>
                        </div>
                    </div>

                    <div className="p-6 md:p-10">
                        {/* Title + meta */}
                        <div className="mb-8 pb-6 border-b border-gray-100">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5 leading-tight">
                                {post.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={15} className="text-accent" />
                                    <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <User size={15} className="text-accent" />
                                    <span>Admin</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={15} className="text-accent" />
                                    <span>5 phút đọc</span>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div
                            className="prose prose-lg prose-red max-w-none text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="mt-10 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Tag size={16} className="text-gray-400" />
                                    {post.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Back button */}
                <div className="mt-6">
                    <Link
                        to={post.type === 'Promotion' ? '/policy/promotions' : '/policy/news'}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-accent font-medium text-sm transition-colors cursor-pointer group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách {post.type === 'Promotion' ? 'khuyến mãi' : 'tin tức'}
                    </Link>
                </div>
            </div>
        </div>
    );
};
