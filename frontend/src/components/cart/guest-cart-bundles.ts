/**
 * Combo trong giỏ của khách CHƯA ĐĂNG NHẬP.
 *
 * Giống `guest-cart-storage.ts`: localStorage chỉ giữ `bundleId` + số bộ — không giá, không tên.
 * Món, tên, giá lẻ được nạp lại từ `GET /catalog/bundles/{id}` mỗi lần mở giỏ. Giá combo thật
 * do server tính lúc đặt hàng (`bundles` trong payload guest-checkout), nên giỏ vãng lai chỉ
 * hiển thị mức tiết kiệm catalog đang quảng cáo và ghi rõ "áp dụng khi thanh toán".
 */
import { bundleApi } from '../../api/bundle';
import { salesCartCheckoutApi } from '../../api/sales/cart-checkout';
import { browserStorage } from '../../lib/browser-storage';
import { mergeGuestLine, readGuestLines, writeGuestLines } from './guest-cart-storage';

export const GUEST_BUNDLES_KEY = 'qhc.cart.guest.bundles.v1';

export interface GuestBundleEntry {
    bundleId: string;
    quantity: number;
}

/** Dòng combo đã nạp đủ thông tin hiển thị. */
export interface HydratedGuestBundleLine {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    stockQuantity: number;
    bundleId: string;
    bundleName: string;
}

export interface HydratedGuestBundleGroup {
    bundleId: string;
    name: string;
    sets: number;
    listTotal: number;
    bundleTotal: number;
    discount: number;
    isPurchasable: boolean;
}

export function readGuestBundles(): GuestBundleEntry[] {
    try {
        const parsed = browserStorage.getJSON<unknown>(GUEST_BUNDLES_KEY, []);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((b): b is GuestBundleEntry =>
                !!b && typeof (b as GuestBundleEntry).bundleId === 'string'
                && Number.isFinite((b as GuestBundleEntry).quantity))
            .map(b => ({ bundleId: b.bundleId, quantity: Math.min(10, Math.max(1, Math.trunc(b.quantity))) }));
    } catch { return []; }
}

export function writeGuestBundles(entries: GuestBundleEntry[]): void {
    if (entries.length === 0) browserStorage.removeItem(GUEST_BUNDLES_KEY);
    else browserStorage.setJSON(GUEST_BUNDLES_KEY, entries);
}

export function addGuestBundle(bundleId: string, sets: number): void {
    const current = readGuestBundles();
    const existing = current.find(b => b.bundleId === bundleId);
    writeGuestBundles(existing
        ? current.map(b => (b.bundleId === bundleId ? { ...b, quantity: Math.min(10, b.quantity + sets) } : b))
        : [...current, { bundleId, quantity: sets }]);
}

export function removeGuestBundle(bundleId: string): void {
    writeGuestBundles(readGuestBundles().filter(b => b.bundleId !== bundleId));
}

/**
 * Vỡ combo của khách vãng lai: nhóm biến mất, các món còn lại thành dòng lẻ (giá lẻ).
 * `override` đổi số lượng một món (0 = bỏ món đó).
 */
export function breakGuestBundle(
    bundleId: string,
    lines: { productId: string; quantity: number }[],
    override?: { productId: string; quantity: number },
): void {
    let standalone = readGuestLines();
    for (const line of lines) {
        const quantity = override && override.productId === line.productId ? override.quantity : line.quantity;
        if (quantity > 0) standalone = mergeGuestLine(standalone, { productId: line.productId, quantity });
    }
    writeGuestLines(standalone);
    removeGuestBundle(bundleId);
}

/** Nạp món + giá của từng combo. Combo không còn bán ⇒ bỏ và trả về trong `dropped`. */
export async function hydrateGuestBundles(entries: GuestBundleEntry[]): Promise<{
    lines: HydratedGuestBundleLine[];
    groups: HydratedGuestBundleGroup[];
    dropped: string[];
}> {
    const results = await Promise.allSettled(entries.map(e => bundleApi.getBundleById(e.bundleId)));
    const lines: HydratedGuestBundleLine[] = [];
    const groups: HydratedGuestBundleGroup[] = [];
    const dropped: string[] = [];

    results.forEach((res, i) => {
        const entry = entries[i];
        if (res.status !== 'fulfilled' || !res.value) { dropped.push(entry.bundleId); return; }
        const b = res.value;
        for (const item of b.items) {
            lines.push({
                productId: item.productId,
                name: item.productName,
                price: item.unitPrice,
                quantity: item.quantity * entry.quantity,
                imageUrl: item.productImage ?? undefined,
                stockQuantity: item.inStock ? item.quantity * entry.quantity : 0,
                bundleId: b.id,
                bundleName: b.name,
            });
        }
        groups.push({
            bundleId: b.id,
            name: b.name,
            sets: entry.quantity,
            listTotal: b.originalPrice * entry.quantity,
            bundleTotal: b.bundlePrice * entry.quantity,
            discount: b.savings * entry.quantity,
            isPurchasable: b.isPurchasable,
        });
    });

    return { lines, groups, dropped };
}

/** Sau khi đăng nhập: đẩy combo của giỏ vãng lai lên giỏ tài khoản (server kiểm tồn/giá). */
export async function pushGuestBundlesToAccount(onFailed?: (bundleId: string) => void): Promise<void> {
    const entries = readGuestBundles();
    for (const entry of entries) {
        try {
            await salesCartCheckoutApi.cart.addBundle(entry.bundleId, entry.quantity);
        } catch {
            onFailed?.(entry.bundleId);
        }
    }
    writeGuestBundles([]);
}
