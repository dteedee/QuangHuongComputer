/**
 * One post tile — used by `/tin-tuc` and `/khuyen-mai`. Image 16:9 (cover — editorial photos,
 * not product shots), optional category chip, title (2 lines), excerpt (3 lines), date.
 * The whole card is the link; `to` is passed in so each page owns its own URL scheme.
 */
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Badge, Img } from '../ui';
import type { Post } from '../../api/content/types';
import { formatPostDate, postExcerpt } from './news-listing-helpers';

export interface NewsPostCardProps {
    post: Post;
    to: string;
    /** Chip on the image — the category for news, "Khuyến mãi" for promotions. */
    label?: string | null;
}

export const NewsPostCard = ({ post, to, label }: NewsPostCardProps) => {
    const date = formatPostDate(post.publishedAt);
    return (
        <Link
            to={to}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition duration-220 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md motion-reduce:transform-none"
        >
            <div className="relative">
                <Img src={post.thumbnailUrl} alt="" ratio="16/9" fit="cover" wrapperClassName="rounded-t-2xl" />
                {label && (
                    <Badge variant="ink" className="absolute left-3 top-3">
                        {label}
                    </Badge>
                )}
            </div>
            <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-fg transition-colors duration-140 group-hover:text-brand-text">
                    {post.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-5 text-fg-muted">{postExcerpt(post)}</p>
                {date && (
                    <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-fg-subtle">
                        <CalendarDays size={14} aria-hidden />
                        <time className="num" dateTime={post.publishedAt}>
                            {date}
                        </time>
                    </p>
                )}
            </div>
        </Link>
    );
};

export default NewsPostCard;
