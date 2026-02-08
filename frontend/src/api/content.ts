import client from './client';

export interface Post {
    id: string;
    title: string;
    slug: string;
    content: string;
    featuredImage?: string;
    category?: string;
    tags?: string[];
    type: 'Article' | 'News' | 'Promotion' | 'Banner' | 'Ad';
    isPublished: boolean;
    publishedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Coupon {
    id: string;
    code: string;
    description: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    minOrderAmount: number;
    maxDiscount?: number;
    usageLimit?: number;
    usageCount?: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export const contentApi = {
    // Public
    getPosts: async () => {
        const response = await client.get<Post[]>('/content/posts');
        return response.data;
    },
    getPost: async (slug: string) => {
        const response = await client.get<Post>(`/content/posts/${slug}`);
        return response.data;
    },
    getCoupon: async (code: string, orderAmount?: number) => {
        const response = await client.get<Coupon>(`/content/coupons/${code}`, { params: { orderAmount } });
        return response.data;
    },

    // Admin
    admin: {
        // Posts
        getPosts: async (params?: { status?: string; category?: string; search?: string }) => {
            const response = await client.get<Post[]>('/content/admin/posts', { params });
            return response.data;
        },
        // NOTE: Backend doesn't have GET by id endpoint
        getPost: async (_id: string) => {
            throw new Error('Get post by ID endpoint not implemented in backend');
        },
        createPost: async (data: any) => {
            const response = await client.post<Post>('/content/admin/posts', data);
            return response.data;
        },
        updatePost: async (id: string, data: any) => {
            const response = await client.put<Post>(`/content/admin/posts/${id}`, data);
            return response.data;
        },
        deletePost: async (id: string) => {
            const response = await client.delete(`/content/admin/posts/${id}`);
            return response.data;
        },
        // NOTE: Backend doesn't have publish endpoint
        publishPost: async (_id: string, _isPublished: boolean) => {
            throw new Error('Publish post endpoint not implemented in backend');
        },

        // Coupons
        getCoupons: async (params?: { status?: string; search?: string }) => {
            const response = await client.get<Coupon[]>('/content/admin/coupons', { params });
            return response.data;
        },
        // NOTE: Backend doesn't have GET by id endpoint
        getCoupon: async (_id: string) => {
            throw new Error('Get coupon by ID endpoint not implemented in backend');
        },
        createCoupon: async (data: any) => {
            const response = await client.post<Coupon>('/content/admin/coupons', data);
            return response.data;
        },
        // NOTE: Backend doesn't have PUT endpoint
        updateCoupon: async (_id: string, _data: any) => {
            throw new Error('Update coupon endpoint not implemented in backend');
        },
        deleteCoupon: async (id: string) => {
            const response = await client.delete(`/content/admin/coupons/${id}`);
            return response.data;
        },
        // NOTE: Backend doesn't have validate endpoint
        validateCoupon: async (_code: string, _orderAmount: number) => {
            throw new Error('Validate coupon endpoint not implemented in backend');
        }
    }
};
