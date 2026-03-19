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

export type MenuLocation = 'HeaderMain' | 'HeaderTop' | 'FooterMain' | 'FooterBottom' | 'Sidebar' | 'Mobile';
export type MenuItemType = 'Custom' | 'Page' | 'Category' | 'Product' | 'Homepage' | 'Contact';

export interface MenuItem {
    id: string;
    label: string;
    url: string;
    icon?: string;
    parentId?: string;
    order: number;
    openInNewTab: boolean;
    type?: MenuItemType;
    cssClass?: string;
    pageId?: string;
    categoryId?: string;
    menuId: string;
}

export interface Menu {
    id: string;
    name: string;
    code: string;
    location: MenuLocation;
    order: number;
    cssClass?: string;
    items: MenuItem[];
}

export interface HomepageSection {
    id: string;
    sectionType: string;
    title: string;
    order: number;
    configuration?: string;
    isActive: boolean;
    cssClass?: string;
}

export const contentApi = {
    // Public
    getPosts: async (type?: 'News' | 'Promotion' | 'Article' | 'Banner' | 'Ad') => {
        const response = await client.get<Post[]>('/content/posts', { params: { type } });
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
    getMenus: async () => {
        const response = await client.get<Menu[]>('/content/menus');
        return response.data;
    },
    getMenu: async (location: MenuLocation) => {
        const response = await client.get<Menu>(`/content/menus/${location}`);
        return response.data;
    },
    getHomepageSections: async () => {
        const response = await client.get<HomepageSection[]>('/content/homepage/sections');
        return response.data;
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
        }
    },
    // Public Pages
    getPage: async (slug: string) => {
        const response = await client.get<Page>(`/content/pages/${slug}`);
        return response.data;
    }
};
