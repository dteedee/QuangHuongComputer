import client from './client';

export interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  stockQuantity: number;
  sku: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
  product: WishlistProduct;
}

export interface WishlistResponse {
  items: WishlistItem[];
}

export const wishlistApi = {
  getWishlist: async (): Promise<WishlistResponse> => {
    const response = await client.get<WishlistResponse>('/sales/wishlist');
    return response.data;
  },

  addToWishlist: async (productId: string): Promise<{ message: string; id: string }> => {
    const response = await client.post<{ message: string; id: string }>(`/sales/wishlist/${productId}`);
    return response.data;
  },

  removeFromWishlist: async (productId: string): Promise<{ message: string }> => {
    const response = await client.delete<{ message: string }>(`/sales/wishlist/${productId}`);
    return response.data;
  },

  checkInWishlist: async (productId: string): Promise<{ inWishlist: boolean }> => {
    const response = await client.get<{ inWishlist: boolean }>(`/sales/wishlist/check/${productId}`);
    return response.data;
  },
};

export default wishlistApi;
