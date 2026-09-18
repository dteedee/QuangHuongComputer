/**
 * Giỏ hàng của khách CHƯA ĐĂNG NHẬP.
 *
 * Bảo mật (phase-28 §Security): localStorage chỉ chứa ID + số lượng — KHÔNG giá, KHÔNG tên,
 * KHÔNG thông tin cá nhân. Mọi thứ hiển thị (tên, giá, ảnh, tồn) được nạp lại từ API danh mục
 * mỗi lần mở giỏ, nên giỏ không bao giờ hiển thị giá cũ đã lỗi thời.
 *
 * File nằm trong `components/cart/` vì `context/` chỉ có đúng `CartContext.tsx` thuộc track này;
 * đây là tiện ích của giỏ hàng, không phải một React context.
 */
import { catalogPublicProductApi } from '../../api/catalog/public-product';
import { salesCartCheckoutApi } from '../../api/sales/cart-checkout';
import { browserStorage } from '../../lib/browser-storage';

export const GUEST_CART_KEY = 'qhc.cart.guest.v2';

/** Dòng giỏ vãng lai — đúng ba trường, không hơn. */
export interface GuestCartLine {
    productId: string;
    variantId?: string;
    quantity: number;
}

/** Dòng đã nạp đủ thông tin hiển thị từ API (không lấy từ localStorage). */
export interface HydratedGuestLine extends GuestCartLine {
    name: string;
    price: number;
    imageUrl?: string;
    stockQuantity: number;
    variantName?: string;
}

export interface HydrateResult {
    lines: HydratedGuestLine[];
    /** Dòng bị bỏ vì sản phẩm không còn tồn tại / ngừng bán — báo cho khách biết. */
    dropped: string[];
}

export function readGuestLines(): GuestCartLine[] {
    try {
        const parsed = browserStorage.getJSON<unknown>(GUEST_CART_KEY, []);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((l): l is GuestCartLine =>
                !!l && typeof (l as GuestCartLine).productId === 'string'
                && Number.isFinite((l as GuestCartLine).quantity))
            .map(l => ({ productId: l.productId, variantId: l.variantId, quantity: Math.max(1, Math.trunc(l.quantity)) }));
    } catch { return []; }
}

export function writeGuestLines(lines: GuestCartLine[]): void {
    if (lines.length === 0) browserStorage.removeItem(GUEST_CART_KEY);
    else browserStorage.setJSON(GUEST_CART_KEY, lines);
}

export function clearGuestLines(): void {
    browserStorage.removeItem(GUEST_CART_KEY);
}

const lineKey = (l: GuestCartLine) => `${l.productId}::${l.variantId ?? ''}`;

export function mergeGuestLine(lines: GuestCartLine[], add: GuestCartLine): GuestCartLine[] {
    const key = lineKey(add);
    const existing = lines.find(l => lineKey(l) === key);
    if (!existing) return [...lines, add];
    return lines.map(l => (lineKey(l) === key ? { ...l, quantity: l.quantity + add.quantity } : l));
}

/**
 * Nạp thông tin hiển thị cho từng dòng từ API danh mục (nguồn giá DUY NHẤT).
 * Sản phẩm không đọc được ⇒ bỏ dòng và trả tên/ID trong `dropped` để UI báo rõ.
 */
export async function hydrateGuestLines(lines: GuestCartLine[]): Promise<HydrateResult> {
    if (lines.length === 0) return { lines: [], dropped: [] };

    const results = await Promise.allSettled(
        lines.map(l => catalogPublicProductApi.getProductWithDetails(l.productId)),
    );

    const hydrated: HydratedGuestLine[] = [];
    const dropped: string[] = [];

    results.forEach((res, i) => {
        const line = lines[i];
        if (res.status !== 'fulfilled' || !res.value) {
            dropped.push(line.productId);
            return;
        }
        const p = res.value;
        const variant = p.variants?.find(v => v.id === line.variantId);
        hydrated.push({
            ...line,
            name: p.name,
            price: variant?.price ?? p.price,
            imageUrl: p.thumbnailUrl ?? p.imageUrl ?? undefined,
            stockQuantity: variant?.stockQuantity ?? p.stockQuantity ?? 0,
            variantName: variant?.name,
        });
    });

    return { lines: hydrated, dropped };
}

/**
 * Đẩy giỏ vãng lai lên tài khoản NGAY SAU khi đăng nhập.
 *
 * Ba bước, mỗi bước vá một lỗ đo được trên :5050 (2026-09-18):
 *  1. `POST /sales/cart/merge` — gộp giỏ theo cookie `qh_aid` VÀ gắn các đơn đã đặt lúc còn
 *     vãng lai về tài khoản. Chỉ đường này làm được việc gắn đơn.
 *  2. Xoá mọi dòng có `price = 0`. `POST /sales/public/cart/items` cố tình ghi giá 0 (server
 *     đọc lại giá thật lúc chốt đơn), nhưng `MergeFrom` bê nguyên số 0 sang giỏ tài khoản,
 *     nên sau khi đăng nhập khách nhìn thấy một giỏ hàng trị giá 0đ. Đã báo cho W2-3.
 *  3. Thêm lại từng dòng từ localStorage qua `POST /sales/cart/items` — đường này đọc giá thật.
 *     Bước này cũng là lưới an toàn khi cookie giỏ vãng lai không còn (khách đổi máy).
 */
export async function pushGuestCartToAccount(
    lines: GuestCartLine[],
    onLineFailed?: (productId: string) => void,
): Promise<void> {
    try { await salesCartCheckoutApi.cart.merge(); } catch { /* không có giỏ cookie — bỏ qua */ }

    // CHỈ xoá dòng 0đ do bước gộp vừa bê sang — tức dòng có mặt trong giỏ vãng lai của máy này.
    // Dòng 0đ khác (quà tặng khuyến mãi, hàng tặng kèm do server thêm) KHÔNG được đụng tới, và
    // cũng không có gì thêm lại chúng nếu xoá nhầm.
    const pendingIds = new Set(lines.map(l => l.productId));
    try {
        const merged = await salesCartCheckoutApi.cart.get();
        for (const line of merged.items) {
            if (line.price === 0 && pendingIds.has(line.productId)) {
                await salesCartCheckoutApi.cart.removeItem(line.productId);
            }
        }
    } catch { /* đọc giỏ hỏng: cứ thêm lại bên dưới, server vẫn là nguồn sự thật */ }

    for (const line of lines) {
        try {
            await salesCartCheckoutApi.cart.addItem({
                productId: line.productId,
                variantId: line.variantId,
                quantity: line.quantity,
            });
        } catch {
            // Hết hàng / ngừng bán — báo cho khách thay vì im lặng làm mất sản phẩm.
            onLineFailed?.(line.productId);
        }
    }

    clearGuestLines();
}
