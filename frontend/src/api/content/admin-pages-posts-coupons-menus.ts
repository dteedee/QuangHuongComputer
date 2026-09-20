/**
 * Content — ADMIN surface: seed, pages, posts, coupons, menus, homepage
 * sections. Split out of `api/content.ts`'s old `admin` object (W1-9, step
 * 7c); moved verbatim. Composed into `contentAdminApi` by `admin.ts`.
 * (Flash sales + contact messages live in the sibling
 * `admin-flash-sales-contact-messages.ts` — this file was already 260+ lines
 * as one `admin` object, so it is split further than the 3 spec-named files
 * to respect the 200-LOC guideline; `admin.ts` still owns the public name.)
 */
import client from '../client';
import type { Coupon, HomepageSection, Menu, MenuItem, Page, Post } from './types';

export const contentAdminCoreApi = {
    // Seed
    seed: async () => {
        const response = await client.post('/content/seed');
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
    // BE chặn xóa page != PageType.Custom (BadRequest { error })
    deletePage: async (id: string) => {
        const response = await client.delete<void>(`/content/admin/pages/${id}`);
        return response.data;
    },

    // Posts
    getPosts: async (params?: { status?: string; category?: string; search?: string }) => {
        const response = await client.get<Post[]>('/content/admin/posts', { params });
        return response.data;
    },
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
    publishPost: async (id: string, isPublished: boolean) => {
        const response = await client.put<Post>(`/content/admin/posts/${id}`, { isPublished });
        return response.data;
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
        const response = await client.post('/content/admin/coupons/validate', { code, orderAmount });
        return response.data;
    },

    // Menus
    getMenus: async () => {
        const response = await client.get<Menu[]>('/content/admin/menus');
        return response.data;
    },
    createMenu: async (data: any) => {
        const response = await client.post<Menu>('/content/admin/menus', data);
        return response.data;
    },
    updateMenu: async (id: string, data: any) => {
        const response = await client.put<Menu>(`/content/admin/menus/${id}`, data);
        return response.data;
    },
    deleteMenu: async (id: string) => {
        const response = await client.delete(`/content/admin/menus/${id}`);
        return response.data;
    },

    // Menu Items
    createMenuItem: async (menuId: string, data: any) => {
        const response = await client.post<MenuItem>(`/content/admin/menus/${menuId}/items`, data);
        return response.data;
    },
    updateMenuItem: async (menuId: string, itemId: string, data: any) => {
        const response = await client.put<MenuItem>(`/content/admin/menus/${menuId}/items/${itemId}`, data);
        return response.data;
    },
    reorderMenuItems: async (menuId: string, items: { id: string; displayOrder: number }[]) => {
        const response = await client.put(`/content/admin/menus/${menuId}/items/reorder`, { items });
        return response.data;
    },
    deleteMenuItem: async (menuId: string, itemId: string) => {
        const response = await client.delete(`/content/admin/menus/${menuId}/items/${itemId}`);
        return response.data;
    },

    // Homepage Sections
    getHomepageSections: async () => {
        const response = await client.get<HomepageSection[]>('/content/admin/homepage/sections');
        return response.data;
    },
    createHomepageSection: async (data: any) => {
        const response = await client.post<HomepageSection>('/content/admin/homepage/sections', data);
        return response.data;
    },
    updateHomepageSection: async (id: string, data: any) => {
        const response = await client.put<HomepageSection>(`/content/admin/homepage/sections/${id}`, data);
        return response.data;
    },
    reorderHomepageSections: async (sections: { id: string; displayOrder: number }[]) => {
        const response = await client.put('/content/admin/homepage/sections/reorder', { sections });
        return response.data;
    },
    deleteHomepageSection: async (id: string) => {
        const response = await client.delete(`/content/admin/homepage/sections/${id}`);
        return response.data;
    },
};
