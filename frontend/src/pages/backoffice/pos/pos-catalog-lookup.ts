/**
 * Tra cứu hàng cho quầy: lưới sản phẩm, quét mã vạch/SKU CHÍNH XÁC, và serial còn trong kho.
 *
 * Quét mã vạch phải là tra CHÍNH XÁC, không phải tìm mờ như bản cũ: một mã quét ra 12 kết quả
 * gần đúng thì thu ngân chọn nhầm máy. Thứ tự: `/inventory/barcode/lookup/{code}` (mã vạch thật)
 * → SKU trùng khít trong danh sách catalog → nhiều kết quả thì để màn hình hỏi lại.
 */
import client from '../../../api/client';
import { catalogPublicListingApi, type ListingProduct } from '../../../api/catalog/public-listing';

/** Hàng trong kho (InventoryItem) — chỉ lấy phần màn hình quầy cần. */
interface InventoryItemRow {
    id: string;
    productId: string;
    variantId?: string | null;
    barcode?: string | null;
}

export interface PosSerialRow {
    id: string;
    serial: string;
    productId: string;
    warehouseId?: string;
    status: string;
}

export interface PosLookupResult {
    /** 0 kết quả → báo không tìm thấy; 1 → thêm thẳng; >1 → màn hình hiện danh sách chọn. */
    matches: ListingProduct[];
    /** `true` khi khớp mã vạch chính xác trong kho (không phải khớp tên/SKU). */
    exact: boolean;
}

/** Danh mục nào quản lý theo serial (`Categories.IsSerialTracked`). */
export async function fetchSerialTrackedCategoryIds(): Promise<Set<string>> {
    const res = await client.get<Array<{ id: string; isSerialTracked?: boolean }>>('/catalog/categories');
    return new Set(res.data.filter((c) => c.isSerialTracked).map((c) => c.id));
}

/** Serial còn trong kho của một sản phẩm — dùng khi bán hàng quản lý serial. */
export async function fetchAvailableSerials(productId: string, warehouseId?: string) {
    const res = await client.get<{ items: PosSerialRow[] }>('/inventory/serials', {
        params: { productId, warehouseId, status: 'InStock', page: 1, pageSize: 100 },
    });
    return res.data.items ?? [];
}

/** Lưới hàng của quầy: phân trang server, tìm theo tên/SKU. */
export async function searchPosProducts(params: { search?: string; categoryId?: string; page: number; pageSize: number }) {
    return catalogPublicListingApi.getProducts({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search || undefined,
        categoryId: params.categoryId || undefined,
    });
}

/** Quét mã: mã vạch kho trước, rồi SKU trùng khít, cuối cùng mới tới kết quả gần đúng. */
export async function lookupByCode(code: string): Promise<PosLookupResult> {
    const trimmed = code.trim();
    if (!trimmed) return { matches: [], exact: false };

    try {
        const res = await client.get<InventoryItemRow>(`/inventory/barcode/lookup/${encodeURIComponent(trimmed)}`);
        if (res.data?.productId) {
            const page = await catalogPublicListingApi.getProducts({ page: 1, pageSize: 50, search: trimmed });
            const hit = page.products.find((p) => p.id === res.data.productId);
            if (hit) return { matches: [hit], exact: true };
            const byId = await client.get<ListingProduct>(`/catalog/products/${res.data.productId}`);
            return { matches: [byId.data], exact: true };
        }
    } catch {
        // 404 = mã vạch không có trong kho; rơi xuống tra theo SKU/tên bên dưới.
    }

    const page = await catalogPublicListingApi.getProducts({ page: 1, pageSize: 20, search: trimmed });
    const upper = trimmed.toUpperCase();
    const bySku = page.products.filter((p) => (p.sku ?? '').toUpperCase() === upper);
    if (bySku.length === 1) return { matches: bySku, exact: true };
    if (bySku.length > 1) return { matches: bySku, exact: false };
    return { matches: page.products, exact: false };
}

/** Chi tiết một sản phẩm theo id — dùng khi gọi đơn giữ ra (đơn giữ chỉ lưu productId). */
export async function fetchProductById(productId: string): Promise<ListingProduct | null> {
    try {
        const res = await client.get<ListingProduct>(`/catalog/products/${productId}`);
        return res.data;
    } catch {
        return null;
    }
}
