/**
 * Result area of `/tin-tuc` once posts have loaded: featured post (page 1 of "Tất cả" only),
 * then a paginated grid. Paging is client-side because `GET /api/content/posts` has no paging —
 * the shop publishes a handful of posts a month, so the whole list is one small response.
 */
import { Pagination } from '../ui';
import type { Post } from '../../api/content/types';
import { buildPath, ROUTES } from '../../routes/route-paths';
import { NewsFeaturedPost } from './news-featured-post';
import { NewsPostCard } from './news-post-card';
import { NEWS_PAGE_SIZE, paginate } from './news-listing-helpers';

export interface NewsListingResultsProps {
    /** Already filtered to the active category. */
    posts: Post[];
    page: number;
    showFeatured: boolean;
    onPageChange: (page: number) => void;
}

export const NewsListingResults = ({ posts, page, showFeatured, onPageChange }: NewsListingResultsProps) => {
    const [featured, ...rest] = posts;
    const withFeatured = showFeatured && page <= 1 && !!featured;
    // The featured post sits OUTSIDE the paged set so page 2 never repeats it.
    const pool = showFeatured ? rest : posts;
    const current = paginate(pool, page, NEWS_PAGE_SIZE);

    return (
        <div className="space-y-6">
            {withFeatured && <NewsFeaturedPost post={featured} to={buildPath(ROUTES.NEWS_DETAIL, featured.slug)} />}

            {current.items.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {current.items.map((post) => (
                        <NewsPostCard
                            key={post.id}
                            post={post}
                            to={buildPath(ROUTES.NEWS_DETAIL, post.slug)}
                            label={post.category}
                        />
                    ))}
                </div>
            )}

            {pool.length > NEWS_PAGE_SIZE && (
                <Pagination page={current.page} pageSize={NEWS_PAGE_SIZE} total={pool.length} onPageChange={onPageChange} />
            )}
        </div>
    );
};

export default NewsListingResults;
