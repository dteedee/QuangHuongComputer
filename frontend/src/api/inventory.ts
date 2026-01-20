import client from './client';

export interface QueryParams {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortDescending?: boolean;
    includeInactive?: boolean;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface InventoryItem {
    id: string;
    productId: string;
    productName?: string;
    quantity: number;
    sku: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSupplierDto {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address?: string;
}

export interface UpdateSupplierDto {
    name?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName?: string;
    status: string;
    totalAmount: number;
    orderDate: string;
    items: any[];
}

export const inventoryApi = {
    getInventory: async () => {
        const response = await client.get<InventoryItem[]>('/inventory/stock');
        return response.data;
    },

    // Supplier API methods
    getSuppliers: async (params?: QueryParams): Promise<PagedResult<Supplier>> => {
        const response = await client.get<PagedResult<Supplier>>('/inventory/suppliers', { params });
        return response.data;
    },

    getSupplier: async (id: string): Promise<Supplier> => {
        const response = await client.get<Supplier>(`/inventory/suppliers/${id}`);
        return response.data;
    },

    createSupplier: async (data: CreateSupplierDto): Promise<Supplier> => {
        const response = await client.post<Supplier>('/inventory/suppliers', data);
        return response.data;
    },

    updateSupplier: async (id: string, data: UpdateSupplierDto): Promise<Supplier> => {
        const response = await client.put<Supplier>(`/inventory/suppliers/${id}`, data);
        return response.data;
    },

    deleteSupplier: async (id: string): Promise<void> => {
        await client.delete(`/inventory/suppliers/${id}`);
    },

    toggleSupplierActive: async (id: string): Promise<Supplier> => {
        const response = await client.put<Supplier>(`/inventory/suppliers/${id}/toggle-active`);
        return response.data;
    },

    // Purchase Order methods
    getPurchaseOrders: async () => {
        const response = await client.get<PurchaseOrder[]>('/inventory/po');
        return response.data;
    },
    createPurchaseOrder: async (data: any) => {
        const response = await client.post('/inventory/po', data);
        return response.data;
    },
    submitPurchaseOrder: async (id: string) => {
        const response = await client.put(`/inventory/po/${id}/submit`);
        return response.data;
    },
    receivePurchaseOrder: async (id: string) => {
        const response = await client.post(`/inventory/po/${id}/receive`);
        return response.data;
    },
    adjustStock: async (id: string, amount: number, reason: string) => {
        const response = await client.put(`/inventory/stock/${id}/adjust`, null, { params: { amount, reason } });
        return response.data;
    }
};
