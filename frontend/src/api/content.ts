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

export interface Page {
    id: string;
    title: string;
    slug: string;
    content: string;
    type: 'Custom' | 'About' | 'Contact' | 'FAQ' | 'Terms' | 'Privacy' | 'Shipping' | 'Returns' | 'Warranty';
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

export interface FlashSale {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    bannerImageUrl?: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    maxDiscount?: number;
    startTime: string;
    endTime: string;
    productIds?: string;
    categoryIds?: string;
    applyToAllProducts: boolean;
    maxQuantityPerOrder?: number;
    totalQuantityLimit?: number;
    soldQuantity: number;
    displayOrder: number;
    status: 'Scheduled' | 'Active' | 'Ended' | 'Cancelled';
    badgeText?: string;
    badgeColor?: string;
    isActive: boolean;
    isCurrentlyActive?: boolean;
    timeRemaining?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateFlashSaleDto {
    name: string;
    description: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    startTime: string;
    endTime: string;
    maxDiscount?: number;
    imageUrl?: string;
    bannerImageUrl?: string;
    productIds?: string;
    categoryIds?: string;
    applyToAllProducts?: boolean;
    maxQuantityPerOrder?: number;
    totalQuantityLimit?: number;
    displayOrder?: number;
    badgeText?: string;
    badgeColor?: string;
}

// Contact Message Types
export interface ContactMessage {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
    subject: string;
    message: string;
    status: 'New' | 'Read' | 'Replied' | 'Archived';
    adminNotes?: string;
    repliedBy?: string;
    repliedAt?: string;
    ipAddress?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateContactMessageDto {
    fullName: string;
    phone: string;
    email?: string;
    subject: string;
    message: string;
}

export const contentApi = {
    // Public
    getPosts: async (type?: 'News' | 'Promotion' | 'Article' | 'Banner' | 'Ad') => {
        const response = await client.get<Post[]>('/content/posts', { params: { type } });
        return response.data;
    },

    // Contact (Public)
    submitContact: async (data: CreateContactMessageDto) => {
        const response = await client.post<{ message: string; id: string }>('/content/contact', data);
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

    // Flash Sales (Public)
    flashSales: {
        getActive: async () => {
            const response = await client.get<FlashSale[]>('/content/flash-sales/active');
            return response.data;
        },
        getUpcoming: async () => {
            const response = await client.get<FlashSale[]>('/content/flash-sales/upcoming');
            return response.data;
        },
        getById: async (id: string) => {
            const response = await client.get<FlashSale>(`/content/flash-sales/${id}`);
            return response.data;
        },
    },

    // Admin
    admin: {
        // Seed
        seed: async () => {
            const response = await client.post('/content/admin/seed');
            return response.data;
        },

        // Pages
        getPages: async () => {
            const response = await client.get<Page[]>('/content/admin/pages');
            return response.data;
        },
        getPage: async (id: string) => {
            const response = await client.get<Page>(`/content/admin/pages/${id}`);
            return response.data;
        },
        createPage: async (data: any) => {
            const response = await client.post<Page>('/content/admin/pages', data);
            return response.data;
        },
        updatePage: async (id: string, data: any) => {
            const response = await client.put<Page>(`/content/admin/pages/${id}`, data);
            return response.data;
        },

        // Posts
        getPosts: async (params?: { status?: string; category?: string; search?: string }) => {
            const response = await client.get<Post[]>('/content/admin/posts', { params });
            return response.data;
        },
        // NOTE: Backend doesn't have GET by id endpoint
        getPost: async (id: string) => {
            const response = await client.get<Post>(`/content/admin/posts/${id}`);
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
        // NOTE: Backend doesn't have publish endpoint
        publishPost: async (_id: string, _isPublished: boolean) => {
            throw new Error('Publish post endpoint not implemented in backend');
        },

        // Coupons
        getCoupons: async (params?: { status?: string; search?: string }) => {
            const response = await client.get<Coupon[]>('/content/admin/coupons', { params });
            return response.data;
        },
        getCoupon: async (id: string) => {
            const response = await client.get<Coupon>(`/content/admin/coupons/${id}`);
            return response.data;
        },
        createCoupon: async (data: any) => {
            const response = await client.post<Coupon>('/content/admin/coupons', data);
            return response.data;
        },
        updateCoupon: async (id: string, data: any) => {
            const response = await client.put<Coupon>(`/content/admin/coupons/${id}`, data);
            return response.data;
        },
        deleteCoupon: async (id: string) => {
            const response = await client.delete(`/content/admin/coupons/${id}`);
            return response.data;
        },
        validateCoupon: async (code: string, orderAmount: number) => {
            const response = await client.post('/content/coupons/validate', { code, orderAmount });
            return response.data;
        },

        // Flash Sales
        flashSales: {
            getAll: async (status?: string) => {
                const response = await client.get<FlashSale[]>('/content/admin/flash-sales', { params: { status } });
                return response.data;
            },
            getById: async (id: string) => {
                const response = await client.get<FlashSale>(`/content/admin/flash-sales/${id}`);
                return response.data;
            },
            create: async (data: CreateFlashSaleDto) => {
                const response = await client.post<{ id: string; name: string; status: string; message: string }>(
                    '/content/admin/flash-sales',
                    data
                );
                return response.data;
            },
            update: async (id: string, data: Partial<CreateFlashSaleDto>) => {
                const response = await client.put<{ message: string; flashSale: FlashSale }>(
                    `/content/admin/flash-sales/${id}`,
                    data
                );
                return response.data;
            },
            activate: async (id: string) => {
                const response = await client.post<{ message: string; status: string }>(
                    `/content/admin/flash-sales/${id}/activate`
                );
                return response.data;
            },
            deactivate: async (id: string) => {
                const response = await client.post<{ message: string; status: string }>(
                    `/content/admin/flash-sales/${id}/deactivate`
                );
                return response.data;
            },
            delete: async (id: string) => {
                const response = await client.delete<{ message: string }>(
                    `/content/admin/flash-sales/${id}`
                );
                return response.data;
            },
            getStats: async () => {
                const response = await client.get<{
                    total: number;
                    active: number;
                    scheduled: number;
                    ended: number;
                    totalSold: number;
                }>('/content/admin/flash-sales/stats');
                return response.data;
            },
        },

        // Contact Messages (Admin)
        contactMessages: {
            getAll: async (params?: { status?: string; page?: number; pageSize?: number }) => {
                const response = await client.get<{
                    messages: ContactMessage[];
                    total: number;
                    page: number;
                    pageSize: number;
                    totalPages: number;
                }>('/content/admin/contact-messages', { params });
                return response.data;
            },
            getById: async (id: string) => {
                const response = await client.get<ContactMessage>(`/content/admin/contact-messages/${id}`);
                return response.data;
            },
            markAsRead: async (id: string) => {
                const response = await client.post<{ message: string; status: string }>(
                    `/content/admin/contact-messages/${id}/read`
                );
                return response.data;
            },
            markAsReplied: async (id: string, notes?: string) => {
                const response = await client.post<{ message: string; status: string }>(
                    `/content/admin/contact-messages/${id}/reply`,
                    { notes }
                );
                return response.data;
            },
            addNotes: async (id: string, notes: string) => {
                const response = await client.post<{ message: string }>(
                    `/content/admin/contact-messages/${id}/notes`,
                    { notes }
                );
                return response.data;
            },
            archive: async (id: string) => {
                const response = await client.post<{ message: string; status: string }>(
                    `/content/admin/contact-messages/${id}/archive`
                );
                return response.data;
            },
            delete: async (id: string) => {
                const response = await client.delete<{ message: string }>(
                    `/content/admin/contact-messages/${id}`
                );
                return response.data;
            },
            getStats: async () => {
                const response = await client.get<{
                    total: number;
                    new: number;
                    read: number;
                    replied: number;
                    archived: number;
                }>('/content/admin/contact-messages/stats');
                return response.data;
            },
        }
    },
    // Public Pages
    getPage: async (slug: string) => {
        const response = await client.get<Page>(`/content/pages/${slug}`);
        return response.data;
    }
};
