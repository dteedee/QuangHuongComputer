import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, ChevronRight, Zap, FileText, Loader2, PackageSearch, MessageSquareWarning } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import { ROUTES } from '../routes/route-paths';
import SEO from '../components/SEO';
import { SafeHtml } from '../components/ui/safe-html';
import { PolicyMatrixTable } from '../components/policy/policy-matrix-table';

// D11 §2: canonical URL prefix is `/chinh-sach/:type` (Vietnamese slugs); `type` here IS the
// content slug directly (no extra mapping layer needed — `slugMapping` used to translate short
// English keys used by legacy `/policy/:type` links, kept only as a fallback for those redirects).
const iconMapping: Record<string, any> = {
    'bao-hanh': ShieldCheck,
    'doi-tra': RotateCcw,
    'van-chuyen': Truck,
    'huong-dan-thanh-toan': CreditCard,
    'kiem-hang': PackageSearch,
    'khieu-nai': MessageSquareWarning,
    'tin-tuc': FileText,
    'khuyen-mai': Zap,
};

const slugMapping: Record<string, string> = {
    'warranty': 'bao-hanh',
    'return': 'doi-tra',
    'shipping': 'van-chuyen',
    'payment': 'huong-dan-thanh-toan',
    'news': 'tin-tuc',
    'promotions': 'khuyen-mai',
};

const titleMapping: Record<string, string> = {
    'bao-hanh': 'Chính sách bảo hành',
    'doi-tra': 'Chính sách đổi trả',
    'van-chuyen': 'Chính sách vận chuyển',
    'huong-dan-thanh-toan': 'Hướng dẫn thanh toán',
    'kiem-hang': 'Chính sách kiểm hàng',
    'khieu-nai': 'Khiếu nại & giải quyết tranh chấp',
    'tin-tuc': 'Tin tức & Blog',
    'khuyen-mai': 'Khuyến mãi',
};

// `tin-tuc` / `khuyen-mai` are post lists with their own pages now (`/tin-tuc`, `/khuyen-mai`);
// `/chinh-sach/{tin-tuc,khuyen-mai,news,promotions}` are redirects in storefront-service.routes.ts.
const listLinks: Record<string, string> = {
    'tin-tuc': ROUTES.NEWS,
    'khuyen-mai': ROUTES.PROMOTIONS,
};

export const PolicyPage = () => {
    const { type: rawType } = useParams<{ type: string }>();
    // Old English keys (`/policy/warranty`) still reach this page one redirect hop away — accept
    // both so a stale bookmark or an un-migrated call site never 404s.
    const currentType = slugMapping[rawType || ''] || rawType || 'bao-hanh';

    // Page Logic
    const dbSlug = currentType;
    const Icon = iconMapping[currentType] || ShieldCheck;

    const { data: page, isLoading: pageLoading, error: pageError } = useQuery({
        queryKey: ['public-page', dbSlug],
        queryFn: () => contentApi.getPage(dbSlug),
        retry: false
    });

    const isLoading = pageLoading;
    const error = pageError;

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <SEO
                title={titleMapping[currentType] || 'Chính sách'}
                description={page?.summary || `Thông tin chi tiết về ${titleMapping[currentType]} tại Quang Hưởng Computer.`}
            />
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Chính sách & Tin tức</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8 font-sans">
                {/* Sidebar */}
                <div className="w-full lg:w-1/4">
                    <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100 sticky top-4">
                        <div className="bg-accent text-white p-6 font-black uppercase text-xs italic tracking-widest">Danh mục</div>
                        <div className="flex flex-col">
                            {Object.entries(titleMapping).map(([key, label]) => {
                                const ItemIcon = iconMapping[key] || ShieldCheck;
                                return (
                                    <Link
                                        key={key}
                                        to={listLinks[key] ?? `/chinh-sach/${key}`}
                                        className={`p-5 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 hover:text-accent transition-all ${key === currentType ? 'text-accent font-black bg-red-50' : 'text-gray-500 font-bold'}`}
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
                            <Loader2 size={40} className="animate-spin text-accent mb-4" />
                            <p className="uppercase font-bold text-xs tracking-widest">Đang tải nội dung...</p>
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
                                <div className="p-5 bg-red-50 text-accent rounded-2xl shadow-inner">
                                    <Icon size={40} />
                                </div>
                                <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">{page.title}</h1>
                            </div>
                            {/* Sanitized via SafeHtml (DOMPurify); never bare dangerouslySetInnerHTML (stored-XSS finding). */}
                            <SafeHtml
                                html={page.content}
                                className="prose prose-red max-w-none text-gray-600 font-medium leading-relaxed"
                            />
                            {/* D08: ma trận chính sách theo ngành hàng, lấy trực tiếp từ endpoint
                                công khai (không qua CMS) — luôn khớp với dữ liệu vận hành thật. */}
                            {(currentType === 'bao-hanh' || currentType === 'doi-tra') && (
                                <PolicyMatrixTable kind={currentType === 'bao-hanh' ? 'warranty' : 'return'} />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
