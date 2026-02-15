import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_ITEMS = 10;

interface RecentlyViewedItem {
  productId: string;
  viewedAt: number;
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items: RecentlyViewedItem[] = JSON.parse(stored);
        // Sort by viewedAt descending and extract productIds
        const productIds = items
          .sort((a, b) => b.viewedAt - a.viewedAt)
          .map(item => item.productId);
        setRecentlyViewed(productIds);
      }
    } catch (error) {
      console.error('Failed to load recently viewed products:', error);
    }
  }, []);

  // Add a product to recently viewed
  const addToRecentlyViewed = useCallback((productId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let items: RecentlyViewedItem[] = stored ? JSON.parse(stored) : [];

      // Remove if already exists
      items = items.filter(item => item.productId !== productId);

      // Add to the beginning
      items.unshift({
        productId,
        viewedAt: Date.now(),
      });

      // Keep only the last MAX_ITEMS
      items = items.slice(0, MAX_ITEMS);

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

      // Update state
      setRecentlyViewed(items.map(item => item.productId));
    } catch (error) {
      console.error('Failed to save recently viewed product:', error);
    }
  }, []);

  // Remove a product from recently viewed
  const removeFromRecentlyViewed = useCallback((productId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let items: RecentlyViewedItem[] = JSON.parse(stored);
        items = items.filter(item => item.productId !== productId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        setRecentlyViewed(items.map(item => item.productId));
      }
    } catch (error) {
      console.error('Failed to remove recently viewed product:', error);
    }
  }, []);

  // Clear all recently viewed
  const clearRecentlyViewed = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentlyViewed([]);
    } catch (error) {
      console.error('Failed to clear recently viewed products:', error);
    }
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
  };
}

export default useRecentlyViewed;
