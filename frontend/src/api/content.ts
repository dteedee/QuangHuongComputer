import client from './client';

export interface Post {
    id: string;
    title: string;
    slug: string;
    body: string;
    type: 'Article' | 'Page' | 'Banner';
    isPublished: boolean;
    publishedAt?: string;
    createdAt: string;
}

export interface Coupon {
    id: string;
    code: string;
    description: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    minOrderAmount: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
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
        getPosts: async () => {
            const response = await client.get<Post[]>('/content/admin/posts');
            return response.data;
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
        getCoupons: async () => {
            const response = await client.get<Coupon[]>('/content/admin/coupons');
            return response.data;
        },
        createCoupon: async (data: any) => {
            const response = await client.post<Coupon>('/content/admin/coupons', data);
            return response.data;
        },
        deleteCoupon: async (id: string) => {
            const response = await client.delete(`/content/admin/coupons/${id}`);
            return response.data;
        }
    }
};
