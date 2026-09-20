/**
 * Chuẩn hoá payload menu cho Quản lý menu (tách khỏi `MenuManager.tsx` để file trang
 * nằm dưới ngưỡng 200 dòng — xem quy tắc modularization của dự án).
 */
import type { MenuItem } from '../../api/content';

// ── Chuẩn hoá payload menu (W0 gate) ──────────────────────────────
// Hai backend đang chạy trả hai hình dạng khác nhau cho `GET /content/menus?location=`:
//   :5000 (binary cũ) → PascalCase: { Id, Location: 0, Items: [{ Id, Label, DisplayOrder, ... }] }
//   :5050 (binary mới) → camelCase: { id, location: "HeaderMain", items: [{ id, label, displayOrder, ... }] }
// Trước đây code spread trực tiếp `[...selectedMenu.items]` ⇒ với PascalCase thì `items` là
// undefined và cả trang sập vào error boundary ("selectedMenu.items is not iterable").
// Các helper dưới đây chấp nhận cả hai hình dạng, cả `null`/thiếu trường, và không bao giờ throw.
type RawRecord = Record<string, unknown>;

export const asRecord = (value: unknown): RawRecord | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null;

/** Lấy giá trị đầu tiên không undefined/null theo danh sách tên trường (camelCase hoặc PascalCase). */
const pickField = (source: RawRecord, ...keys: string[]): unknown => {
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null) return value;
    }
    return undefined;
};

const pickString = (source: RawRecord, ...keys: string[]): string => {
    const value = pickField(source, ...keys);
    return typeof value === 'string' ? value : value === undefined ? '' : String(value);
};

const pickNumber = (source: RawRecord, fallback: number, ...keys: string[]): number => {
    const value = pickField(source, ...keys);
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/** `id` của menu đang chọn, bất kể hình dạng. Rỗng nghĩa là không thao tác được. */
export const menuIdOf = (menu: unknown): string => {
    const record = asRecord(menu);
    return record ? pickString(record, 'id', 'Id') : '';
};

/** Nhãn vị trí menu; backend cũ trả enum dạng số nên mới cần fallback về key đang chọn. */
export const menuLocationLabel = (menu: unknown, fallback: string): string => {
    const record = asRecord(menu);
    if (!record) return fallback;
    const raw = pickField(record, 'location', 'Location');
    return typeof raw === 'string' && raw.trim() !== '' ? raw : fallback;
};

/** Một item menu đã chuẩn hoá; `null` nếu payload không dùng được (thiếu id). */
export const normalizeMenuItem = (rawItem: unknown, menuId: string, fallbackOrder: number): MenuItem | null => {
    const item = asRecord(rawItem);
    if (!item) return null;
    const id = pickString(item, 'id', 'Id');
    if (!id) return null;
    return {
        id,
        label: pickString(item, 'label', 'Label'),
        url: pickString(item, 'url', 'Url'),
        icon: pickString(item, 'icon', 'Icon') || undefined,
        parentId: pickString(item, 'parentId', 'ParentId') || undefined,
        order: pickNumber(item, fallbackOrder, 'order', 'Order', 'displayOrder', 'DisplayOrder'),
        openInNewTab: pickField(item, 'openInNewTab', 'OpenInNewTab') === true,
        cssClass: pickString(item, 'cssClass', 'CssClass') || undefined,
        pageId: pickString(item, 'pageId', 'PageId') || undefined,
        categoryId: pickString(item, 'categoryId', 'CategoryId') || undefined,
        menuId: pickString(item, 'menuId', 'MenuId') || menuId,
    };
};

/** Danh sách item đã chuẩn hoá + sắp theo thứ tự; luôn trả về array (có thể rỗng). */
export const normalizeMenuItems = (menu: unknown): MenuItem[] => {
    const record = asRecord(menu);
    if (!record) return [];
    const rawItems = pickField(record, 'items', 'Items');
    if (!Array.isArray(rawItems)) return [];
    const menuId = pickString(record, 'id', 'Id');
    return rawItems
        .map((rawItem, index) => normalizeMenuItem(rawItem, menuId, index + 1))
        .filter((item): item is MenuItem => item !== null)
        .sort((a, b) => a.order - b.order);
};

export type MenuLocationKey = 'HeaderMain' | 'FooterMain' | 'FooterBottom';

/** §9.5: nhãn tiếng Việt cho người dùng; `key` kỹ thuật chỉ hiện nhỏ bên dưới. */
export const MENU_LOCATIONS: { key: MenuLocationKey; label: string; description: string }[] = [
    { key: 'HeaderMain', label: 'Menu chính', description: 'Thanh điều hướng đầu trang' },
    { key: 'FooterMain', label: 'Chân trang — danh mục', description: 'Danh mục sản phẩm ở chân trang' },
    { key: 'FooterBottom', label: 'Chân trang — chính sách', description: 'Chính sách & liên kết cuối trang' },
];
