import { client } from './client';

/**
 * Omnichannel API
 * Phase 4.1 - Shopee, Lazada, TikTok Sync
 */

// ============================================
// TYPES
// ============================================

export interface ChannelConnection {
    id: string;
    platformName: string;
    shopId: string;
    shopName: string;
    isActive: boolean;
    syncOrders: boolean;
    syncInventory: boolean;
    syncProducts: boolean;
    tokenExpiresAt: string;
    createdAt: string;
}

export interface CreateConnectionReq {
    platformName: string;
    shopId: string;
    shopName: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: string;
}

export interface UpdateSyncSettingsReq {
    syncOrders: boolean;
    syncInventory: boolean;
    syncProducts: boolean;
}

export interface MappingStatus {
    totalMappedProducts: number;
    failedSyncProducts: number;
}

export interface OrderSyncStatus {
    totalChannelOrders: number;
    pendingProcessing: number;
}

// ============================================
// API
// ============================================

export const omnichannelApi = {
    /** Lấy danh sách kết nối gian hàng */
    getConnections: async (): Promise<ChannelConnection[]> => {
        const response = await client.get<ChannelConnection[]>('/omnichannel/connections');
        return response.data;
    },

    /** Tạo kết nối mới (Manual OAuth for now) */
    createConnection: async (data: CreateConnectionReq): Promise<ChannelConnection> => {
        const response = await client.post<ChannelConnection>('/omnichannel/connections', data);
        return response.data;
    },

    /** Cập nhật setting đồng bộ */
    updateSyncSettings: async (id: string, data: UpdateSyncSettingsReq): Promise<ChannelConnection> => {
        const response = await client.put<ChannelConnection>(`/omnichannel/connections/${id}/sync-settings`, data);
        return response.data;
    },

    /** Kích hoạt đồng bộ thủ công */
    triggerSync: async (id: string, type: 'inventory' | 'orders' | 'products'): Promise<{ message: string }> => {
        const response = await client.post<{ message: string }>(`/omnichannel/connections/${id}/sync-now?type=${type}`);
        return response.data;
    },

    /** Thống kê products mapping */
    getMappingStatus: async (): Promise<MappingStatus> => {
        const response = await client.get<MappingStatus>('/omnichannel/products/mapping-status');
        return response.data;
    },

    /** Thống kê orders sync */
    getOrderSyncStatus: async (): Promise<OrderSyncStatus> => {
        const response = await client.get<OrderSyncStatus>('/omnichannel/orders/sync-status');
        return response.data;
    }
};
