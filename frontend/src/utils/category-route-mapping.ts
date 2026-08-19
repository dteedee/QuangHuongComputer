/** Normalize a Vietnamese string for loose category-name comparison. */
export function normalizeCategoryString(str: string): string {
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Manual route-slug → display-title mapping for better UX titles on the category page. */
export const ROUTE_TO_CATEGORY_TITLE: Record<string, string> = {
    'laptop': 'Laptop - Máy Tính Xách Tay',
    'pc-gaming': 'Máy Tính Chơi Game',
    'workstation': 'Máy Tính Đồ Họa',
    'screens': 'Màn Hình Máy Tính',
    'components': 'Linh Kiện Máy Tính',
    'gear': 'Phím, Chuột - Gaming Gear',
    'network': 'Thiết Bị Mạng',
    'camera': 'Camera',
    'audio': 'Loa, Mic, Webcam, Stream',
    'accessories': 'Phụ Kiện Máy Tính - Laptop',
};
