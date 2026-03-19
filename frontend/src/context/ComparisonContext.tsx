import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { catalogApi } from '../api/catalog';
import type { Product } from '../api/catalog';
import toast from 'react-hot-toast';

interface ComparisonItem {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  categoryId: string;
  specifications?: string;
}

interface ComparisonContextType {
  items: ComparisonItem[];
  addToComparison: (product: Product | ComparisonItem) => void;
  removeFromComparison: (productId: string) => void;
  clearComparison: () => void;
  isInComparison: (productId: string) => boolean;
  canAddMore: boolean;
  maxItems: number;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_COMPARISON_ITEMS = 4;
const STORAGE_KEY = 'product_comparison';

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ComparisonItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToComparison = useCallback((product: Product | ComparisonItem) => {
    setItems((current) => {
      // Check if already in comparison
      if (current.some((item) => item.id === product.id)) {
        toast.error('Sản phẩm đã có trong danh sách so sánh');
        return current;
      }

      // Check max items
      if (current.length >= MAX_COMPARISON_ITEMS) {
        toast.error(`Chỉ có thể so sánh tối đa ${MAX_COMPARISON_ITEMS} sản phẩm`);
        return current;
      }

      // Check same category (optional - can be removed if comparing across categories is ok)
      if (current.length > 0 && current[0].categoryId !== product.categoryId) {
        toast.error('Vui lòng so sánh các sản phẩm cùng danh mục');
        return current;
      }

      const newItem: ComparisonItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        oldPrice: product.oldPrice,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        specifications: 'specifications' in product ? product.specifications : undefined,
      };

      toast.success(`Đã thêm "${product.name}" vào so sánh`);
      return [...current, newItem];
    });
  }, []);

  const removeFromComparison = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
    toast.success('Đã xóa sản phẩm khỏi danh sách so sánh');
  }, []);

  const clearComparison = useCallback(() => {
    setItems([]);
    toast.success('Đã xóa danh sách so sánh');
  }, []);

  const isInComparison = useCallback(
    (productId: string) => items.some((item) => item.id === productId),
    [items]
  );

  const value: ComparisonContextType = {
    items,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    canAddMore: items.length < MAX_COMPARISON_ITEMS,
    maxItems: MAX_COMPARISON_ITEMS,
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
