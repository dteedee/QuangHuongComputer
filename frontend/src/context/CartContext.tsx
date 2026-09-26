import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { Product } from '../api/catalog';
import { notify } from '../components/ui';
import { salesCartCheckoutApi, type VatBucketDto } from '../api/sales/cart-checkout';
import { useAuth } from './AuthContext';
import {
    hydrateGuestLines, mergeGuestLine, pushGuestCartToAccount, readGuestLines, writeGuestLines,
    type GuestCartLine,
} from '../components/cart/guest-cart-storage';
import { normalizeApiError } from '../lib/api-error';
import {
    loadGuestBundleState, mapServerBundles, useCartBundleActions, type CartBundleGroup,
} from './cart-bundle-actions';
import { pushGuestBundlesToAccount, readGuestBundles, writeGuestBundles } from '../components/cart/guest-cart-bundles';
import type { BundleView } from '../api/bundle';

export type { CartBundleGroup } from './cart-bundle-actions';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    stockQuantity: number;
    /** Thành tiền dòng do SERVER trả (giỏ đăng nhập). Khách vãng lai: giá × số lượng. */
    lineTotal: number;
    /** Tên biến thể để hiển thị (VD "16GB/512GB/Đen"). Chỉ có khi sản phẩm có biến thể. */
    variantName?: string;
    variantId?: string;
    /** Combo: dòng thuộc nhóm combo (undefined = dòng lẻ). */
    bundleId?: string;
    bundleName?: string;
    /** Giảm combo chia về dòng (server tính; vãng lai = 0 đến lúc thanh toán). */
    lineDiscount?: number;
}

/** Tập trường tối thiểu `addToCart` cần — mọi `Product` đều thoả, nên nơi gọi cũ không đổi. */
export type CartProductInput = Pick<Product, 'id' | 'name' | 'price' | 'stockQuantity'>;

export interface AddToCartOptions {
    variantId?: string;
    variantName?: string;
    /** Tắt toast khi nơi gọi tự hiển thị phản hồi (VD POS). */
    silent?: boolean;
}

interface CartContextType {
    items: CartItem[];
    /** Giỏ đang ở chế độ khách vãng lai (localStorage) thay vì giỏ trên server. */
    isGuest: boolean;
    /** ID giỏ trên server — cần cho phiên giữ chỗ và `/checkout/orchestrate`. */
    cartId: string | null;
    /** Trả về `true` khi server đã thực sự nhận hàng vào giỏ, `false` khi thất bại. */
    addToCart: (product: CartProductInput, quantity?: number, options?: AddToCartOptions) => Promise<boolean>;
    removeFromCart: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;

    couponCode: string | null;
    discountAmount: number;
    applyCoupon: (code: string) => Promise<void>;
    removeCoupon: () => Promise<void>;

    // ---- Tiền: SERVER là nguồn duy nhất (D01). FE chỉ hiển thị, không bao giờ tính. ----
    subtotal: number;
    /** VAT ĐÃ nằm trong `subtotal`/`total` — chỉ để hiển thị dòng "Trong đó VAT". */
    tax: number;
    /** Nhãn thuế suất; chỉ hiển thị % khi cả giỏ cùng một mức (xem `vatBreakdown`). */
    taxRate: number;
    vatBreakdown: VatBucketDto[];
    shippingAmount: number;
    total: number;
    itemCount: number;
    totalQuantity: number;

    isLoading: boolean;
    /** Đã nạp giỏ xong ít nhất một lần. Trước đó `items` rỗng KHÔNG có nghĩa là giỏ trống. */
    isReady: boolean;
    isUpdating: boolean;
    /** Thông điệp lỗi tải giỏ — trang giỏ hiển thị kèm nút "Thử lại" thay vì giỏ trống giả. */
    error: string | null;
    refreshCart: () => Promise<void>;

    // ---- Combo (nhóm dòng mang cùng bundleId) ----
    bundles: CartBundleGroup[];
    addBundleToCart: (bundle: Pick<BundleView, 'id' | 'name'>, sets?: number) => Promise<boolean>;
    removeBundle: (bundleId: string) => Promise<boolean>;
    /** Đổi số lượng một món trong combo — combo vỡ, giá về giá lẻ. */
    updateBundleItem: (bundleId: string, productId: string, quantity: number) => Promise<boolean>;
    /** Bỏ một món khỏi combo — combo vỡ, các món còn lại về giá lẻ. */
    removeBundleItem: (bundleId: string, productId: string) => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const emptyTotals = {
    subtotal: 0, tax: 0, taxRate: 0, shippingAmount: 0, total: 0, discountAmount: 0,
    vatBreakdown: [] as VatBucketDto[],
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [cartId, setCartId] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState<string | null>(null);
    const [totals, setTotals] = useState(emptyTotals);
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bundles, setBundles] = useState<CartBundleGroup[]>([]);
    /** Đã gộp giỏ vãng lai cho phiên đăng nhập này chưa (chạy đúng một lần). */
    const mergedRef = useRef(false);

    const isGuest = !isAuthenticated;

    // ---------- Nạp giỏ ----------
    const loadServerCart = useCallback(async () => {
        const cart = await salesCartCheckoutApi.cart.get();
        setCartId(cart.id);
        setItems(cart.items.map(i => ({
            id: i.productId,
            name: i.productName,
            price: i.price,
            quantity: i.quantity,
            imageUrl: i.imageUrl || undefined,
            stockQuantity: i.stockQuantity ?? 0,
            lineTotal: i.subtotal,
            variantName: i.variantName,
            variantId: i.variantId,
            bundleId: i.bundleId ?? undefined,
            bundleName: i.bundleName ?? undefined,
            lineDiscount: i.lineDiscount ?? 0,
        })));
        setBundles(mapServerBundles(cart.bundles));
        setCouponCode(cart.couponCode || null);
        setTotals({
            subtotal: cart.subtotalAmount,
            tax: cart.taxAmount,
            taxRate: cart.taxRate,
            shippingAmount: cart.shippingAmount,
            total: cart.totalAmount,
            discountAmount: cart.discountAmount,
            vatBreakdown: cart.vatBreakdown ?? [],
        });
    }, []);

    const loadGuestCart = useCallback(async (lines: GuestCartLine[]) => {
        const { lines: hydrated, dropped } = await hydrateGuestLines(lines);
        if (dropped.length > 0) {
            const kept = lines.filter(l => !dropped.includes(l.productId));
            writeGuestLines(kept);
            notify.error(`${dropped.length} sản phẩm trong giỏ không còn bán và đã được gỡ khỏi giỏ.`);
        }
        const guestBundles = await loadGuestBundleState();
        setCartId(null);
        setCouponCode(null);
        setBundles(guestBundles.groups);
        setItems([...hydrated.map(l => ({
            id: l.productId,
            name: l.name,
            price: l.price,
            quantity: l.quantity,
            imageUrl: l.imageUrl,
            stockQuantity: l.stockQuantity,
            lineTotal: l.price * l.quantity,
            variantId: l.variantId,
            variantName: l.variantName,
        })), ...guestBundles.items]);

        // Tạm tính = Σ (giá server × số lượng). Giảm giá/VAT/phí ship của khách vãng lai chỉ
        // được chốt ở bước thanh toán — FE không suy đoán, để 0 thay vì bịa số.
        const subtotal = hydrated.reduce((s, l) => s + l.price * l.quantity, 0) + guestBundles.subtotal;
        setTotals({ ...emptyTotals, subtotal, total: subtotal });
    }, []);

    const refreshCart = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (isAuthenticated) await loadServerCart();
            else await loadGuestCart(readGuestLines());
        } catch (err) {
            setError(normalizeApiError(err).message);
        } finally {
            setIsLoading(false);
            setIsReady(true);
        }
    }, [isAuthenticated, loadServerCart, loadGuestCart]);

    // Đăng nhập: đẩy giỏ vãng lai lên tài khoản TRƯỚC khi đọc giỏ server (đúng một lần/phiên).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!isAuthenticated) { mergedRef.current = false; return; }
            if (mergedRef.current) return;
            mergedRef.current = true;
            setIsLoading(true);
            try {
                const pending = readGuestLines();
                if (readGuestBundles().length > 0) {
                    await pushGuestBundlesToAccount(() => {
                        if (!cancelled) notify.error('Một combo trong giỏ không còn đủ hàng và đã được gỡ.');
                    });
                }
                if (pending.length > 0) {
                    let failed = 0;
                    await pushGuestCartToAccount(pending, () => { failed += 1; });
                    if (failed > 0 && !cancelled) {
                        notify.error(`${failed} sản phẩm trong giỏ không còn đủ hàng và đã được gỡ khỏi giỏ.`);
                    }
                }
                if (!cancelled) await loadServerCart();
                if (!cancelled) setError(null);
            } catch (err) {
                if (!cancelled) setError(normalizeApiError(err).message);
            } finally {
                if (!cancelled) { setIsLoading(false); setIsReady(true); }
            }
        })();
        return () => { cancelled = true; };
    }, [isAuthenticated, loadServerCart]);

    // Đăng xuất (hoặc chưa đăng nhập): quay về giỏ vãng lai trong localStorage.
    useEffect(() => {
        if (isAuthenticated) return;
        setCartId(null);
        setCouponCode(null);
        void refreshCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // ---------- Thao tác ----------
    const addToCart = useCallback(async (
        product: CartProductInput, quantity: number = 1, options?: AddToCartOptions,
    ): Promise<boolean> => {
        if (quantity <= 0) return false;
        setIsUpdating(true);
        try {
            if (isAuthenticated) {
                // KHÔNG gửi giá/tên — server đọc giá thật và tự kiểm tồn (W0-4).
                await salesCartCheckoutApi.cart.addItem({
                    productId: product.id, variantId: options?.variantId, quantity,
                });
                await loadServerCart();
            } else {
                await salesCartCheckoutApi.publicCart.addItem({
                    productId: product.id, productName: product.name,
                    variantId: options?.variantId, quantity,
                });
                const next = mergeGuestLine(readGuestLines(), {
                    productId: product.id, variantId: options?.variantId, quantity,
                });
                writeGuestLines(next);
                await loadGuestCart(next);
            }
            setError(null);
            if (!options?.silent) notify.success(`Đã thêm ${product.name} vào giỏ hàng`);
            return true;
        } catch (err) {
            notify.error(normalizeApiError(err).message);
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated, loadServerCart, loadGuestCart]);

    const removeFromCart = useCallback(async (productId: string) => {
        setIsUpdating(true);
        try {
            if (isAuthenticated) {
                await salesCartCheckoutApi.cart.removeItem(productId);
                await loadServerCart();
            } else {
                const next = readGuestLines().filter(l => l.productId !== productId);
                writeGuestLines(next);
                await loadGuestCart(next);
            }
            notify.success('Đã xóa sản phẩm khỏi giỏ hàng');
        } catch (err) {
            notify.error(normalizeApiError(err).message);
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated, loadServerCart, loadGuestCart]);

    const updateQuantity = useCallback(async (productId: string, quantity: number) => {
        if (quantity <= 0) { await removeFromCart(productId); return; }
        setIsUpdating(true);
        try {
            if (isAuthenticated) {
                await salesCartCheckoutApi.cart.updateQuantity(productId, quantity);
                await loadServerCart();
            } else {
                const next = readGuestLines().map(l => (l.productId === productId ? { ...l, quantity } : l));
                writeGuestLines(next);
                await loadGuestCart(next);
            }
        } catch (err) {
            notify.error(normalizeApiError(err).message);
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated, removeFromCart, loadServerCart, loadGuestCart]);

    const clearCart = useCallback(async () => {
        setIsUpdating(true);
        try {
            if (isAuthenticated) {
                await salesCartCheckoutApi.cart.clear();
                await loadServerCart();
            } else {
                writeGuestLines([]);
                writeGuestBundles([]);
                await loadGuestCart([]);
            }
        } catch (err) {
            notify.error(normalizeApiError(err).message);
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated, loadServerCart, loadGuestCart]);

    const applyCoupon = useCallback(async (code: string) => {
        if (!isAuthenticated) {
            notify.error('Vui lòng đăng nhập để áp mã giảm giá, hoặc nhập mã ở bước thanh toán.');
            return;
        }
        setIsUpdating(true);
        try {
            const result = await salesCartCheckoutApi.cart.applyCoupon(code);
            setCouponCode(code.toUpperCase());
            await loadServerCart();
            notify.success(result.message);
        } catch (err) {
            notify.error(normalizeApiError(err).message);
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated, loadServerCart]);

    const removeCoupon = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsUpdating(true);
        try {
            await salesCartCheckoutApi.cart.removeCoupon();
            setCouponCode(null);
            await loadServerCart();
            notify.success('Đã xóa mã giảm giá');
        } catch (err) {
            notify.error(normalizeApiError(err).message);
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated, loadServerCart]);

    const reloadCart = useCallback(
        () => (isAuthenticated ? loadServerCart() : loadGuestCart(readGuestLines())),
        [isAuthenticated, loadServerCart, loadGuestCart],
    );
    const bundleActions = useCartBundleActions({ isAuthenticated, items, reload: reloadCart, setIsUpdating });

    const totalQuantity = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

    const contextValue = useMemo<CartContextType>(() => ({
        items, isGuest, cartId,
        addToCart, removeFromCart, updateQuantity, clearCart,
        couponCode, discountAmount: totals.discountAmount, applyCoupon, removeCoupon,
        subtotal: totals.subtotal, tax: totals.tax, taxRate: totals.taxRate,
        vatBreakdown: totals.vatBreakdown, shippingAmount: totals.shippingAmount, total: totals.total,
        itemCount: items.length, totalQuantity,
        isLoading, isReady, isUpdating, error, refreshCart,
        bundles, ...bundleActions,
    }), [
        items, isGuest, cartId, addToCart, removeFromCart, updateQuantity, clearCart,
        couponCode, totals, applyCoupon, removeCoupon, totalQuantity,
        isLoading, isReady, isUpdating, error, refreshCart, bundles, bundleActions,
    ]);

    return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
