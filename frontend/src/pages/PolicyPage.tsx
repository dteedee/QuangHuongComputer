import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, ChevronRight, Zap, FileText, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import SEO from '../components/SEO';

const iconMapping: Record<string, any> = {
    'warranty': ShieldCheck,
    'return': RotateCcw,
    'shipping': Truck,
    'payment': CreditCard,
    'news': FileText,
    'promotions': Zap
};

const slugMapping: Record<string, string> = {
    'warranty': 'bao-hanh',
    'return': 'doi-tra',
    'shipping': 'van-chuyen',
    'payment': 'huong-dan-thanh-toan',
    'news': 'tin-tuc',
    'promotions': 'khuyen-mai',
    // Fallback for direct english slugs if seeded differently
    'bao-hanh': 'bao-hanh',
    'doi-tra': 'doi-tra',
    'van-chuyen': 'van-chuyen'
};

const titleMapping: Record<string, string> = {
    'warranty': 'Chính sách bảo hành',
    'return': 'Chính sách đổi trả',
    'shipping': 'Chính sách vận chuyển',
    'payment': 'Hướng dẫn thanh toán',
    'news': 'Tin tức & Blog',
    'promotions': 'Khuyến mãi'
};

const listTypes = ['news', 'promotions'];

export const PolicyPage = () => {
    const { type } = useParams<{ type: string }>();
    const currentType = type || 'warranty';
    const isListPage = listTypes.includes(currentType);

    // Page Logic
    const dbSlug = slugMapping[currentType] || currentType;
    const Icon = iconMapping[currentType] || ShieldCheck;

    // List Logic - Map URL type to API PostType
    const postTypeMap: Record<string, 'News' | 'Promotion'> = {
        'news': 'News',
        'promotions': 'Promotion'
    };

    const { data: page, isLoading: pageLoading, error: pageError } = useQuery({
        queryKey: ['public-page', dbSlug],
        queryFn: () => contentApi.getPage(dbSlug),
        enabled: !isListPage,
        retry: false
    });

    const { data: posts, isLoading: postsLoading, error: postsError } = useQuery({
        queryKey: ['public-posts', currentType],
        queryFn: () => contentApi.getPosts(postTypeMap[currentType]),
        enabled: isListPage
    });

    const isLoading = isListPage ? postsLoading : pageLoading;
    const error = isListPage ? postsError : pageError;

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <SEO
                title={titleMapping[currentType] || 'Chính sách'}
                description={page?.summary || `Thông tin chi tiết về ${titleMapping[currentType]} tại Quang Hưởng Computer.`}
            />
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Chính sách & Tin tức</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8 font-sans">
                {/* Sidebar */}
                <div className="w-full lg:w-1/4">
                    <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100 sticky top-4">
                        <div className="bg-[#D70018] text-white p-6 font-black uppercase text-xs italic tracking-widest">Danh mục</div>
                        <div className="flex flex-col">
                            {Object.entries(titleMapping).map(([key, label]) => {
                                const ItemIcon = iconMapping[key] || ShieldCheck;
                                return (
                                    <Link
                                        key={key}
                                        to={`/policy/${key}`}
                                        className={`p-5 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 hover:text-[#D70018] transition-all ${key === currentType ? 'text-[#D70018] font-black bg-red-50' : 'text-gray-500 font-bold'}`}
                                    >
                                        <div className="flex items-center gap-3 text-sm">
                                            <ItemIcon size={18} />
                                            <span>{label}</span>
                                        </div>
                                        <ChevronRight size={16} />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white p-6 md:p-10 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-50 min-h-[500px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                            <Loader2 size={40} className="animate-spin text-[#D70018] mb-4" />
                            <p className="uppercase font-bold text-xs tracking-widest">Đang tải nội dung...</p>
                        </div>
                    ) : isListPage ? (
                        // List View
                        <div>
                            <div className="flex items-center gap-5 mb-8 border-b border-gray-100 pb-6">
                                <div className="p-4 bg-red-50 text-[#D70018] rounded-2xl shadow-inner">
                                    <Icon size={32} />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">{titleMapping[currentType]}</h1>
                            </div>

                            {posts && posts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {posts.map((post: any) => (
                                        <div key={post.id} className="group border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all bg-white hover:-translate-y-1">
                                            {/* Fallback image or featured image */}
                                            <div className="h-48 bg-gray-100 overflow-hidden relative">
                                                {post.featuredImage ? (
                                                    <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                                        <FileText size={48} />
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-[#D70018] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                    {post.type}
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#D70018] transition-colors">{post.title}</h3>
                                                <p className="text-sm text-gray-500 line-clamp-3 mb-4">{post.summary || post.content?.replace(/<[^>]*>?/gm, '').substring(0, 100)}...</p>
                                                <Link to={`/post/${post.slug}`} className="text-xs font-black uppercase tracking-widest text-[#D70018] flex items-center gap-1 hover:gap-2 transition-all">
                                                    Xem chi tiết <ChevronRight size={12} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-gray-50 rounded-2xl">
                                    <p className="text-gray-500 font-medium">Chưa có bài viết nào trong mục này.</p>
                                </div>
                            )}
                        </div>
                    ) : error || !page ? (
                        // Error State (Page)
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nội dung đang cập nhật</h2>
                            <p className="text-gray-500">Chính sách này chưa có nội dung. Vui lòng quay lại sau.</p>
                        </div>
                    ) : (
                        // Single Page View
                        <>
                            <div className="flex items-center gap-5 mb-10 border-b border-gray-100 pb-8">
                                <div className="p-5 bg-red-50 text-[#D70018] rounded-2xl shadow-inner">
                                    <Icon size={40} />
                                </div>
                                <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">{page.title}</h1>
                            </div>
                            <div
                                className="prose prose-red max-w-none text-gray-600 font-medium leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: page.content }}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
