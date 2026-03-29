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
export type POStatus = 'Draft' | 'Sent' | 'PartialReceived' | 'Received' | 'Cancelled';

export interface PurchaseOrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    status: POStatus;
    totalAmount: number;
    items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderDto {
    supplierId: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
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
    getPurchaseOrders: async (): Promise<PurchaseOrder[]> => {
        const response = await client.get<PurchaseOrder[]>('/inventory/po');
        return response.data;
    },

    createPurchaseOrder: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
        const response = await client.post<PurchaseOrder>('/inventory/po', data);
        return response.data;
    },

    sendPurchaseOrder: async (id: string): Promise<{ message: string }> => {
        const response = await client.put<{ message: string }>(`/inventory/po/${id}/send`);
        return response.data;
    },

    cancelPurchaseOrder: async (id: string): Promise<{ message: string }> => {
        const response = await client.put<{ message: string }>(`/inventory/po/${id}/cancel`);
        return response.data;
    },

    receivePurchaseOrder: async (id: string): Promise<{ message: string }> => {
        const response = await client.put<{ message: string }>(`/inventory/po/${id}/receive`);
        return response.data;
    },

    adjustStock: async (id: string, amount: number, reason: string) => {
        const response = await client.put(`/inventory/stock/${id}/adjust`, null, { params: { amount, reason } });
        return response.data;
    },

    // ========================================
    // WAREHOUSE API (Phase 2.1)
    // ========================================
    warehouses: {
        getList: async (): Promise<Warehouse[]> => {
            const response = await client.get<Warehouse[]>('/inventory/warehouses');
            return response.data;
        },
        getDropdown: async (): Promise<WarehouseDropdown[]> => {
            const response = await client.get<WarehouseDropdown[]>('/inventory/warehouses/dropdown');
            return response.data;
        },
        getById: async (id: string): Promise<Warehouse> => {
            const response = await client.get<Warehouse>(`/inventory/warehouses/${id}`);
            return response.data;
        },
        create: async (data: CreateWarehouseDto): Promise<{ id: string; code: string; name: string }> => {
            const response = await client.post('/inventory/warehouses', data);
            return response.data;
        },
        update: async (id: string, data: UpdateWarehouseDto): Promise<{ message: string }> => {
            const response = await client.put(`/inventory/warehouses/${id}`, data);
            return response.data;
        },
        delete: async (id: string): Promise<void> => {
            await client.delete(`/inventory/warehouses/${id}`);
        },
    },

    // ========================================
    // SERIAL NUMBER API (Phase 2.1)
    // ========================================
    serials: {
        getList: async (params?: SerialQueryParams): Promise<PagedResult<SerialNumberItem>> => {
            const response = await client.get<PagedResult<SerialNumberItem>>('/inventory/serials', { params });
            return response.data;
        },
        getById: async (id: string): Promise<SerialNumberItem> => {
            const response = await client.get<SerialNumberItem>(`/inventory/serials/${id}`);
            return response.data;
        },
        lookup: async (serial: string): Promise<SerialNumberItem> => {
            const response = await client.get<SerialNumberItem>(`/inventory/serials/lookup/${encodeURIComponent(serial)}`);
            return response.data;
        },
        create: async (data: CreateSerialDto): Promise<{ id: string; serial: string }> => {
            const response = await client.post('/inventory/serials', data);
            return response.data;
        },
        batchCreate: async (data: BatchCreateSerialDto): Promise<{ message: string; created: number; errors: string[] }> => {
            const response = await client.post('/inventory/serials/batch', data);
            return response.data;
        },
        transfer: async (id: string, warehouseId: string): Promise<{ message: string }> => {
            const response = await client.put(`/inventory/serials/${id}/transfer`, { warehouseId });
            return response.data;
        },
        updateStatus: async (id: string, data: UpdateSerialStatusDto): Promise<{ message: string; status: string }> => {
            const response = await client.put(`/inventory/serials/${id}/status`, data);
            return response.data;
        },
    },

    // ========================================
    // STOCK TRANSFER API (Phase 2.1)
    // ========================================
    transfers: {
        getList: async (status?: string): Promise<StockTransfer[]> => {
            const response = await client.get<StockTransfer[]>('/inventory/transfers', { params: { status } });
            return response.data;
        },
        create: async (data: CreateTransferDto): Promise<{ id: string; transferNumber: string; status: string }> => {
            const response = await client.post('/inventory/transfers', data);
            return response.data;
        },
        approve: async (id: string, approvedBy: string): Promise<{ message: string; status: string }> => {
            const response = await client.put(`/inventory/transfers/${id}/approve`, { approvedBy });
            return response.data;
        },
        ship: async (id: string, shippedBy: string): Promise<{ message: string; status: string }> => {
            const response = await client.put(`/inventory/transfers/${id}/ship`, { shippedBy });
            return response.data;
        },
        receive: async (id: string, receivedBy: string): Promise<{ message: string; status: string }> => {
            const response = await client.put(`/inventory/transfers/${id}/receive`, { receivedBy });
            return response.data;
        },
        cancel: async (id: string): Promise<{ message: string }> => {
            const response = await client.put(`/inventory/transfers/${id}/cancel`);
            return response.data;
        },
    },

    // ========================================
    // STOCK MOVEMENT API (Phase 2.1)
    // ========================================
    movements: {
        getList: async (params?: { productId?: string; type?: string; page?: number; pageSize?: number }): Promise<PagedResult<StockMovement>> => {
            const response = await client.get<PagedResult<StockMovement>>('/inventory/movements', { params });
            return response.data;
        },
    },
};

// ============================================
// PHASE 2.1 TYPES
// ============================================

export type WarehouseType = 'Main' | 'Branch' | 'Transit' | 'Showroom' | 'Returns' | 'Defective';
export type SerialStatus = 'InStock' | 'Reserved' | 'Sold' | 'Returned' | 'Defective' | 'InRepair' | 'Scrapped';
export type TransferStatus = 'Pending' | 'Approved' | 'Shipped' | 'Received' | 'Cancelled';
export type MovementType = 'In' | 'Out' | 'Transfer' | 'Adjustment' | 'Reserved' | 'Released';

export interface Warehouse {
    id: string;
    code: string;
    name: string;
    type: WarehouseType;
    address?: string;
    city?: string;
    district?: string;
    ward?: string;
    phone?: string;
    managerName?: string;
    managerEmail?: string;
    description?: string;
    capacity: number;
    currentItemCount: number;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    itemCount?: number;
    serialCount?: number;
}

export interface WarehouseDropdown {
    id: string;
    code: string;
    name: string;
    type: string;
    isDefault: boolean;
}

export interface CreateWarehouseDto {
    code: string;
    name: string;
    type: string;
    address?: string;
    city?: string;
    district?: string;
    ward?: string;
    phone?: string;
    managerName?: string;
    managerEmail?: string;
    description?: string;
    capacity?: number;
    isDefault?: boolean;
}

export interface UpdateWarehouseDto extends Omit<CreateWarehouseDto, 'code'> {}

export interface SerialNumberItem {
    id: string;
    serial: string;
    productId: string;
    productName?: string;
    productSku?: string;
    warehouseId?: string;
    warehouseName?: string;
    status: SerialStatus;
    orderId?: string;
    customerId?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    warrantyMonths: number;
    isUnderWarranty: boolean;
    soldAt?: string;
    receivedAt?: string;
    returnedAt?: string;
    notes?: string;
    createdAt: string;
}

export interface SerialQueryParams {
    productId?: string;
    warehouseId?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface CreateSerialDto {
    serial: string;
    productId: string;
    warehouseId?: string;
    purchaseOrderId?: string;
    productName?: string;
    productSku?: string;
    warrantyMonths?: number;
}

export interface BatchCreateSerialDto {
    serials: string[];
    productId: string;
    warehouseId?: string;
    purchaseOrderId?: string;
    productName?: string;
    productSku?: string;
    warrantyMonths?: number;
}

export interface UpdateSerialStatusDto {
    action: 'sell' | 'reserve' | 'release' | 'return' | 'defective' | 'repair' | 'complete-repair';
    referenceId?: string;
    customerId?: string;
    notes?: string;
}

export interface StockTransfer {
    id: string;
    transferNumber: string;
    fromWarehouseId: string;
    fromWarehouse?: string;
    toWarehouseId: string;
    toWarehouse?: string;
    status: TransferStatus;
    requestedAt: string;
    approvedAt?: string;
    shippedAt?: string;
    receivedAt?: string;
    notes?: string;
    requestedBy?: string;
    itemCount: number;
    totalQuantity: number;
}

export interface CreateTransferDto {
    fromWarehouseId: string;
    toWarehouseId: string;
    items: { inventoryItemId: string; quantity: number; productName?: string; productSku?: string }[];
    requestedBy?: string;
    notes?: string;
}

export interface StockMovement {
    id: string;
    inventoryItemId: string;
    productId: string;
    type: MovementType;
    quantity: number;
    reason: string;
    referenceId?: string;
    referenceType?: string;
    movementDate: string;
    performedBy?: string;
    notes?: string;
}

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

export const warehouseTypeLabels: Record<WarehouseType, string> = {
    Main: 'Kho chính',
    Branch: 'Kho chi nhánh',
    Transit: 'Kho trung chuyển',
    Showroom: 'Kho trưng bày',
    Returns: 'Kho hàng trả',
    Defective: 'Kho hàng lỗi'
};

export const serialStatusLabels: Record<SerialStatus, string> = {
    InStock: 'Trong kho',
    Reserved: 'Đã đặt trước',
    Sold: 'Đã bán',
    Returned: 'Hàng trả',
    Defective: 'Lỗi',
    InRepair: 'Đang sửa chữa',
    Scrapped: 'Đã thanh lý'
};

export const transferStatusLabels: Record<TransferStatus, string> = {
    Pending: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Shipped: 'Đang vận chuyển',
    Received: 'Đã nhận',
    Cancelled: 'Đã hủy'
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};
