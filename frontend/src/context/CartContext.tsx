import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Product } from '../api/catalog';
import toast from 'react-hot-toast';

import { salesApi } from '../api/sales';

interface CartItem extends Product {
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    checkout: () => Promise<void>;
    total: number;
    itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>([]);

    const addToCart = (product: Product) => {
        setItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        toast.success(`Đã thêm ${product.name} vào giỏ hàng`, {
            style: { borderRadius: '15px' }
        });
    };

    const removeFromCart = (productId: string) => {
        setItems(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setItems(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => setItems([]);

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
            await salesApi.checkout({ items: checkoutItems });
            clearCart();
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
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, checkout, total, itemCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};

