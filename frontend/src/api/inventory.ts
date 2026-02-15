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

// ============================================
// SUPPLIER ENUMS
// ============================================
export type SupplierType =
    | 'Manufacturer'    // Nhà sản xuất
    | 'Distributor'     // Nhà phân phối
    | 'Wholesaler'      // Nhà bán buôn
    | 'Agent'           // Đại lý
    | 'Retailer'        // Nhà bán lẻ
    | 'Importer';       // Nhà nhập khẩu

export type PaymentTermType =
    | 'COD'             // Thanh toán khi giao hàng
    | 'NET7'            // Công nợ 7 ngày
    | 'NET15'           // Công nợ 15 ngày
    | 'NET30'           // Công nợ 30 ngày
    | 'NET45'           // Công nợ 45 ngày
    | 'NET60'           // Công nợ 60 ngày
    | 'Prepaid'         // Thanh toán trước
    | 'Custom';         // Tùy chỉnh

// ============================================
// SUPPLIER INTERFACES
// ============================================
export interface Supplier {
    id: string;
    code: string;
    name: string;
    shortName?: string;
    supplierType: SupplierType;
    supplierTypeDisplay: string;
    description?: string;
    website?: string;
    logoUrl?: string;

    // Business info
    taxCode?: string;
    bankAccount?: string;
    bankName?: string;
    bankBranch?: string;
    paymentTerms: PaymentTermType;
    paymentTermsDisplay: string;
    paymentDays?: number;
    creditLimit: number;
    currentDebt: number;
    availableCredit: number;

    // Contact
    contactPerson: string;
    contactTitle?: string;
    email: string;
    phone: string;
    fax?: string;

    // Address
    address: string;
    ward?: string;
    district?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    fullAddress: string;

    // Notes
    rating: number;
    notes?: string;
    categories?: string;
    brands?: string;

    // Statistics
    totalOrders: number;
    totalPurchaseAmount: number;
    lastOrderDate?: string;
    firstOrderDate?: string;

    // Status
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface SupplierListItem {
    id: string;
    code: string;
    name: string;
    shortName?: string;
    supplierType: SupplierType;
    supplierTypeDisplay: string;
    contactPerson: string;
    phone: string;
    email: string;
    city?: string;
    paymentTerms: PaymentTermType;
    paymentTermsDisplay: string;
    creditLimit: number;
    currentDebt: number;
    rating: number;
    totalOrders: number;
    totalPurchaseAmount: number;
    isActive: boolean;
    createdAt: string;
}

export interface CreateSupplierDto {
    // Basic info
    name: string;
    shortName?: string;
    supplierType: SupplierType;
    description?: string;
    website?: string;
    logoUrl?: string;

    // Business info
    taxCode?: string;
    bankAccount?: string;
    bankName?: string;
    bankBranch?: string;
    paymentTerms: PaymentTermType;
    paymentDays?: number;
    creditLimit: number;

    // Contact
    contactPerson: string;
    contactTitle?: string;
    email: string;
    phone: string;
    fax?: string;

    // Address
    address: string;
    ward?: string;
    district?: string;
    city?: string;
    country?: string;
    postalCode?: string;

    // Notes
    rating: number;
    notes?: string;
    categories?: string;
    brands?: string;
}

export interface UpdateSupplierDto extends CreateSupplierDto {}

export interface SupplierStatistics {
    totalSuppliers: number;
    activeSuppliers: number;
    inactiveSuppliers: number;
    totalDebt: number;
    totalCreditLimit: number;
    suppliersWithDebt: number;
    suppliersOverCreditLimit: number;
    byType: Record<string, number>;
    byPaymentTerms: Record<string, number>;
}

export interface SupplierEnums {
    supplierTypes: { value: string; label: string }[];
    paymentTerms: { value: string; label: string }[];
}

export interface SupplierDropdownItem {
    id: string;
    code: string;
    name: string;
    shortName?: string;
}

// ============================================
// PURCHASE ORDER
// ============================================
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

// ============================================
// INVENTORY API
// ============================================
export const inventoryApi = {
    getInventory: async () => {
        const response = await client.get<InventoryItem[]>('/inventory/stock');
        return response.data;
    },

    // ========================================
    // SUPPLIER API
    // ========================================

    // Get paginated list of suppliers
    getSuppliers: async (params?: QueryParams): Promise<PagedResult<SupplierListItem>> => {
        const response = await client.get<PagedResult<SupplierListItem>>('/inventory/suppliers', { params });
        return response.data;
    },

    // Get supplier by ID
    getSupplier: async (id: string): Promise<Supplier> => {
        const response = await client.get<Supplier>(`/inventory/suppliers/${id}`);
        return response.data;
    },

    // Get supplier dropdown list
    getSuppliersDropdown: async (activeOnly: boolean = true): Promise<SupplierDropdownItem[]> => {
        const response = await client.get<SupplierDropdownItem[]>('/inventory/suppliers/dropdown', {
            params: { activeOnly }
        });
        return response.data;
    },

    // Get supplier statistics
    getSupplierStatistics: async (): Promise<SupplierStatistics> => {
        const response = await client.get<SupplierStatistics>('/inventory/suppliers/statistics');
        return response.data;
    },

    // Get supplier enums for dropdowns
    getSupplierEnums: async (): Promise<SupplierEnums> => {
        const response = await client.get<SupplierEnums>('/inventory/suppliers/enums');
        return response.data;
    },

    // Generate new supplier code
    generateSupplierCode: async (): Promise<{ code: string }> => {
        const response = await client.get<{ code: string }>('/inventory/suppliers/generate-code');
        return response.data;
    },

    // Create supplier
    createSupplier: async (data: CreateSupplierDto): Promise<Supplier> => {
        const response = await client.post<Supplier>('/inventory/suppliers', data);
        return response.data;
    },

    // Update supplier
    updateSupplier: async (id: string, data: UpdateSupplierDto): Promise<Supplier> => {
        const response = await client.put<Supplier>(`/inventory/suppliers/${id}`, data);
        return response.data;
    },

    // Delete supplier (soft delete)
    deleteSupplier: async (id: string): Promise<void> => {
        await client.delete(`/inventory/suppliers/${id}`);
    },

    // Toggle supplier active status
    toggleSupplierActive: async (id: string): Promise<Supplier> => {
        const response = await client.put<Supplier>(`/inventory/suppliers/${id}/toggle-active`);
        return response.data;
    },

    // ========================================
    // PURCHASE ORDER API
    // ========================================
    getPurchaseOrders: async () => {
        const response = await client.get<any[]>('/inventory/po');
        return response.data;
    },
    createPurchaseOrder: async (data: any) => {
        const response = await client.post('/inventory/po', data);
        return response.data;
    },
    submitPurchaseOrder: async (_id: string) => {
        throw new Error('Submit purchase order endpoint not implemented in backend');
    },
    receivePurchaseOrder: async (id: string) => {
        const response = await client.put(`/inventory/po/${id}/receive`);
        return response.data;
    },
    adjustStock: async (id: string, amount: number, reason: string) => {
        const response = await client.put(`/inventory/stock/${id}/adjust`, null, { params: { amount, reason } });
        return response.data;
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export const supplierTypeLabels: Record<SupplierType, string> = {
    Manufacturer: 'Nhà sản xuất',
    Distributor: 'Nhà phân phối',
    Wholesaler: 'Nhà bán buôn',
    Agent: 'Đại lý',
    Retailer: 'Nhà bán lẻ',
    Importer: 'Nhà nhập khẩu'
};

export const paymentTermLabels: Record<PaymentTermType, string> = {
    COD: 'Thanh toán khi giao hàng',
    NET7: 'Công nợ 7 ngày',
    NET15: 'Công nợ 15 ngày',
    NET30: 'Công nợ 30 ngày',
    NET45: 'Công nợ 45 ngày',
    NET60: 'Công nợ 60 ngày',
    Prepaid: 'Thanh toán trước',
    Custom: 'Tùy chỉnh'
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};
