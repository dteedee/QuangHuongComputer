import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { useProducts } from '../../hooks/useProducts';
import { catalogApi, type Category } from '../../api/catalog';
import * as LucideIcons from 'lucide-react';

interface SidePanel {
    imageUrl: string;
    link: string;
}

interface BrandTab {
    name: string;
    brandId: string;
}

interface ProductGridWithPanelsProps {
    title: string;
    config: {
        categoryId?: string;
        categorySlug?: string;
        tag?: string;
        limit?: number;
        icon?: string;
        showViewAll?: boolean;
        columns?: number;
        brandTabs?: BrandTab[];
        leftPanel?: SidePanel;
        rightPanel?: SidePanel;
        backgroundColor?: string;
    };
}

export const ProductGridWithPanels: React.FC<ProductGridWithPanelsProps> = ({ title, config }) => {
    const { data: allProducts, isLoading } = useProducts();
    const [activeBrand, setActiveBrand] = useState<string>('all');
    const {
        categoryId,
        categorySlug,
        limit = 10,
        icon = 'Monitor',
        showViewAll = true,
        columns = 4,
        brandTabs = [],
        leftPanel,
        rightPanel,
        backgroundColor,
    } = config;

    const filteredProducts = allProducts?.filter(p => {
        if (categoryId) return p.categoryId === categoryId;
        if (categorySlug) {
            return (p as any).categorySlug === categorySlug || p.categoryId === categorySlug;
        }
        return true;
    }).filter(p => {
        if (activeBrand === 'all') return true;
        return (p as any).brandId === activeBrand || p.brand === activeBrand;
    }).slice(0, limit) || [];

    if (isLoading && filteredProducts.length === 0) return null;

    const Icon = (LucideIcons as any)[icon] || LucideIcons.Monitor;
    const gridCols = `grid-cols-2 md:grid-cols-3 lg:grid-cols-${Math.min(columns, 5)}`;

    return (
        <div
            className="max-w-[1400px] mx-auto px-4 mt-8"
            style={backgroundColor ? { backgroundColor } : undefined}
        >
            {/* Section Header */}
            <div className="bg-white rounded-t-2xl border-2 border-b-4 border-accent py-3 px-6 flex items-center justify-between shadow-md">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                    <span className="text-accent"><Icon size={24} /></span>
                    {title}
                </h2>
                <div className="flex items-center gap-4">
                    {brandTabs.length > 0 && (
                        <div className="hidden md:flex items-center gap-1">
                            <button
                                onClick={() => setActiveBrand('all')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                                    activeBrand === 'all'
                                        ? 'bg-accent text-white'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                Tất cả
                            </button>
                            {brandTabs.map(tab => (
                                <button
                                    key={tab.brandId}
                                    onClick={() => setActiveBrand(tab.brandId)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                                        activeBrand === tab.brandId
                                            ? 'bg-accent text-white'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    )}
                    {showViewAll && (
                        <Link
                            to={categoryId ? `/products?category=${categoryId}` : '/products'}
                            className="text-sm font-bold text-accent hover:underline flex items-center gap-1 uppercase tracking-wider"
                        >
                            Tất cả
                            <ChevronRight size={16} />
                        </Link>
                    )}
                </div>
            </div>

            {/* Content with Side Panels */}
            <div className="bg-white rounded-b-2xl border-2 border-t-0 border-gray-200 shadow-lg overflow-hidden">
                <div className="flex">
                    {/* Left Panel */}
                    {leftPanel?.imageUrl && (
                        <div className="hidden lg:block shrink-0 w-[200px] p-2">
                            <Link to={leftPanel.link || '#'} className="block h-full">
                                <img
                                    src={leftPanel.imageUrl}
                                    alt="Banner"
                                    className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
                                />
                            </Link>
                        </div>
                    )}

                    {/* Product Grid */}
                    <div className="flex-1 p-4 md:p-6">
                        <div className={`grid ${gridCols} gap-4`}>
                            {filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <p className="font-semibold">Chưa có sản phẩm</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel */}
                    {rightPanel?.imageUrl && (
                        <div className="hidden lg:block shrink-0 w-[200px] p-2">
                            <Link to={rightPanel.link || '#'} className="block h-full">
                                <img
                                    src={rightPanel.imageUrl}
                                    alt="Banner"
                                    className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
                                />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
