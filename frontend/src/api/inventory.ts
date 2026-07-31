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

// ============================================
// GOODS RECEIVED NOTES (GRN)
// ============================================
export async function getGoodsReceivedNotes(page = 1, pageSize = 20) {
    const { data } = await client.get('/api/inventory/grn', { params: { page, pageSize } });
    return data;
}

export async function getGoodsReceivedNote(id: string) {
    const { data } = await client.get(`/api/inventory/grn/${id}`);
    return data;
}

export async function createGoodsReceivedNote(grn: any) {
    const { data } = await client.post('/api/inventory/grn', grn);
    return data;
}

export async function confirmGoodsReceivedNote(id: string) {
    const { data } = await client.post(`/api/inventory/grn/${id}/confirm`);
    return data;
}

// ============================================
// DELIVERY NOTES (DN)
// ============================================
export async function getDeliveryNotes(page = 1, pageSize = 20) {
    const { data } = await client.get('/api/inventory/dn', { params: { page, pageSize } });
    return data;
}

export async function createDeliveryNote(dn: any) {
    const { data } = await client.post('/api/inventory/dn', dn);
    return data;
}

export async function confirmDeliveryNote(id: string) {
    const { data } = await client.post(`/api/inventory/dn/${id}/confirm`);
    return data;
}

// ============================================
// INVENTORY COUNT
// ============================================
export async function getInventoryCounts(page = 1, pageSize = 20) {
    const { data } = await client.get('/api/inventory/count', { params: { page, pageSize } });
    return data;
}

export async function createInventoryCount(session: any) {
    const { data } = await client.post('/api/inventory/count', session);
    return data;
}

export async function getInventoryCount(id: string) {
    const { data } = await client.get(`/api/inventory/count/${id}`);
    return data;
}

export async function recordInventoryCount(id: string, items: any[]) {
    const { data } = await client.post(`/api/inventory/count/${id}/record`, { items });
    return data;
}

export async function approveInventoryCount(id: string) {
    const { data } = await client.post(`/api/inventory/count/${id}/approve`);
    return data;
}

// ============================================
// PO APPROVAL (Phase 05C)
// ============================================
export type POStatusExt = POStatus | 'PendingApproval' | 'Approved' | 'Rejected';

export interface PendingApprovalPO {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName?: string;
    totalAmount: number;
    createdAt: string;
    createdBy?: string;
    createdByName?: string;
    status: POStatusExt;
    approvalLevel?: number;
    approvalLevelName?: string;
    items?: { productId: string; productName?: string; quantity: number; unitPrice: number }[];
}

export const poApprovalApi = {
    getPending: async (): Promise<PendingApprovalPO[]> => {
        const { data } = await client.get<PendingApprovalPO[]>('/inventory/pending-approval-pos');
        return data;
    },
    submitForApproval: async (id: string): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/pos/${id}/submit-for-approval`);
        return data;
    },
    approve: async (id: string): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/pos/${id}/approve`);
        return data;
    },
    reject: async (id: string, reason: string): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/pos/${id}/reject`, { reason });
        return data;
    },
};

// ============================================
// PURCHASE REQUISITION (Phase 05C)
// ============================================
export type RequisitionStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Converted' | 'Cancelled';
export type UrgencyLevel = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface PurchaseRequisitionItemDto {
    productId: string;
    productName?: string;
    sku?: string;
    quantity: number;
    estimatedPrice?: number;
}

export interface PurchaseRequisition {
    id: string;
    number: string;
    requestedBy?: string;
    requestedByName?: string;
    urgency: UrgencyLevel;
    reason?: string;
    status: RequisitionStatus;
    itemCount: number;
    estimatedTotal: number;
    createdAt: string;
    items?: PurchaseRequisitionItemDto[];
}

export interface CreateRequisitionDto {
    urgency: UrgencyLevel;
    reason?: string;
    items: PurchaseRequisitionItemDto[];
}

export const requisitionApi = {
    getList: async (status?: RequisitionStatus | 'all'): Promise<PurchaseRequisition[]> => {
        const { data } = await client.get<PurchaseRequisition[]>('/inventory/purchase-requisitions', {
            params: status && status !== 'all' ? { status } : {},
        });
        return data;
    },
    create: async (dto: CreateRequisitionDto): Promise<PurchaseRequisition> => {
        const { data } = await client.post<PurchaseRequisition>('/inventory/purchase-requisitions', dto);
        return data;
    },
    approve: async (id: string): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/purchase-requisitions/${id}/approve`);
        return data;
    },
    convertToPO: async (id: string, supplierId: string): Promise<{ poId: string; poNumber: string }> => {
        const { data } = await client.post<{ poId: string; poNumber: string }>(
            `/inventory/purchase-requisitions/${id}/convert-to-po`,
            { supplierId }
        );
        return data;
    },
};

// ============================================
// RFQ (Phase 05C)
// ============================================
export type RfqStatus = 'Draft' | 'Sent' | 'ClosedForBidding' | 'Awarded' | 'Cancelled';

export interface RfqItemDto {
    productId: string;
    productName?: string;
    sku?: string;
    quantity: number;
}

export interface RequestForQuotation {
    id: string;
    number: string;
    createdAt: string;
    dueDate?: string;
    status: RfqStatus;
    supplierCount: number;
    quotationCount: number;
    items?: RfqItemDto[];
    supplierIds?: string[];
}

export interface CreateRfqDto {
    dueDate?: string;
    requisitionId?: string;
    items: RfqItemDto[];
}

export interface QuotationItemInput {
    productId: string;
    unitPrice: number;
    notes?: string;
}

export interface CreateQuotationDto {
    supplierId: string;
    paymentTerm?: PaymentTermType;
    deliveryDays?: number;
    warrantyMonths?: number;
    validUntil?: string;
    notes?: string;
    items: QuotationItemInput[];
}

export interface QuotationSummary {
    quotationId: string;
    supplierId: string;
    supplierName?: string;
    paymentTerm?: PaymentTermType;
    deliveryDays?: number;
    warrantyMonths?: number;
    total: number;
}

export interface QuotationCell {
    quotationId: string;
    unitPrice?: number;
    notes?: string;
}

export interface QuotationComparisonRow {
    productId: string;
    productName: string;
    sku?: string;
    quantity: number;
    prices: QuotationCell[];
}

export interface QuotationComparison {
    items: QuotationComparisonRow[];
    quotations: QuotationSummary[];
    /** Ánh xạ column key -> quotationId có giá trị tốt nhất (giá thấp nhất / thời gian giao ngắn nhất, v.v.) */
    bestByColumn?: Record<string, string>;
}

export const rfqApi = {
    getList: async (status?: RfqStatus | 'all'): Promise<RequestForQuotation[]> => {
        const { data } = await client.get<RequestForQuotation[]>('/inventory/rfq', {
            params: status && status !== 'all' ? { status } : {},
        });
        return data;
    },
    create: async (dto: CreateRfqDto): Promise<RequestForQuotation> => {
        const { data } = await client.post<RequestForQuotation>('/inventory/rfq', dto);
        return data;
    },
    sendToSuppliers: async (id: string, supplierIds: string[]): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/rfq/${id}/send-to-suppliers`, { supplierIds });
        return data;
    },
    addQuotation: async (id: string, dto: CreateQuotationDto): Promise<{ quotationId: string }> => {
        const { data } = await client.post<{ quotationId: string }>(`/inventory/rfq/${id}/quotations`, dto);
        return data;
    },
    getComparison: async (id: string): Promise<QuotationComparison> => {
        const { data } = await client.get<QuotationComparison>(`/inventory/rfq/${id}/comparison`);
        return data;
    },
    award: async (id: string, quotationId: string): Promise<{ poId: string; poNumber: string }> => {
        const { data } = await client.post<{ poId: string; poNumber: string }>(`/inventory/rfq/${id}/award/${quotationId}`);
        return data;
    },
};

// ============================================
// GRN INSPECTION (Phase 05C — mở rộng GRN có sẵn)
// ============================================
export interface GrnInspectItem {
    itemId: string;
    productName?: string;
    sku?: string;
    totalQty: number;
    acceptedQty: number;
    rejectedQty: number;
    reason?: string;
}

export interface GrnDetail {
    id: string;
    documentNumber: string;
    documentDate?: string;
    warehouseId?: string;
    warehouseName?: string;
    supplierId?: string;
    supplierName?: string;
    status: number | string;
    notes?: string;
    items: GrnInspectItem[];
}

export interface InspectGrnDto {
    items: { itemId: string; acceptedQty: number; rejectedQty: number; reason?: string }[];
}

export const grnInspectionApi = {
    getDetail: async (id: string): Promise<GrnDetail> => {
        const { data } = await client.get<GrnDetail>(`/inventory/grn/${id}`);
        return data;
    },
    inspect: async (id: string, dto: InspectGrnDto): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/grn/${id}/inspect`, dto);
        return data;
    },
    confirm: async (id: string): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/grn/${id}/confirm`);
        return data;
    },
};

// ============================================
// PURCHASE RETURN (Phase 05C)
// ============================================
export type PurchaseReturnStatus = 'Draft' | 'Confirmed' | 'Shipped' | 'RefundReceived' | 'Cancelled';

export interface PurchaseReturnItem {
    productId: string;
    productName?: string;
    sku?: string;
    quantity: number;
    unitPrice?: number;
    reason?: string;
}

export interface PurchaseReturn {
    id: string;
    number: string;
    grnId?: string;
    grnNumber?: string;
    supplierId?: string;
    supplierName?: string;
    total: number;
    status: PurchaseReturnStatus;
    createdAt: string;
    items?: PurchaseReturnItem[];
}

export interface CreatePurchaseReturnDto {
    grnId: string;
    items: PurchaseReturnItem[];
}

export const purchaseReturnApi = {
    getList: async (status?: PurchaseReturnStatus | 'all'): Promise<PurchaseReturn[]> => {
        const { data } = await client.get<PurchaseReturn[]>('/inventory/purchase-returns', {
            params: status && status !== 'all' ? { status } : {},
        });
        return data;
    },
    getDefectiveGrns: async (): Promise<{ grnId: string; grnNumber: string; supplierName?: string; rejectedItemCount: number }[]> => {
        // Lọc GRN có rejectedQty > 0 — reuse existing GRN list nếu backend chưa có endpoint dedicated
        const { data } = await client.get('/inventory/grn/defective');
        return data;
    },
    create: async (dto: CreatePurchaseReturnDto): Promise<PurchaseReturn> => {
        const { data } = await client.post<PurchaseReturn>('/inventory/purchase-returns', dto);
        return data;
    },
    confirm: async (id: string): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/purchase-returns/${id}/confirm`);
        return data;
    },
    acceptRefund: async (id: string, amount: number): Promise<{ message: string }> => {
        const { data } = await client.post<{ message: string }>(`/inventory/purchase-returns/${id}/accept-refund`, { amount });
        return data;
    },
};

// ============================================
// LANDED COST (Phase 05C)
// ============================================
export type LandedCostType = 'Shipping' | 'ImportTax' | 'CustomsFee' | 'Insurance' | 'Other';
export type AllocationMethod = 'ByValue' | 'ByWeight' | 'ByQuantity';

export interface LandedCost {
    id: string;
    grnId: string;
    type: LandedCostType;
    description?: string;
    amount: number;
    allocationMethod: AllocationMethod;
    isAllocated: boolean;
    createdAt: string;
}

export interface CreateLandedCostDto {
    type: LandedCostType;
    description?: string;
    amount: number;
    allocationMethod: AllocationMethod;
}

export interface LandedCostAllocationResult {
    itemId: string;
    productName?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    costShare: number;
    actualUnitCost: number;
    newAverageCost: number;
}

export const landedCostApi = {
    getForGrn: async (grnId: string): Promise<LandedCost[]> => {
        const { data } = await client.get<LandedCost[]>(`/inventory/grn/${grnId}/landed-costs`);
        return data;
    },
    add: async (grnId: string, dto: CreateLandedCostDto): Promise<LandedCost> => {
        const { data } = await client.post<LandedCost>(`/inventory/grn/${grnId}/landed-costs`, dto);
        return data;
    },
    allocate: async (grnId: string): Promise<LandedCostAllocationResult[]> => {
        const { data } = await client.post<LandedCostAllocationResult[]>(`/inventory/grn/${grnId}/landed-costs/allocate`);
        return data;
    },
};

// ============================================
// SUPPLIER SCORECARD (Phase 05C)
// ============================================
export interface SupplierScorecard {
    supplierId: string;
    supplierName: string;
    from: string;
    to: string;
    ontimeRate: number;      // 0-100 %
    defectRate: number;      // 0-100 %
    priceRank: number;       // 1 = tốt nhất
    totalScore: number;      // 0-100
    /** So sánh kỳ trước — dương là tăng, âm là giảm */
    scoreDelta?: number;
    trend?: { period: string; score: number }[];
}

export const supplierScorecardApi = {
    getList: async (from: string, to: string): Promise<SupplierScorecard[]> => {
        const { data } = await client.get<SupplierScorecard[]>('/inventory/suppliers/scorecards', {
            params: { from, to },
        });
        return data;
    },
    getOne: async (supplierId: string, from: string, to: string): Promise<SupplierScorecard> => {
        const { data } = await client.get<SupplierScorecard>(`/inventory/suppliers/${supplierId}/scorecard`, {
            params: { from, to },
        });
        return data;
    },
};

// ============================================
// SERIAL TIMELINE (Phase 05C)
// ============================================
export type SerialEventType =
    | 'Purchased'
    | 'Received'
    | 'Transferred'
    | 'Reserved'
    | 'Sold'
    | 'Warranty'
    | 'Repair'
    | 'Returned'
    | 'Defective'
    | 'Scrapped';

export interface SerialTimelineEvent {
    at: string;
    type: SerialEventType;
    ref?: string;             // Ví dụ PO-2026-001, ORD-2026-123
    refLink?: string;         // Đường dẫn nội bộ
    description?: string;
}

export const serialTimelineApi = {
    getTimeline: async (serial: string): Promise<SerialTimelineEvent[]> => {
        const { data } = await client.get<SerialTimelineEvent[]>(
            `/inventory/serials/${encodeURIComponent(serial)}/timeline`
        );
        return data;
    },
};
