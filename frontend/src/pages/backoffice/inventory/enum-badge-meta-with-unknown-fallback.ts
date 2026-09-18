/**
 * Badge metadata resolver dùng chung cho các trang mua hàng/kho.
 *
 * W0 gate: các trang trước đây tra `META[value].className` trực tiếp. Khi backend
 * trả một giá trị enum không nằm trong map (ví dụ `urgency: "Medium"` trong khi FE
 * chỉ khai Low/Normal/High/Urgent) thì lookup ra `undefined` và cả trang sập vào
 * error boundary. Resolver này luôn trả về một badge hợp lệ: giá trị lạ sẽ hiện
 * badge trung tính kèm nguyên văn giá trị, giúp lộ vấn đề dữ liệu mà không chết trang.
 *
 * Map dùng khoá là chuỗi enum THẬT của backend (xem `Services/Inventory/Domain/*.cs`),
 * kèm một vài alias cũ của FE để dữ liệu lịch sử vẫn hiển thị đúng nhãn.
 */
export interface EnumBadgeMeta {
    label: string;
    className: string;
}

export type EnumBadgeMetaMap = Record<string, EnumBadgeMeta>;

/** Badge cho giá trị enum backend trả về mà FE chưa biết. */
const UNKNOWN_BADGE_CLASS = 'bg-slate-100 text-slate-600 ring-1 ring-slate-300';

export function resolveEnumBadgeMeta(
    map: EnumBadgeMetaMap,
    value: string | null | undefined,
): EnumBadgeMeta {
    if (value) {
        const hit = map[value];
        if (hit) return hit;
        // Giá trị lạ: vẫn hiện nguyên văn để người dùng/nhân viên báo lại được.
        return { label: value, className: UNKNOWN_BADGE_CLASS };
    }
    return { label: '—', className: UNKNOWN_BADGE_CLASS };
}
