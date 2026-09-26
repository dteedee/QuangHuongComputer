import { describe, it, expect } from 'vitest';
import {
    ALL_CATEGORIES,
    filterByCategory,
    formatPostDate,
    isNewsPost,
    newsCategories,
    paginate,
    postExcerpt,
} from './news-listing-helpers';

describe('news-listing-helpers', () => {
    it('bài Promotion không thuộc /tin-tuc (URL chuẩn là /khuyen-mai/:slug)', () => {
        expect(isNewsPost({ type: 'News' })).toBe(true);
        expect(isNewsPost({ type: 'Article' })).toBe(true);
        expect(isNewsPost({ type: 'Promotion' })).toBe(false);
    });

    it('chuyên mục lấy từ dữ liệu thật: bỏ rỗng, bỏ trùng, giữ thứ tự xuất hiện', () => {
        const cats = newsCategories([{ category: 'Hướng dẫn' }, { category: '' }, { category: undefined }, { category: ' Hướng dẫn ' }, { category: 'Công nghệ' }]);
        expect(cats).toEqual(['Hướng dẫn', 'Công nghệ']);
    });

    it('lọc theo chuyên mục; "Tất cả" trả nguyên danh sách', () => {
        const posts = [{ category: 'A' }, { category: 'B' }, { category: 'A' }];
        expect(filterByCategory(posts, 'A')).toHaveLength(2);
        expect(filterByCategory(posts, ALL_CATEGORIES)).toHaveLength(3);
    });

    it('phân trang kẹp số trang ngoài khoảng — ?page=99 không ra lưới trắng', () => {
        const items = Array.from({ length: 20 }, (_, i) => i);
        expect(paginate(items, 1, 9).items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
        expect(paginate(items, 3, 9)).toMatchObject({ page: 3, pageCount: 3, items: [18, 19] });
        expect(paginate(items, 99, 9).page).toBe(3);
        expect(paginate(items, -2, 9).page).toBe(1);
        expect(paginate([], 1, 9)).toMatchObject({ page: 1, pageCount: 1, items: [] });
    });

    it('trích đoạn: ưu tiên summary, không thì bỏ thẻ HTML khỏi nội dung và cắt có dấu …', () => {
        expect(postExcerpt({ summary: 'Tóm tắt', content: '<p>Nội dung</p>' })).toBe('Tóm tắt');
        expect(postExcerpt({ summary: undefined, content: '<p>Xin&nbsp;chào <b>bạn</b></p>' })).toBe('Xin chào bạn');
        const long = postExcerpt({ content: 'a'.repeat(300) }, 20);
        expect(long).toHaveLength(20);
        expect(long.endsWith('…')).toBe(true);
    });

    it('ngày đăng theo giờ Việt Nam; không có ngày -> null', () => {
        // 2026-09-30 18:00 UTC = 01:00 ngày 01/10 giờ Việt Nam.
        expect(formatPostDate('2026-09-30T18:00:00Z')).toBe('01/10/2026');
        expect(formatPostDate(undefined)).toBeNull();
        expect(formatPostDate('không-phải-ngày')).toBeNull();
    });
});
