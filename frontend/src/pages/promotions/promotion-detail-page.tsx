/**
 * `/khuyen-mai/:slug` — one campaign post (`Post.Type = Promotion`): banner, title, publish
 * date and the body the owner wrote (description + conditions), sanitised through `SafeHtml`.
 * Sidebar: the running flash sale and coupon codes, so the customer can act without leaving.
 *
 * A campaign post has no machine-readable product list (the Content module does not link posts
 * to products), so products are only linked when the owner puts links in the body.
 * A non-promotion post reached at this URL is sent to its canonical `/tin-tuc/:slug`.
 */
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, SearchX } from 'lucide-react';
import SEO from '../../components/SEO';
import { Breadcrumb, EmptyState, Img, SafeHtml, Skeleton, SkeletonText, buttonVariants } from '../../components/ui';
import { contentPublicApi } from '../../api/content/public';
import { queryKeys } from '../../lib/query-keys';
import { buildPath, ROUTES } from '../../routes/route-paths';
import { formatPostDate, postExcerpt } from '../../components/news/news-listing-helpers';
import { FlashSaleTeaser } from '../../components/promotions/flash-sale-teaser';
import { RunningCodesSection } from '../../components/promotions/running-codes-section';

export const PromotionDetailPage = () => {
    const { slug = '' } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const postQuery = useQuery({
        queryKey: queryKeys.content.detail(`post:${slug}`),
        queryFn: () => contentPublicApi.getPost(slug),
        enabled: !!slug,
        retry: false,
    });
    const post = postQuery.data;

    if (post && post.type !== 'Promotion') return <Navigate to={buildPath(ROUTES.NEWS_DETAIL, post.slug)} replace />;

    const crumbs = [
        { label: 'Trang chủ', to: ROUTES.HOME },
        { label: 'Khuyến mãi', to: ROUTES.PROMOTIONS },
        { label: post?.title ?? 'Chi tiết' },
    ];
    const date = formatPostDate(post?.publishedAt);

    return (
        <div className="min-h-screen bg-bg pb-16">
            {post && <SEO title={post.title} description={postExcerpt(post)} />}

            <div className="mx-auto w-full max-w-shell px-4 pt-4">
                <Breadcrumb items={crumbs} />

                {postQuery.isError ? (
                    <EmptyState
                        className="mt-6"
                        icon={SearchX}
                        title="Không tìm thấy chương trình khuyến mãi"
                        description="Chương trình này đã kết thúc hoặc đường dẫn không đúng."
                        action={{ label: 'Xem khuyến mãi đang chạy', onClick: () => navigate(ROUTES.PROMOTIONS) }}
                    />
                ) : (
                    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px]">
                        <article className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
                            {post ? (
                                <>
                                    <Img src={post.thumbnailUrl} alt="" ratio="16/9" fit="cover" priority />
                                    <div className="p-5 lg:p-7">
                                        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-fg lg:text-3xl">
                                            {post.title}
                                        </h1>
                                        {date && (
                                            <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-subtle">
                                                <CalendarDays size={15} aria-hidden />
                                                Đăng ngày <time className="num" dateTime={post.publishedAt}>{date}</time>
                                            </p>
                                        )}
                                        <SafeHtml html={post.content} className="prose mt-6 max-w-none text-fg" />
                                    </div>
                                </>
                            ) : (
                                <div role="status" aria-busy="true">
                                    <span className="sr-only">Đang tải chương trình…</span>
                                    <Skeleton rounded="rounded-none" className="aspect-video w-full" />
                                    <div className="space-y-4 p-5 lg:p-7">
                                        <Skeleton className="h-8 w-3/4" />
                                        <SkeletonText lines={6} />
                                    </div>
                                </div>
                            )}
                        </article>

                        <aside className="space-y-6">
                            <FlashSaleTeaser />
                            <RunningCodesSection layout="stack" />
                            <div className="rounded-2xl border border-line bg-surface p-5">
                                <p className="text-sm text-fg-muted">Ưu đãi được áp dụng tự động hoặc bằng mã khi thanh toán.</p>
                                <Link to={ROUTES.PRODUCTS} className={`${buttonVariants({ variant: 'primary', block: true })} mt-3`}>
                                    Mua sắm ngay
                                </Link>
                            </div>
                        </aside>
                    </div>
                )}

                <Link
                    to={ROUTES.PROMOTIONS}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
                >
                    <ArrowLeft size={16} aria-hidden /> Tất cả khuyến mãi
                </Link>
            </div>
        </div>
    );
};

export default PromotionDetailPage;
