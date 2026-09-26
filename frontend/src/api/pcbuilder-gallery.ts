/**
 * "Cấu hình PC mẫu" (/cau-hinh-mau) — gallery do nhân viên tuyển chọn, dựng trên `SavedPcBuild`.
 * Hợp đồng: `docs/api-contracts/pc-builder.md` §gallery. Giá (`liveTotal`) và tương thích
 * (`overallVerdict`) do SERVER tính lại từ giá hiện hành mỗi lần đọc — FE chỉ hiển thị.
 */
import client from './client';
import type { PcVerdict } from './pcbuilder';

export type PcUseCaseTag = 'gaming' | 'van-phong' | 'do-hoa' | 'streaming';

export const PC_USE_CASE_TAGS: ReadonlyArray<{ value: PcUseCaseTag; label: string }> = [
    { value: 'gaming', label: 'Gaming' },
    { value: 'van-phong', label: 'Văn phòng' },
    { value: 'do-hoa', label: 'Đồ họa' },
    { value: 'streaming', label: 'Streaming' },
];

export interface PcGalleryItem {
    productId: string;
    name: string;
    slug: string | null;
    imageUrl: string | null;
    slotId: string;
    /** Tên khay hiển thị (VD "CPU", "Card màn hình") — server tra từ PcBuilderSlotDefinitions. */
    slotLabel: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    /** false = sản phẩm đã gỡ khỏi web; không tính vào `liveTotal`. */
    isAvailable: boolean;
    inStock: boolean;
}

export interface PcGalleryIssue {
    ruleId: string;
    ruleName: string;
    verdict: PcVerdict;
    message: string;
}

export interface PcGalleryBuild {
    id: string;
    buildCode: string;
    title: string;
    useCaseTag: PcUseCaseTag | string;
    useCaseLabel: string;
    isFeatured: boolean;
    isPublic: boolean;
    sortOrder: number;
    liveTotal: number;
    savedTotal: number;
    overallVerdict: PcVerdict;
    isPurchasable: boolean;
    issues: PcGalleryIssue[];
    items: PcGalleryItem[];
}

export interface PcGalleryFilter {
    tag?: string;
    minBudget?: number;
    maxBudget?: number;
}

export interface PromoteGalleryBuildRequest {
    buildCode: string;
    title: string;
    useCaseTag: string;
    sortOrder: number;
    isFeatured: boolean;
    isPublic: boolean;
}

export type UpdateGalleryBuildRequest = Omit<PromoteGalleryBuildRequest, 'buildCode'>;

const BASE = '/catalog/pc-builder';

export const pcBuildGalleryApi = {
    list: async (filter: PcGalleryFilter = {}): Promise<PcGalleryBuild[]> => {
        const { data } = await client.get<PcGalleryBuild[]>(`${BASE}/gallery`, { params: filter });
        return data;
    },
};

/** Quản trị (Catalog.Manage). Bản ghi gallery là BẢN SAO của build đã lưu — build của khách không đổi. */
export const pcBuildGalleryAdminApi = {
    list: async (): Promise<PcGalleryBuild[]> => {
        const { data } = await client.get<PcGalleryBuild[]>(`${BASE}/admin/gallery`);
        return data;
    },
    promote: async (req: PromoteGalleryBuildRequest): Promise<{ id: string; buildCode: string }> => {
        const { data } = await client.post<{ id: string; buildCode: string }>(`${BASE}/admin/gallery`, req);
        return data;
    },
    update: async (id: string, req: UpdateGalleryBuildRequest): Promise<void> => {
        await client.put(`${BASE}/admin/gallery/${id}`, req);
    },
    remove: async (id: string): Promise<void> => {
        await client.delete(`${BASE}/admin/gallery/${id}`);
    },
};

/** Khoảng ngân sách của bộ lọc storefront (VND, đã gồm VAT) — `?budget=` trên URL. */
export const PC_BUDGET_RANGES: ReadonlyArray<{ value: string; label: string; min?: number; max?: number }> = [
    { value: 'duoi-15', label: 'Dưới 15 triệu', max: 15_000_000 },
    { value: '15-25', label: '15–25 triệu', min: 15_000_000, max: 25_000_000 },
    { value: '25-40', label: '25–40 triệu', min: 25_000_000, max: 40_000_000 },
    { value: 'tren-40', label: 'Trên 40 triệu', min: 40_000_000 },
];
