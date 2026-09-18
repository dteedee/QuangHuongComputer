/**
 * Quick receive (D10) — `docs/api-contracts/inventory-purchasing.md` §4.
 * `POST /inventory/receipts/quick`, permission `Inventory.QuickReceive`. One transaction
 * creates an already-approved PO + confirmed GRN — cost, serials, PO status all follow the
 * normal GRN §3 rules. Supplier mandatory, `unitCost > 0` mandatory on every line.
 */
import client from '../client';

export interface QuickReceiveNewSupplier {
    name: string;
    code?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
}

export interface QuickReceiveLine {
    productId: string;
    productName?: string;
    quantity: number;
    unitCost: number;
    serialNumbers?: string[];
}

export interface QuickReceiveRequest {
    supplierId?: string;
    newSupplier?: QuickReceiveNewSupplier;
    warehouseId?: string;
    notes?: string;
    items: QuickReceiveLine[];
}

export interface QuickReceiveReceiptLine {
    productId: string;
    productName: string;
    acceptedQty: number;
    rejectedQty: number;
    unitCost: number;
    averageCostAfter: number;
    warehouseId: string;
}

export interface QuickReceiveResult {
    purchaseOrderId: string;
    purchaseOrderNumber: string;
    receipt: {
        grnId: string;
        documentNumber: string;
        purchaseOrderId: string;
        poStatus: string;
        acceptedTotal: number;
        rejectedTotal: number;
        serialsCreated: number;
        purchaseReturnId: string | null;
        lines: QuickReceiveReceiptLine[];
    };
}

export const quickReceiveApi = {
    submit: async (body: QuickReceiveRequest): Promise<QuickReceiveResult> => {
        const res = await client.post<QuickReceiveResult>('/inventory/receipts/quick', body);
        return res.data;
    },
};
