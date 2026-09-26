/**
 * Combo trong giỏ — phần logic tách khỏi `CartContext.tsx` (giữ file dưới 200 dòng).
 *
 * Tài khoản: mọi thao tác đi thẳng tới `/sales/cart/bundles/**`, rồi đọc lại giỏ — server là
 * nguồn duy nhất của giá combo, lý do vỡ combo, và tổng tiền.
 * Vãng lai: combo nằm trong localStorage (`guest-cart-bundles.ts`), server định giá lúc đặt hàng.
 */
import { useCallback, useMemo } from 'react';
import type { BundleView } from '../api/bundle';
import { salesCartCheckoutApi, type CartBundleGroupDto } from '../api/sales/cart-checkout';
import { notify } from '../components/ui';
import {
    addGuestBundle, breakGuestBundle, hydrateGuestBundles, readGuestBundles, removeGuestBundle, writeGuestBundles,
} from '../components/cart/guest-cart-bundles';
import { normalizeApiError } from '../lib/api-error';
import type { CartItem } from './CartContext';

/** Nhóm combo hiển thị trong giỏ. */
export interface CartBundleGroup {
    bundleId: string;
    name: string;
    /** Server đã áp giá combo. Khách vãng lai: luôn true — giá chốt khi thanh toán. */
    isApplied: boolean;
    reason?: string | null;
    sets: number;
    listTotal: number;
    bundleTotal: number;
    discount: number;
    /** Giỏ vãng lai: giảm giá combo chỉ được áp khi đặt hàng. */
    pendingCheckout: boolean;
}

export function mapServerBundles(groups?: CartBundleGroupDto[]): CartBundleGroup[] {
    return (groups ?? []).map(g => ({ ...g, pendingCheckout: false }));
}

/** Nạp dòng + nhóm combo của giỏ vãng lai; combo không còn bán bị gỡ và báo cho khách. */
export async function loadGuestBundleState(): Promise<{ items: CartItem[]; groups: CartBundleGroup[]; subtotal: number }> {
    const entries = readGuestBundles();
    if (entries.length === 0) return { items: [], groups: [], subtotal: 0 };

    const { lines, groups, dropped } = await hydrateGuestBundles(entries);
    if (dropped.length > 0) {
        writeGuestBundles(entries.filter(e => !dropped.includes(e.bundleId)));
        notify.error(`${dropped.length} combo trong giỏ đã ngừng áp dụng và được gỡ khỏi giỏ.`);
    }

    const items: CartItem[] = lines.map(l => ({
        id: l.productId, name: l.name, price: l.price, quantity: l.quantity, imageUrl: l.imageUrl,
        stockQuantity: l.stockQuantity, lineTotal: l.price * l.quantity,
        bundleId: l.bundleId, bundleName: l.bundleName, lineDiscount: 0,
    }));
    return {
        items,
        groups: groups.map(g => ({ ...g, isApplied: g.isPurchasable, reason: g.isPurchasable ? null : 'Combo tạm hết hàng', pendingCheckout: true })),
        subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    };
}

interface Deps {
    isAuthenticated: boolean;
    items: CartItem[];
    reload: () => Promise<void>;
    setIsUpdating: (v: boolean) => void;
}

export function useCartBundleActions({ isAuthenticated, items, reload, setIsUpdating }: Deps) {
    const run = useCallback(async (work: () => Promise<unknown>, success?: string): Promise<boolean> => {
        setIsUpdating(true);
        try {
            await work();
            await reload();
            if (success) notify.success(success);
            return true;
        } catch (err) {
            notify.error(normalizeApiError(err).message);
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [reload, setIsUpdating]);

    const addBundleToCart = useCallback((bundle: Pick<BundleView, 'id' | 'name'>, sets = 1) => run(
        () => (isAuthenticated
            ? salesCartCheckoutApi.cart.addBundle(bundle.id, sets)
            : Promise.resolve(addGuestBundle(bundle.id, sets))),
        `Đã thêm ${bundle.name} vào giỏ hàng`,
    ), [isAuthenticated, run]);

    const removeBundle = useCallback((bundleId: string) => run(
        () => (isAuthenticated
            ? salesCartCheckoutApi.cart.removeBundle(bundleId)
            : Promise.resolve(removeGuestBundle(bundleId))),
        'Đã gỡ combo khỏi giỏ hàng',
    ), [isAuthenticated, run]);

    const guestBreak = useCallback((bundleId: string, override: { productId: string; quantity: number }) => {
        const lines = items.filter(i => i.bundleId === bundleId).map(i => ({ productId: i.id, quantity: i.quantity }));
        breakGuestBundle(bundleId, lines, override);
    }, [items]);

    /** Đổi số lượng một món trong combo ⇒ combo vỡ, giá các món về giá lẻ. */
    const updateBundleItem = useCallback((bundleId: string, productId: string, quantity: number) => run(
        () => (isAuthenticated
            ? salesCartCheckoutApi.cart.updateBundleItem(bundleId, productId, quantity)
            : Promise.resolve(guestBreak(bundleId, { productId, quantity }))),
        'Combo đã tách, giá các món trở về giá lẻ',
    ), [isAuthenticated, run, guestBreak]);

    /** Bỏ một món khỏi combo ⇒ combo vỡ, các món còn lại về giá lẻ. */
    const removeBundleItem = useCallback((bundleId: string, productId: string) => run(
        () => (isAuthenticated
            ? salesCartCheckoutApi.cart.removeBundleItem(bundleId, productId)
            : Promise.resolve(guestBreak(bundleId, { productId, quantity: 0 }))),
        'Combo đã tách, giá các món còn lại trở về giá lẻ',
    ), [isAuthenticated, run, guestBreak]);

    return useMemo(
        () => ({ addBundleToCart, removeBundle, updateBundleItem, removeBundleItem }),
        [addBundleToCart, removeBundle, updateBundleItem, removeBundleItem],
    );
}
