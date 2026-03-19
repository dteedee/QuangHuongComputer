import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Product } from '../api/catalog';
import toast from 'react-hot-toast';
import { salesApi } from '../api/sales';
import { useAuth } from './AuthContext';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
    Error?: string;
    error?: string;
}

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number) => Promise<void>;
    removeFromCart: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    checkout: () => Promise<void>;

    // Coupon functionality
    couponCode: string | null;
    discountAmount: number;
    applyCoupon: (code: string) => Promise<void>;
    removeCoupon: () => Promise<void>;

    // Pricing
    subtotal: number;
    tax: number;
    shippingAmount: number;
    total: number;
    itemCount: number;
    totalQuantity: number;

    // Loading states
    isLoading: boolean;
    isUpdating: boolean;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [couponCode, setCouponCode] = useState<string | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [shippingAmount, setShippingAmount] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(0.1);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Reset cart when user logs out
    useEffect(() => {
        if (!isAuthenticated) {
            setItems([]);
            setCouponCode(null);
            setDiscountAmount(0);
            setShippingAmount(0);
        }
    }, [isAuthenticated]);

    const refreshCart = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);
            const cart = await salesApi.cart.get();

            const cartItems: CartItem[] = cart.items.map(item => ({
                id: item.productId,
                name: item.productName,
                price: item.price,
                quantity: item.quantity,
                imageUrl: item.imageUrl || ''
            }));

            setItems(cartItems);
            setCouponCode(cart.couponCode || null);
            setDiscountAmount(cart.discountAmount);
            setShippingAmount(cart.shippingAmount);
            setTaxRate(cart.taxRate);
        } catch (error) {
            console.error('Failed to load cart:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Load cart when user authenticates
    useEffect(() => {
        if (isAuthenticated) {
            refreshCart();
        }
    }, [isAuthenticated, refreshCart]);

    const addToCart = useCallback(async (product: Product, quantity: number = 1) => {
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
            return;
        }

        setIsUpdating(true);
        try {
            await salesApi.cart.addItem({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity
            });

            await refreshCart();

            toast.success(`Đã thêm ${product.name} vào giỏ hàng`, {
                style: { borderRadius: '15px' }
            });
        } catch (err) {
            const error = err as AxiosError<ApiErrorResponse>;
            const errorMessage = error?.response?.data?.Error || error?.response?.data?.error || 'Không thể thêm sản phẩm vào giỏ hàng';
            toast.error(errorMessage);
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated, refreshCart]);

    const removeFromCart = useCallback(async (productId: string) => {
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để xóa sản phẩm');
            return;
        }

        // Optimistic update
        const previousItems = items;
        setItems(prev => prev.filter(item => item.id !== productId));

        try {
            await salesApi.cart.removeItem(productId);
            toast.success('Đã xóa sản phẩm khỏi giỏ hàng');
        } catch (err) {
            // Rollback on error
            setItems(previousItems);
            const error = err as AxiosError<ApiErrorResponse>;
            const errorMessage = error?.response?.data?.Error || error?.response?.data?.error || 'Không thể xóa sản phẩm';
            toast.error(errorMessage);
        }
    }, [isAuthenticated, items]);

    const updateQuantity = useCallback(async (productId: string, quantity: number) => {
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để cập nhật số lượng');
            return;
        }

        if (quantity <= 0) {
            await removeFromCart(productId);
            return;
        }

        // Optimistic update
        const previousItems = items;
        setItems(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, quantity } : item
            )
        );

        try {
            await salesApi.cart.updateQuantity(productId, quantity);
        } catch (err) {
            // Rollback on error
            setItems(previousItems);
            const error = err as AxiosError<ApiErrorResponse>;
            const errorMessage = error?.response?.data?.Error || error?.response?.data?.error || 'Không thể cập nhật số lượng';
            toast.error(errorMessage);
        }
    }, [isAuthenticated, items, removeFromCart]);

    const clearCart = useCallback(async () => {
        if (!isAuthenticated) return;

        const previousItems = items;
        const previousCoupon = couponCode;
        const previousDiscount = discountAmount;

        // Optimistic update
        setItems([]);
        setCouponCode(null);
        setDiscountAmount(0);

        try {
            await salesApi.cart.clear();
        } catch {
            // Rollback on error
            setItems(previousItems);
            setCouponCode(previousCoupon);
            setDiscountAmount(previousDiscount);
            toast.error('Không thể xóa giỏ hàng');
        }
    }, [isAuthenticated, items, couponCode, discountAmount]);

    const applyCoupon = useCallback(async (code: string) => {
        if (!isAuthenticated) return;

        setIsUpdating(true);
        try {
            const result = await salesApi.cart.applyCoupon(code);
            setCouponCode(code.toUpperCase());
            setDiscountAmount(result.discount);
            toast.success(result.message, {
                icon: '🎉',
                style: { borderRadius: '15px' }
            });
        } catch (err) {
            const error = err as AxiosError<ApiErrorResponse>;
            const errorMessage = error?.response?.data?.Error || error?.response?.data?.error || 'Mã giảm giá không hợp lệ';
            toast.error(errorMessage);
        } finally {
            setIsUpdating(false);
        }
    }, [isAuthenticated]);

    const removeCoupon = useCallback(async () => {
        if (!isAuthenticated) return;

        const previousCoupon = couponCode;
        const previousDiscount = discountAmount;

        // Optimistic update
        setCouponCode(null);
        setDiscountAmount(0);

        try {
            await salesApi.cart.removeCoupon();
            toast.success('Đã xóa mã giảm giá');
        } catch {
            // Rollback on error
            setCouponCode(previousCoupon);
            setDiscountAmount(previousDiscount);
            toast.error('Không thể xóa mã giảm giá');
        }
    }, [isAuthenticated, couponCode, discountAmount]);

    const checkout = useCallback(async () => {
        if (items.length === 0) return;

        setIsUpdating(true);
        try {
            const checkoutItems = items.map(item => ({
                productId: item.id,
                productName: item.name,
                unitPrice: item.price,
                quantity: item.quantity
            }));

            await salesApi.orders.create({ items: checkoutItems });
            await clearCart();

            toast.success('Đặt hàng thành công! Cảm ơn bạn đã mua sắm.', {
                duration: 5000,
                icon: '🎉',
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
        } catch {
            toast.error('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
        } finally {
            setIsUpdating(false);
        }
    }, [items, clearCart]);

    // Memoized calculations
    const subtotal = useMemo(() =>
        items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [items]
    );

    const tax = useMemo(() =>
        Math.max(0, (subtotal - discountAmount) * taxRate),
        [subtotal, discountAmount, taxRate]
    );

    const total = useMemo(() =>
        Math.max(0, subtotal - discountAmount + tax + shippingAmount),
        [subtotal, discountAmount, tax, shippingAmount]
    );

    const itemCount = items.length;

    const totalQuantity = useMemo(() =>
        items.reduce((sum, item) => sum + item.quantity, 0),
        [items]
    );

    const contextValue = useMemo(() => ({
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        checkout,
        couponCode,
        discountAmount,
        applyCoupon,
        removeCoupon,
        subtotal,
        tax,
        shippingAmount,
        total,
        itemCount,
        totalQuantity,
        isLoading,
        isUpdating,
        refreshCart
    }), [
        items, addToCart, removeFromCart, updateQuantity, clearCart, checkout,
        couponCode, discountAmount, applyCoupon, removeCoupon,
        subtotal, tax, shippingAmount, total, itemCount, totalQuantity,
        isLoading, isUpdating, refreshCart
    ]);

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
