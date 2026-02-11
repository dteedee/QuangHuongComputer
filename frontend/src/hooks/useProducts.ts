import { useQuery } from '@tanstack/react-query';
import { catalogApi, type Product } from '../api/catalog';

export type { Product };

export const useProducts = (categoryId?: string) => {
    return useQuery({
        queryKey: ['products', categoryId],
        queryFn: async () => {
            const response = await catalogApi.getProducts();
            // Filter products by category if categoryId is provided
            if (categoryId) {
                return response.products.filter(p => p.categoryId === categoryId);
            }
            // Also filter out products from inactive categories if no specific categoryId
            return response.products.filter(p => {
                // This assumes the product might have category info
                // In a real implementation, you might need to fetch categories separately
                return true; // Placeholder - will be handled in HomePage
            });
        }
    });
};
