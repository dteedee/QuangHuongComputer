import client from './client';

/**
 * Store API (SystemConfig service, endpoints from Phase 05 stream B).
 *
 * Chú ý bảo mật: endpoint công khai `GET /api/stores` chỉ trả thông tin cửa hàng
 * (không kèm số tồn kho chi tiết). Tồn kho được trả dưới dạng nhãn định tính
 * (`InStock` | `LowStock` | `OutOfStock`) qua `getStockByProduct`.
 */

export type StockAvailability = 'InStock' | 'LowStock' | 'OutOfStock';

export interface StoreOpeningHours {
    /** Chuẩn hoá key = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'. */
    [day: string]: string; // '09:00-21:00' hoặc 'closed'
}

export interface Store {
    id: string;
    code: string;
    name: string;
    address: string;
    ward?: string;
    district?: string;
    province?: string;
    phone: string;
    email?: string;
    /** JSON string; parse bằng `parseOpeningHours`. */
    openingHoursJson?: string;
    latitude?: number;
    longitude?: number;
    isActive: boolean;
    isPickupPoint: boolean;
    sortOrder: number;
}

export interface StoreWarehouseLink {
    warehouseId: string;
    warehouseName: string;
}

export interface StoreEmployeeLink {
    employeeId: string;
    employeeName: string;
    role?: string;
}

export interface StoreDetail extends Store {
    warehouses: StoreWarehouseLink[];
    employees: StoreEmployeeLink[];
}

export interface StockByStore {
    storeId: string;
    storeName: string;
    availability: StockAvailability;
}

export interface CreateStoreDto {
    code: string;
    name: string;
    address: string;
    ward?: string;
    district?: string;
    province?: string;
    phone: string;
    email?: string;
    openingHoursJson?: string;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
    isPickupPoint?: boolean;
    sortOrder?: number;
    warehouseIds?: string[];
    employeeIds?: string[];
}

export type UpdateStoreDto = CreateStoreDto;

/** Parse `openingHoursJson` an toàn. */
export function parseOpeningHours(json?: string): StoreOpeningHours {
    if (!json) return {};
    try {
        const parsed = JSON.parse(json);
        return parsed && typeof parsed === 'object' ? (parsed as StoreOpeningHours) : {};
    } catch {
        return {};
    }
}

/** Ngày trong tuần → key trong openingHours. */
export const DAY_KEYS: Array<keyof StoreOpeningHours> = [
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
];

export const DAY_LABELS: Record<string, string> = {
    mon: 'Thứ 2',
    tue: 'Thứ 3',
    wed: 'Thứ 4',
    thu: 'Thứ 5',
    fri: 'Thứ 6',
    sat: 'Thứ 7',
    sun: 'Chủ nhật',
};

/** Trả giờ mở cửa hôm nay (theo giờ máy khách). */
export function getTodayHours(json?: string): string | null {
    const hours = parseOpeningHours(json);
    const jsDay = new Date().getDay(); // 0 = CN
    const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const key = map[jsDay];
    return hours[key] || null;
}

export const storeApi = {
    /** PUBLIC — không cần auth. */
    list: async (): Promise<Store[]> => {
        const { data } = await client.get<Store[]>('/stores');
        return Array.isArray(data) ? data : [];
    },

    get: async (id: string): Promise<StoreDetail> => {
        const { data } = await client.get<StoreDetail>(`/stores/${id}`);
        return data;
    },

    create: async (dto: CreateStoreDto): Promise<Store> => {
        const { data } = await client.post<Store>('/stores', dto);
        return data;
    },

    update: async (id: string, dto: UpdateStoreDto): Promise<Store> => {
        const { data } = await client.put<Store>(`/stores/${id}`, dto);
        return data;
    },

    remove: async (id: string): Promise<void> => {
        await client.delete(`/stores/${id}`);
    },

    /** PUBLIC — chỉ trả nhãn InStock/LowStock/OutOfStock, không lộ số. */
    getStockByProduct: async (productId: string): Promise<StockByStore[]> => {
        const { data } = await client.get<StockByStore[]>(`/stores/products/${productId}/stock`);
        return Array.isArray(data) ? data : [];
    },
};

export default storeApi;
