import client from './client';

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
    getSuppliers: async () => {
        const response = await client.get<Supplier[]>('/inventory/suppliers');
        return response.data;
    },
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
