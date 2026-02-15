import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { wishlistApi } from '../api/wishlist';
import type { WishlistItem } from '../api/wishlist';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load wishlist when authenticated
  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const response = await wishlistApi.getWishlist();
      setItems(response.items || []);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.productId === productId);
  }, [items]);

  const addToWishlist = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      toast('Vui lòng đăng nhập để thêm vào yêu thích!', {
        icon: '🔐',
        duration: 3000,
      });
      return false;
    }

    try {
      await wishlistApi.addToWishlist(productId);
      await refreshWishlist();
      toast.success('Đã thêm vào danh sách yêu thích!');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể thêm vào yêu thích';
      toast.error(message);
      return false;
    }
  }, [isAuthenticated, refreshWishlist]);

  const removeFromWishlist = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      await wishlistApi.removeFromWishlist(productId);
      setItems(prev => prev.filter(item => item.productId !== productId));
      toast.success('Đã xóa khỏi danh sách yêu thích!');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể xóa khỏi yêu thích';
      toast.error(message);
      return false;
    }
  }, [isAuthenticated]);

  const toggleWishlist = useCallback(async (productId: string): Promise<boolean> => {
    if (isInWishlist(productId)) {
      return removeFromWishlist(productId);
    } else {
      return addToWishlist(productId);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

export default WishlistContext;
