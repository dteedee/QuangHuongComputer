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
        const ids = Array.from(new Set(categoryProducts.map(p => p.brandId).filter(Boolean)));
        return ids.slice(0, 5).map(id => ({ label: id, value: id }));
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};
