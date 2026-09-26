/**
 * Pure helpers for `/tin-tuc` (kept out of the .tsx files so they are unit-testable and
 * Fast Refresh stays granular).
 *
 * `GET /api/content/posts` returns every published post, newest first, with no paging and
 * no "exclude type" filter. Posts of type `Promotion` have their own canonical URL
 * (`/khuyen-mai/:slug`), so the news page drops them here; categories are the free-text
 * `Post.category` values the editors actually used, never a hard-coded list.
 */
import type { Post } from '../../api/content/types';

export const NEWS_PAGE_SIZE = 9;
/** Tab value for "Tất cả" — never sent to the URL (no `?category=` means all). */
export const ALL_CATEGORIES = '__all__';

/** A post belongs on `/tin-tuc` unless it is a promotion (which lives on `/khuyen-mai`). */
export function isNewsPost(post: Pick<Post, 'type'>): boolean {
    return post.type !== 'Promotion';
}

/** Distinct, non-empty categories in first-seen order (the API already sorts newest first). */
export function newsCategories(posts: Pick<Post, 'category'>[]): string[] {
    const seen = new Set<string>();
    for (const post of posts) {
        const category = post.category?.trim();
        if (category) seen.add(category);
    }
    return [...seen];
}

export function filterByCategory<T extends Pick<Post, 'category'>>(posts: T[], category: string): T[] {
    if (!category || category === ALL_CATEGORIES) return posts;
    return posts.filter((post) => post.category?.trim() === category);
}

/** Clamps `page` into range so a stale `?page=9` never renders an empty grid. */
export function paginate<T>(items: T[], page: number, pageSize = NEWS_PAGE_SIZE) {
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
    const start = (current - 1) * pageSize;
    return { page: current, pageCount, items: items.slice(start, start + pageSize) };
}

/** Summary if the editor wrote one, otherwise the first ~160 chars of the body as plain text. */
export function postExcerpt(post: Pick<Post, 'summary' | 'content'>, max = 160): string {
    const source = post.summary?.trim() || (post.content ?? '').replace(/<[^>]*>/g, ' ');
    const text = source.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
});

/** `dd/mm/yyyy` in shop time, or null when the post has no publish date. */
export function formatPostDate(iso?: string | null): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}
