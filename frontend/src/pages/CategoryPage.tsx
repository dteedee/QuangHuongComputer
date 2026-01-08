import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { catalogApi, type Product, type Brand, type Category } from '../api/catalog';
import { ProductCard } from '../components/ProductCard';
import { Monitor, Filter, ArrowDownWideNarrow, X } from 'lucide-react';
import { motion } from 'framer-motion';

// Helper to normalize strings for comparison
const normalize = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export const CategoryPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('query');

    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [priceRange, setPriceRange] = useState<{ min?: number; max?: number } | null>(null);
    const [inStockOnly, setInStockOnly] = useState(false);

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

    // Manual mapping for better UX titles
    const routeToCategory: Record<string, string> = {
        'laptop': 'Laptop',
        'pc-gaming': 'PC Gaming',
        'workstation': 'Workstation',
        'office': 'Office',
        'components': 'Components',
        'screens': 'Screens',
        'gear': 'Gear',
        'network': 'Network',
        'camera': 'Camera',
        'audio': 'Audio',
        'accessories': 'Accessories'
    };

    const categorySearchName = routeToCategory[currentSlug] || currentSlug;

    // Find matching category object
    const matchedCategory = categories.find(c => {
        const n1 = normalize(c.name);
        const n2 = normalize(categorySearchName);
        return n1.includes(n2) || n2.includes(n1);
    });

    const categoryTitle = searchQuery
        ? `Tìm kiếm: "${searchQuery}"`
        : (matchedCategory?.name || categorySearchName || "Sản phẩm");

    // Fetch products when filters or category changes
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                // If we haven't loaded categories yet, we might miss the matchedCategory
                // But this effect runs when 'categories' updates too.

                const params: any = {};

                if (searchQuery) {
                    params.query = searchQuery;
                }

                if (matchedCategory) {
                    params.categoryId = matchedCategory.id;
                }

                if (selectedBrandId) {
                    params.brandId = selectedBrandId;
                }

                if (priceRange) {
                    if (priceRange.min !== undefined) params.minPrice = priceRange.min;
                    if (priceRange.max !== undefined) params.maxPrice = priceRange.max;
                }

                if (inStockOnly) {
                    params.inStock = true;
                }

                // Use the search endpoint which supports advanced filters
                const results = await catalogApi.searchProducts(params);
                setProducts(results || []);

            } catch (error) {
                console.error("Error fetching products", error);
                setProducts([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if we have categories loaded (unless it failed to load any)
        // Or if we are in search mode (no categories needed for search)
        if (categories.length > 0 || searchQuery) {
            fetchProducts();
        }
    }, [matchedCategory, selectedBrandId, priceRange, inStockOnly, categories.length, searchQuery]);

    // Handlers
    const handlePriceSelect = (min?: number, max?: number) => {
        if (priceRange?.min === min && priceRange?.max === max) {
            setPriceRange(null); // Deselect
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
    };

    return (
        <div className="bg-gray-100 min-h-screen pb-10">
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">{categoryTitle}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-6">
                {/* Header Banner */}
                <div className="bg-white p-4 rounded-md shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-[#D70018]">
                            <Monitor size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 uppercase">{categoryTitle}</h1>
                            <p className="text-sm text-gray-500">Tìm thấy {products.length} sản phẩm</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Filters */}
                    <div className="hidden lg:block space-y-4">
                        <div className="bg-white p-4 rounded-md shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    <Filter size={16} /> BỘ LỌC
                                </h3>
                                {(selectedBrandId || priceRange) && (
                                    <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center">
                                        <X size={12} /> Xóa
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Brands */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Thương hiệu</h4>
                                    <div className="flex flex-col gap-2 text-sm text-gray-600 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {brands.map((brand) => (
                                            <label key={brand.id} className="flex items-center gap-2 cursor-pointer hover:text-[#D70018] transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBrandId === brand.id}
                                                    onChange={() => handleBrandSelect(brand.id)}
                                                    className="rounded border-gray-300 text-[#D70018] focus:ring-[#D70018]"
                                                />
                                                <span>{brand.name}</span>
                                            </label>
                                        ))}
                                        {brands.length === 0 && <p className="text-xs text-gray-400 italic">Đang tải thương hiệu...</p>}
                                    </div>
                                </div>
                                <hr className="border-gray-100" />

                                {/* Price Ranges */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Mức giá</h4>
                                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                                        {[
                                            { label: 'Dưới 10 triệu', max: 10000000 },
                                            { label: '10 - 15 triệu', min: 10000000, max: 15000000 },
                                            { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
                                            { label: '20 - 30 triệu', min: 20000000, max: 30000000 },
                                            { label: 'Trên 30 triệu', min: 30000000 }
                                        ].map((range, idx) => {
                                            const isChecked = priceRange?.min === range.min && priceRange?.max === range.max;
                                            return (
                                                <label key={idx} className="flex items-center gap-2 cursor-pointer hover:text-[#D70018] transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="price_range"
                                                        checked={isChecked}
                                                        onChange={() => handlePriceSelect(range.min, range.max)}
                                                        className="rounded-full border-gray-300 text-[#D70018] focus:ring-[#D70018]"
                                                    />
                                                    <span>{range.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <hr className="border-gray-100" />

                                {/* Status */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Trạng thái</h4>
                                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                                        <label className="flex items-center gap-2 cursor-pointer hover:text-[#D70018] transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={inStockOnly}
                                                onChange={(e) => setInStockOnly(e.target.checked)}
                                                className="rounded border-gray-300 text-[#D70018] focus:ring-[#D70018]"
                                            />
                                            <span>Chỉ hiển thị hàng có sẵn</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="lg:col-span-3">
                        {/* Sort Bar */}
                        <div className="bg-white p-2 rounded-md shadow-sm mb-4 flex justify-end items-center gap-2">
                            <span className="text-sm text-gray-500">Sắp xếp theo:</span>
                            <div className="flex items-center gap-1 border border-gray-300 px-3 py-1.5 rounded text-sm cursor-pointer hover:border-[#D70018]">
                                <ArrowDownWideNarrow size={14} />
                                <span>Mới nhất</span>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <div key={i} className="bg-white h-[300px] rounded animate-pulse"></div>
                                ))}
                            </div>
                        ) : (
                            products.length > 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                                >
                                    {products.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="bg-white p-8 text-center rounded-lg shadow-sm">
                                    <p className="text-gray-500">Không tìm thấy sản phẩm nào phù hợp.</p>
                                    <button onClick={clearFilters} className="mt-2 text-[#D70018] hover:underline">Xóa bộ lọc</button>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
