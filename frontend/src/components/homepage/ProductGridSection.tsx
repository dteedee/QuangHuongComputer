import React, { useMemo, useState } from 'react';
import { ProductCard } from '../ProductCard';
import { ProductSectionHeader } from '../product-section-header';
import { useProducts } from '../../hooks/useProducts';

interface ProductGridSectionProps {
    title: string;
    config: {
        categoryId?: string;
        tag?: string;
        limit?: number;
        icon?: string;
        showViewAll?: boolean;
    };
}

/** Product section theo pattern hacom.vn: title UPPERCASE + brand pills + "Xem tất cả →" + grid 6 cột desktop. */
export const ProductGridSection: React.FC<ProductGridSectionProps> = ({ title, config }) => {
    const { data: allProducts, isLoading } = useProducts();
    const { categoryId, limit = 12 } = config;
    const [activeBrand, setActiveBrand] = useState<string>('all');

    const categoryProducts = useMemo(
        () => allProducts?.filter(p => (categoryId ? p.categoryId === categoryId : true)) || [],
        [allProducts, categoryId]
    );

    const brandPills = useMemo(() => {
        // Map brandId -> tên brand thật (API trả kèm brandName trên mỗi product) — tránh in GUID thô ra UI.
        const seen = new Map<string, string>();
        categoryProducts.forEach(p => {
            const brandId = p.brandId;
            const brandName = (p as unknown as { brandName?: string }).brandName;
            if (brandId && brandName && !seen.has(brandId)) {
                seen.set(brandId, brandName);
            }
        });
        return Array.from(seen.entries())
            .slice(0, 5)
            .map(([id, name]) => ({ label: name, value: id }));
    }, [categoryProducts]);

    const filteredProducts = useMemo(() => {
        const list = activeBrand === 'all' ? categoryProducts : categoryProducts.filter(p => p.brandId === activeBrand);
        return list.slice(0, limit);
    }, [categoryProducts, activeBrand, limit]);

    if (isLoading && filteredProducts.length === 0) return null;
    if (!isLoading && filteredProducts.length === 0) return null;

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-10">
            <ProductSectionHeader
                title={title}
                viewAllHref={config.showViewAll === false ? undefined : (categoryId ? `/products?categoryId=${categoryId}` : '/products')}
                brandPills={brandPills.length > 1 ? [{ label: 'Tất cả', value: 'all' }, ...brandPills] : undefined}
                activeBrand={activeBrand}
                onBrandChange={setActiveBrand}
            />
            {/* auto-fit + max cố định: card không bị stretch khi ít sản phẩm hơn số cột (tránh cột trống) */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,200px))] gap-3 md:gap-4">
                {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};
