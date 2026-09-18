/**
 * Every read the PDP needs, as TanStack Query hooks on the W1-13 key factory.
 *
 * One rule: nothing here invents data. When an endpoint has nothing to say the
 * hook returns an empty shape and the component renders its empty state — no
 * placeholder specs, no fabricated warranty months, no fake reviews.
 */
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { catalogPublicProductApi } from '../../api/catalog/public-product';
import type {
    EffectiveReturnPolicy,
    EffectiveWarrantyPolicy,
    PublicProductDetail,
} from '../../api/catalog/public-product';
import type { Product, ProductReview } from '../../api/catalog/types';
import { queryKeys } from '../../lib/query-keys';

const FIVE_MIN = 5 * 60 * 1000;

/** HTTP status of a failed query, when the failure came from the API at all. */
export function statusOf(error: unknown): number | undefined {
    return (error as AxiosError | undefined)?.response?.status;
}

/** `GET /products/by-slug/{slug}?include=media,specs,variants` (or by GUID). */
export function useProductDetail(slugOrId: string) {
    return useQuery<PublicProductDetail>({
        queryKey: queryKeys.catalog.detail(slugOrId),
        queryFn: () => catalogPublicProductApi.getProductDetail(slugOrId),
        enabled: Boolean(slugOrId),
        // A 404 is an answer, not a hiccup — retrying it four times only makes
        // the not-found state appear seconds late.
        retry: (failureCount, error) => statusOf(error) !== 404 && failureCount < 2,
        staleTime: 60 * 1000,
    });
}

export function useRelatedProducts(productId?: string) {
    return useQuery<Product[]>({
        queryKey: [...queryKeys.catalog.all, 'related', productId ?? ''],
        queryFn: () => catalogPublicProductApi.getRelatedProducts(productId!, 8),
        enabled: Boolean(productId),
        staleTime: FIVE_MIN,
    });
}

export interface ReviewPage {
    total: number;
    reviews: ProductReview[];
}

export function useProductReviews(productId: string | undefined, page: number, pageSize = 5) {
    return useQuery<ReviewPage>({
        queryKey: [...queryKeys.catalog.all, 'reviews', productId ?? '', page, pageSize],
        queryFn: async () => {
            const data = await catalogPublicProductApi.getProductReviews(productId!, { page, pageSize });
            // The endpoint has shipped both shapes over its life; accept either.
            if (Array.isArray(data)) return { total: data.length, reviews: data };
            return { total: data?.total ?? 0, reviews: Array.isArray(data?.reviews) ? data.reviews : [] };
        },
        enabled: Boolean(productId),
        staleTime: 60 * 1000,
    });
}

export interface ReviewStats {
    totalReviews: number;
    averageRating: number;
    ratingCounts: Record<number, number>;
}

/** Approved-only aggregate — the distribution must not be computed from one page. */
export function useReviewStats(productId?: string) {
    return useQuery<ReviewStats>({
        queryKey: [...queryKeys.catalog.all, 'review-stats', productId ?? ''],
        queryFn: async () => {
            const d = await catalogPublicProductApi.getProductReviewStats(productId!);
            return {
                totalReviews: d.totalReviews ?? 0,
                averageRating: d.averageRating ?? 0,
                ratingCounts: (d.ratingCounts ?? {}) as unknown as Record<number, number>,
            };
        },
        enabled: Boolean(productId),
        staleTime: 60 * 1000,
    });
}

export interface ProductPolicy {
    warranty: EffectiveWarrantyPolicy | null;
    returns: EffectiveReturnPolicy | null;
}

/**
 * D08 — the warranty months and the return/exchange windows come from the two
 * public effective-policy endpoints. A number typed into a component is a bug.
 */
export function useProductPolicy(productId?: string) {
    return useQuery<ProductPolicy>({
        queryKey: [...queryKeys.catalog.all, 'policy', productId ?? ''],
        queryFn: async () => {
            const [warranty, returns] = await Promise.all([
                catalogPublicProductApi.getEffectiveWarrantyPolicy(productId!).catch(() => null),
                catalogPublicProductApi.getEffectiveReturnPolicy(productId!).catch(() => null),
            ]);
            return { warranty, returns };
        },
        enabled: Boolean(productId),
        staleTime: FIVE_MIN,
    });
}
