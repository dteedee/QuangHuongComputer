/**
 * Content — storefront PUBLIC surface (posts, pages, menus, coupons lookup,
 * homepage sections, active flash sales, contact form). Split out of the old
 * flat `api/content.ts` (W1-9, step 7c). Functions moved verbatim;
 * `api/content.ts` re-exports them.
 */
import client from '../client';
import type {
    Coupon,
    CreateContactMessageDto,
    FlashSale,
    HomepageSection,
    Menu,
    MenuLocation,
    Page,
    Post,
} from './types';

export const contentPublicApi = {
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
    getMenus: async (location?: MenuLocation) => {
        const response = await client.get<Menu[]>('/content/menus', {
            params: location ? { location } : undefined
        });
        return response.data;
    },
    getMenu: async (location: MenuLocation) => {
        const response = await client.get<Menu[]>('/content/menus', {
            params: { location }
        });
        return response.data.length > 0 ? response.data[0] : null;
    },
    getHomepageSections: async () => {
        const response = await client.get<HomepageSection[]>('/content/homepage/sections');
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

    // Public Pages
    getPage: async (slug: string) => {
        const response = await client.get<Page>(`/content/pages/${slug}`);
        return response.data;
    },
};
