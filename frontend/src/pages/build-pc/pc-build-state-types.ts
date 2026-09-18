/**
 * Local build state — one slot -> the parts picked into it. Kept OUT of the
 * URL (Implementation Steps #2: "URL-less local reducer + sessionStorage") so
 * a half-finished build never leaks into a shareable link before the owner
 * explicitly saves it (`POST /builds`).
 *
 * Denormalised on purpose: `PcCandidate`'s display fields (name/price/image)
 * are cached here so a reload can repaint the slot list instantly, without
 * waiting on a network round trip. The running total/compatibility verdict
 * is NEVER computed from these cached fields — only from the live
 * `POST /check` response (contract §0: "compatibility answers come from the
 * engine, never from the client").
 */
import type { PcSavedBuildItem, PcSlotId } from '../../api/pcbuilder';

export interface PcPickedItem {
    productId: string;
    quantity: number;
    name: string;
    sku: string;
    slug: string;
    price: number;
    imageUrl: string | null;
    inStock: boolean;
}

export type PcBuildState = Partial<Record<PcSlotId, PcPickedItem[]>>;

export type PcBuildAction =
    | { type: 'HYDRATE'; state: PcBuildState }
    | { type: 'SET_ITEM'; slotId: PcSlotId; item: PcPickedItem; allowMultiple: boolean; maxQuantity: number }
    | { type: 'REMOVE_ITEM'; slotId: PcSlotId; productId: string }
    | { type: 'SET_QUANTITY'; slotId: PcSlotId; productId: string; quantity: number }
    | { type: 'CLEAR' };

export function pcBuildReducer(state: PcBuildState, action: PcBuildAction): PcBuildState {
    switch (action.type) {
        case 'HYDRATE':
            return action.state;
        case 'CLEAR':
            return {};
        case 'SET_ITEM': {
            const { slotId, item, allowMultiple, maxQuantity } = action;
            const existing = state[slotId] ?? [];
            if (!allowMultiple) return { ...state, [slotId]: [item] };
            const already = existing.find((e) => e.productId === item.productId);
            const next = already
                ? existing.map((e) => (e.productId === item.productId ? { ...e, quantity: item.quantity } : e))
                : [...existing, item];
            return { ...state, [slotId]: next.slice(0, Math.max(1, maxQuantity)) };
        }
        case 'REMOVE_ITEM': {
            const existing = state[action.slotId] ?? [];
            const next = existing.filter((e) => e.productId !== action.productId);
            const copy = { ...state };
            if (next.length === 0) delete copy[action.slotId];
            else copy[action.slotId] = next;
            return copy;
        }
        case 'SET_QUANTITY': {
            const existing = state[action.slotId] ?? [];
            return {
                ...state,
                [action.slotId]: existing.map((e) =>
                    e.productId === action.productId ? { ...e, quantity: Math.max(1, action.quantity) } : e),
            };
        }
        default:
            return state;
    }
}

/** sessionStorage key — same file that owns the reducer, so the hook and any
 *  page that seeds state from elsewhere (the shared-build view) share one key. */
export const PC_BUILD_SESSION_KEY = 'qhc.pcbuilder.build.v1';

/**
 * Reconstructs slot-keyed state from a saved build's items (`GET
 * /builds/{code}`). `slotId` is a real, server-resolved slot id per item
 * (`PcBuilderBuildsEndpoint.cs`: `i.ComponentType`) — never guessed here.
 * Rows with no resolvable slot (`"khac"`, or the product no longer exists)
 * are dropped rather than fabricated into a slot they were never in.
 */
export function pcBuildStateFromSavedItems(items: PcSavedBuildItem[]): PcBuildState {
    const state: PcBuildState = {};
    for (const item of items) {
        if (item.slotId === 'khac' || !item.product) continue;
        const slotId = item.slotId;
        const entry: PcPickedItem = {
            productId: item.productId,
            quantity: item.quantity,
            name: item.product.name,
            sku: item.product.sku,
            slug: item.product.slug,
            price: item.unitPrice,
            imageUrl: item.product.imageUrl,
            inStock: true, // Chưa được xác nhận lại — /check sẽ chạy lại ngay khi trang builder mở.
        };
        state[slotId] = [...(state[slotId] ?? []), entry];
    }
    return state;
}
