import client from './client';

export interface InventoryItem {
    id: string;
    productId: string;
    productName?: string;
    quantityOnHand: number;
    reorderLevel: number;
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
}

export const inventoryApi = {
    getInventory: async () => {
        const response = await client.get<InventoryItem[]>('/inventory');
        return response.data;
    },
    getSuppliers: async () => {
        const response = await client.get<Supplier[]>('/inventory/suppliers');
        return response.data;
    },
    getPurchaseOrders: async () => {
        const response = await client.get<PurchaseOrder[]>('/inventory/purchase-orders');
        return response.data;
    },
    createPurchaseOrder: async (data: any) => {
        const response = await client.post('/inventory/purchase-orders', data);
        return response.data;
    }
};
