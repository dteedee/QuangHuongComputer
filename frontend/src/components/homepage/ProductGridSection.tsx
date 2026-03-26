import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { useProducts } from '../../hooks/useProducts';
import * as LucideIcons from 'lucide-react';

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

export const ProductGridSection: React.FC<ProductGridSectionProps> = ({ title, config }) => {
    const { data: allProducts, isLoading } = useProducts();
    const { 
        categoryId, 
        limit = 10, 
        icon = 'Monitor', 
        showViewAll = true 
    } = config;

    const filteredProducts = allProducts?.filter(p => {
        if (categoryId) return p.categoryId === categoryId;
        return true;
    }).slice(0, limit) || [];

    if (isLoading && filteredProducts.length === 0) return null;

    const Icon = (LucideIcons as any)[icon] || LucideIcons.Monitor;

    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-12">
            <div className="bg-white rounded-t-2xl border-2 border-b-4 border-accent py-3 px-6 flex items-center justify-between shadow-md">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                    <span className="text-accent"><Icon size={24} /></span>
                    {title}
                </h2>
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
            <div className="bg-white rounded-b-2xl border-2 border-t-0 border-gray-200 p-6 shadow-lg">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
};
