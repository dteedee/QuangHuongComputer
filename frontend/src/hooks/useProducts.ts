import { useQuery } from '@tanstack/react-query';
import { catalogApi, type Product } from '../api/catalog';

export type { Product };

export const useProducts = (categoryId?: string) => {
    return useQuery({
        queryKey: ['products', categoryId],
        queryFn: async () => {
            const response = await catalogApi.getProducts({ pageSize: 50 });
            // Filter products by category if categoryId is provided
            if (categoryId) {
                return response.products.filter(p => p.categoryId === categoryId);
            }
            return response.products;
        }
    });
};
