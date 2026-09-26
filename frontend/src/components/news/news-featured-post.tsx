/**
 * The newest post, shown large above the grid on page 1 of `/tin-tuc` (all categories).
 * Stacks on mobile, image left / text right from `md`.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Badge, Img } from '../ui';
import type { Post } from '../../api/content/types';
import { formatPostDate, postExcerpt } from './news-listing-helpers';

export interface NewsFeaturedPostProps {
    post: Post;
    to: string;
}

export const NewsFeaturedPost = ({ post, to }: NewsFeaturedPostProps) => {
    const date = formatPostDate(post.publishedAt);
    return (
        <Link
            to={to}
            className="group grid overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition duration-220 ease-out hover:border-line-strong hover:shadow-md md:grid-cols-[3fr_2fr]"
        >
            <Img src={post.thumbnailUrl} alt="" ratio="16/9" fit="cover" priority />
            <div className="flex flex-col gap-3 p-5 lg:p-7">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="brand">Bài mới nhất</Badge>
                    {post.category && <Badge>{post.category}</Badge>}
                </div>
                <h2 className="font-display text-xl font-bold leading-tight tracking-tight text-fg transition-colors duration-140 group-hover:text-brand-text lg:text-2xl">
                    {post.title}
                </h2>
                <p className="line-clamp-4 text-sm leading-6 text-fg-muted lg:text-base">{postExcerpt(post, 240)}</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm">
                    {date ? (
                        <span className="flex items-center gap-1.5 text-fg-subtle">
                            <CalendarDays size={15} aria-hidden />
                            <time className="num" dateTime={post.publishedAt}>
                                {date}
                            </time>
                        </span>
                    ) : (
                        <span />
                    )}
                    <span className="flex items-center gap-1 font-semibold text-brand-text">
                        Đọc tiếp <ArrowRight size={16} aria-hidden className="transition-transform duration-220 group-hover:translate-x-0.5" />
                    </span>
                </div>
            </div>
        </Link>
    );
};

export default NewsFeaturedPost;
