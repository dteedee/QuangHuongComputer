import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { catalogApi, type Product, type Brand, type Category } from '../api/catalog';
import SEO from '../components/SEO';
import { generateItemListSchema, generateBreadcrumbSchema } from '../utils/structuredData';
import { normalizeCategoryString, ROUTE_TO_CATEGORY_TITLE } from '../utils/category-route-mapping';
import CategoryHeaderBanner from '../components/category/category-header-banner';
import CategorySidebarFilters from '../components/category/category-sidebar-filters';
import CategoryProductsGridSection from '../components/category/category-products-grid-section';

export const CategoryPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('query');

    // Spec filters: URL param format ?spec.<key>=<value>
    const specValues = useMemo(() => {
        const values: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            if (key.startsWith('spec.')) {
                values[key.slice(5)] = value;
            }
        });
        return values;
    }, [searchParams]);

    const handleSpecChange = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        const paramKey = `spec.${key}`;
        if (!value) next.delete(paramKey);
        else next.set(paramKey, value);
        setSearchParams(next, { replace: true });
        setPage(1);
    };

    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [priceRange, setPriceRange] = useState<{ min?: number; max?: number } | null>(null);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState<string>('newest');
    const [page, setPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const pageSize = 12;

    // Initial load
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [cats, brs] = await Promise.all([
                    catalogApi.getCategories(),
                    catalogApi.getBrands()
                ]);
                setCategories(Array.isArray(cats) ? cats : (cats as any).value || []);
                setBrands(Array.isArray(brs) ? brs : (brs as any).value || []);
            } catch (error) {
                console.error("Failed to load metadata", error);
            }
        };
        loadMetadata();
    }, []);

    // Derived current category
    const currentSlug = slug || location.pathname.split('/').pop() || '';

    const categorySearchName = ROUTE_TO_CATEGORY_TITLE[currentSlug] || currentSlug;

    // Find matching category object
    const matchedCategory = categories.find(c => {
        const catName = normalizeCategoryString(c.name);
        const catDesc = normalizeCategoryString(c.description || "");
        const target = normalizeCategoryString(categorySearchName);
        const slugTarget = normalizeCategoryString(currentSlug);

        return catName === target ||
            catDesc === slugTarget ||
            catName.includes(target) ||
            target.includes(catName);
    });

    const categoryTitle = searchQuery
        ? `Tìm kiếm: "${searchQuery}"`
        : (matchedCategory?.name || categorySearchName || "Sản phẩm");

    // Fetch products when filters or category changes
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                type SearchArg = NonNullable<Parameters<typeof catalogApi.searchProducts>[0]>;
                const params: SearchArg = { page, pageSize, sortBy };

                if (searchQuery) params.query = searchQuery;
                if (matchedCategory) params.categoryId = matchedCategory.id;
                if (selectedBrandId) params.brandId = selectedBrandId;
                if (priceRange) {
                    if (priceRange.min !== undefined) params.minPrice = priceRange.min;
                    if (priceRange.max !== undefined) params.maxPrice = priceRange.max;
                }
                if (inStockOnly) params.inStock = true;

                // Spec filters — pass through as `spec.<key>` params so backend can parse
                Object.entries(specValues).forEach(([key, value]) => {
                    if (value) params[`spec.${key}`] = value;
                });

                const response = await catalogApi.searchProducts(params);
                setProducts(response.products || []);
                setTotalProducts(response.total || 0);

            } catch (error) {
                console.error("Error fetching products", error);
                setProducts([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (categories.length > 0 || searchQuery) {
            fetchProducts();
        }
    }, [matchedCategory, selectedBrandId, priceRange, inStockOnly, sortBy, categories.length, searchQuery, page, specValues]);

    // Handlers
    const handlePriceSelect = (min?: number, max?: number) => {
        if (priceRange?.min === min && priceRange?.max === max) {
            setPriceRange(null);
        } else {
            setPriceRange({ min, max });
        }
    };

    const handleBrandSelect = (id: string) => {
        if (selectedBrandId === id) {
            setSelectedBrandId(null);
        } else {
            setSelectedBrandId(id);
        }
    };

    const clearFilters = () => {
        setSelectedBrandId(null);
        setPriceRange(null);
        setInStockOnly(false);
        setPage(1);
    };

    const totalPages = Math.ceil(totalProducts / pageSize);

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <SEO
                title={categoryTitle}
                description={`${categoryTitle} - Mua sắm ${categoryTitle} chính hãng giá tốt tại Quang Hưởng Computer. Tìm thấy ${totalProducts} sản phẩm.`}
                keywords={`${categoryTitle}, mua ${categoryTitle}, ${categoryTitle} giá rẻ, quang hưởng computer`}
                noindex={!!searchQuery}
                structuredData={[
                    ...(products.length > 0 ? [generateItemListSchema(products, categoryTitle)] : []),
                    generateBreadcrumbSchema([
                        { name: 'Trang chủ', url: '/' },
                        { name: categoryTitle },
                    ]),
                ]}
            />

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-accent transition-colors">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">{categoryTitle}</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <CategoryHeaderBanner categoryTitle={categoryTitle} totalProducts={totalProducts} />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <CategorySidebarFilters
                        brands={brands}
                        selectedBrandId={selectedBrandId}
                        priceRange={priceRange}
                        inStockOnly={inStockOnly}
                        matchedCategoryId={matchedCategory?.id}
                        specValues={specValues}
                        onBrandSelect={handleBrandSelect}
                        onPriceSelect={handlePriceSelect}
                        onInStockChange={setInStockOnly}
                        onSpecChange={handleSpecChange}
                        onClearFilters={clearFilters}
                    />

                    <CategoryProductsGridSection
                        isLoading={isLoading}
                        products={products}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        onClearFilters={clearFilters}
                    />
                </div>
            </div>
        </div>
    );
};
