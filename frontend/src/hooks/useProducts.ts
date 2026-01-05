import { useQuery } from '@tanstack/react-query';
import { catalogApi, type Product } from '../api/catalog';

export type { Product };

export const useProducts = () => {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await catalogApi.getProducts();
            return response.products;
        }
    });
};
