import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Product } from '../api/catalog';
import toast from 'react-hot-toast';

import { salesApi, type CartDto } from '../api/sales';
import { useAuth } from './AuthContext';

interface CartItem extends Partial<Product> {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
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

    // Loading state
    isLoading: boolean;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [couponCode, setCouponCode] = useState<string | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [shippingAmount, setShippingAmount] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(0.1); // 10% default
    const [isLoading, setIsLoading] = useState(false);

    // Load cart from backend when user is authenticated
    useEffect(() => {
        if (isAuthenticated) {
            refreshCart();
        }
    }, [isAuthenticated]);

    const refreshCart = async () => {
        if (!isAuthenticated) return;
        try {
            setIsLoading(true);
            const cart = await salesApi.cart.get();

            // Convert backend cart items to frontend format
            const cartItems: CartItem[] = cart.items.map(item => ({
                id: item.productId,
                name: item.productName,
                price: item.price,
                quantity: item.quantity,
                // Add placeholder values for Product interface fields
                description: '',
                imageUrl: item.imageUrl || '',
                stock: 0,
                categoryId: '',
                category: { id: '', name: '' },
                sku: '',
                status: 'InStock' as const,
                stockQuantity: 99,
                isActive: true,
                createdAt: new Date().toISOString()
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
    };

    const addToCart = async (product: Product, quantity: number = 1) => {
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
            return;
        }

        try {
            await salesApi.cart.addItem({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: quantity
            });

            // Optimistically update UI
            setItems(prev => {
                const existing = prev.find(item => item.id === product.id);
                if (existing) {
                    return prev.map(item =>
                        item.id === product.id
                            ? { ...item, quantity: item.quantity + quantity }
                            : item
                    );
                }
                return [...prev, { ...product, quantity: quantity }];
            });

            toast.success(`Đã thêm ${product.name} vào giỏ hàng`, {
                style: { borderRadius: '15px' }
            });
        } catch (error: any) {
            console.error('Add to cart failed:', error);
            const errorMessage = error?.response?.data?.Error || error?.response?.data?.error || 'Không thể thêm sản phẩm vào giỏ hàng';
            toast.error(errorMessage);
        }
    };

    const removeFromCart = async (productId: string) => {
        if (!isAuthenticated) return;

        try {
            await salesApi.cart.removeItem(productId);
            setItems(prev => prev.filter(item => item.id !== productId));
            toast.success('Đã xóa sản phẩm khỏi giỏ hàng');
        } catch (error) {
            toast.error('Không thể xóa sản phẩm');
        }
    };

    const updateQuantity = async (productId: string, quantity: number) => {
        if (!isAuthenticated) return;

        if (quantity <= 0) {
            await removeFromCart(productId);
            return;
        }

        try {
            await salesApi.cart.updateQuantity(productId, quantity);
            setItems(prev =>
                prev.map(item =>
                    item.id === productId ? { ...item, quantity } : item
                )
            );
        } catch (error) {
            toast.error('Không thể cập nhật số lượng');
        }
    };

    const clearCart = async () => {
        if (!isAuthenticated) return;

        try {
            await salesApi.cart.clear();
            setItems([]);
            setCouponCode(null);
            setDiscountAmount(0);
        } catch (error) {
            toast.error('Không thể xóa giỏ hàng');
        }
    };

    const applyCoupon = async (code: string) => {
        if (!isAuthenticated) return;

        try {
            const result = await salesApi.cart.applyCoupon(code);
            setCouponCode(code.toUpperCase());
            setDiscountAmount(result.discount);
            toast.success(result.message, {
                icon: '🎉',
                style: { borderRadius: '15px' }
            });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Mã giảm giá không hợp lệ');
        }
    };

    const removeCoupon = async () => {
        if (!isAuthenticated) return;

        try {
            await salesApi.cart.removeCoupon();
            setCouponCode(null);
            setDiscountAmount(0);
            toast.success('Đã xóa mã giảm giá');
        } catch (error) {
            toast.error('Không thể xóa mã giảm giá');
        }
    };

    // Calculate pricing
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = (subtotal - discountAmount) * taxRate;
    const total = subtotal - discountAmount + tax + shippingAmount;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const checkout = async () => {
        if (items.length === 0) return;
        const checkoutItems = items.map(item => ({
            productId: item.id,
            productName: item.name,
            unitPrice: item.price,
            quantity: item.quantity
        }));
        try {
            await salesApi.orders.create({ items: checkoutItems });
            await clearCart();
            toast.success('Đặt hàng thành công! Cảm ơn bạn đã mua sắm.', {
                duration: 5000,
                icon: '🎉',
                style: { borderRadius: '15px', fontWeight: 'bold' }
            });
        } catch (error) {
            toast.error('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
        }
    };

    return (
        <CartContext.Provider value={{
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
            isLoading,
            refreshCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};

