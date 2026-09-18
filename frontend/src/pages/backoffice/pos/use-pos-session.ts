/**
 * Phiên bán hàng tại quầy — TRẠNG THÁI CỤC BỘ, không dùng `CartContext` của storefront.
 *
 * Vì sao: giỏ storefront cộng thêm 30.000đ phí ship và tự tính tiền ở client, nên hoá đơn in ra
 * lệch với số tiền server lưu. Ở quầy, mọi con số tiền đến từ `POST /sales/pos/quote`
 * (`docs/api-contracts/sales-pos-returns-loyalty.md` §1) — màn hình chỉ đọc lại.
 */
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesPosApi, type PosCustomer, type PosLine, type PosQuoteResult } from '../../../api/sales/pos';
import { inventoryApi } from '../../../api/inventory';

/** Một dòng trên màn hình quầy: `PosLine` + phần hiển thị lấy từ catalog. */
export interface PosCartLine extends PosLine {
    productName: string;
    sku?: string;
    imageUrl?: string | null;
    /** Giá niêm yết chỉ để hiển thị khi chưa có tạm tính — KHÔNG gửi lên server. */
    listPrice: number;
    /** Hàng quản lý theo serial: số serial phải bằng số lượng trước khi thu tiền. */
    serialTracked: boolean;
}

/** Kho bán hàng của quầy (D09: kho chính của cửa hàng). */
export interface PosStore {
    id: string;
    code: string;
    name: string;
}

const SELLABLE_WAREHOUSE_TYPES = ['Main', 'Branch', 'Showroom'];

export function usePosSession() {
    const [lines, setLines] = useState<PosCartLine[]>([]);
    const [customer, setCustomer] = useState<PosCustomer | null>(null);
    const [walkInName, setWalkInName] = useState('');
    const [walkInPhone, setWalkInPhone] = useState('');
    const [manualDiscount, setManualDiscount] = useState(0);
    const [discountReason, setDiscountReason] = useState('');
    const [approvedBy, setApprovedBy] = useState<string | null>(null);
    const [heldOrderId, setHeldOrderId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    /* --- kho bán: `/inventory/warehouses/dropdown`, ưu tiên kho mặc định ------- */
    const storeQuery = useQuery({
        queryKey: ['pos', 'store-warehouse'],
        queryFn: async (): Promise<PosStore | null> => {
            const all = await inventoryApi.warehouses.getDropdown();
            const sellable = all.filter((w) => SELLABLE_WAREHOUSE_TYPES.includes(w.type));
            const picked = sellable.find((w) => w.isDefault) ?? sellable[0] ?? null;
            return picked ? { id: picked.id, code: picked.code, name: picked.name } : null;
        },
        staleTime: 5 * 60 * 1000,
    });

    const addLine = useCallback((line: PosCartLine) => {
        setLines((prev) => {
            const at = prev.findIndex((l) => l.productId === line.productId && l.variantId === line.variantId);
            if (at < 0) return [...prev, line];
            const next = [...prev];
            next[at] = { ...next[at], quantity: next[at].quantity + line.quantity };
            return next;
        });
    }, []);

    const setQuantity = useCallback((productId: string, quantity: number) => {
        setLines((prev) =>
            quantity <= 0
                ? prev.filter((l) => l.productId !== productId)
                : prev.map((l) => (l.productId === productId
                    ? { ...l, quantity, serials: (l.serials ?? []).slice(0, quantity) }
                    : l))
        );
    }, []);

    const removeLine = useCallback((productId: string) => {
        setLines((prev) => prev.filter((l) => l.productId !== productId));
    }, []);

    const setSerials = useCallback((productId: string, serials: string[]) => {
        setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, serials } : l)));
    }, []);

    const reset = useCallback(() => {
        setLines([]);
        setCustomer(null);
        setWalkInName('');
        setWalkInPhone('');
        setManualDiscount(0);
        setDiscountReason('');
        setApprovedBy(null);
        setHeldOrderId(null);
        setNotes('');
    }, []);

    /* --- tạm tính: nguồn DUY NHẤT của mọi con số tiền trên màn hình ----------- */
    const quotePayload = useMemo(
        () => ({
            lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, variantId: l.variantId ?? null })),
            customerId: customer?.id ?? null,
            manualDiscount,
        }),
        [lines, customer, manualDiscount]
    );

    const quoteQuery = useQuery<PosQuoteResult>({
        queryKey: ['pos', 'quote', quotePayload],
        queryFn: () => salesPosApi.quote(quotePayload),
        enabled: lines.length > 0,
        placeholderData: (prev) => prev,
        retry: false,
    });

    const serialGaps = useMemo(
        () => lines.filter((l) => l.serialTracked && (l.serials?.length ?? 0) !== l.quantity),
        [lines]
    );

    return {
        lines, addLine, setQuantity, removeLine, setSerials, reset,
        customer, setCustomer,
        walkInName, setWalkInName, walkInPhone, setWalkInPhone,
        manualDiscount, setManualDiscount,
        discountReason, setDiscountReason,
        approvedBy, setApprovedBy,
        heldOrderId, setHeldOrderId,
        notes, setNotes,
        store: storeQuery.data ?? null,
        storeQuery,
        quote: quoteQuery.data ?? null,
        quoteQuery,
        serialGaps,
        itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    };
}

export type PosSession = ReturnType<typeof usePosSession>;
