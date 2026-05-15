import { useEffect, useState } from 'react';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { catalogApi, type Product, type Brand, type Category } from '../api/catalog';
import { ProductCard } from '../components/ProductCard';
import { Monitor, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { generateItemListSchema, generateBreadcrumbSchema } from '../utils/structuredData';

// Helper to normalize strings for comparison
const normalize = (str: string) => {
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
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

    // Manual mapping for better UX titles
    const routeToCategory: Record<string, string> = {
        'laptop': 'Laptop - Máy Tính Xách Tay',
        'pc-gaming': 'Máy Tính Chơi Game',
        'workstation': 'Máy Tính Đồ Họa',
        'screens': 'Màn Hình Máy Tính',
        'components': 'Linh Kiện Máy Tính',
        'gear': 'Phím, Chuột - Gaming Gear',
        'network': 'Thiết Bị Mạng',
        'camera': 'Camera',
        'audio': 'Loa, Mic, Webcam, Stream',
        'accessories': 'Phụ Kiện Máy Tính - Laptop'
    };

    const categorySearchName = routeToCategory[currentSlug] || currentSlug;

    // Find matching category object
    const matchedCategory = categories.find(c => {
        const catName = normalize(c.name);
        const catDesc = normalize(c.description || "");
        const target = normalize(categorySearchName);
        const slugTarget = normalize(currentSlug);

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

                params.page = page;
                params.pageSize = pageSize;
                params.sortBy = sortBy;

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
    }, [matchedCategory, selectedBrandId, priceRange, inStockOnly, sortBy, categories.length, searchQuery, page]);

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
                {/* Header Banner */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6 flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center text-accent flex-shrink-0">
                        <Monitor size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{categoryTitle}</h1>
                        <p className="text-gray-500 text-sm">Tìm thấy {totalProducts} sản phẩm</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Filters */}
                    <div className="hidden lg:block">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <Filter size={15} />
                                    BỘ LỌC
                                </h3>
                                {(selectedBrandId || priceRange) && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-xs text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <X size={12} /> Xóa
                                    </button>
                                )}
                            </div>

                            {/* Brands */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Thương hiệu</h4>
                                <div className="flex flex-col gap-2 text-sm text-gray-600 max-h-60 overflow-y-auto pr-1">
                                    {brands.map((brand) => (
                                        <label key={brand.id} className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedBrandId === brand.id}
                                                onChange={() => handleBrandSelect(brand.id)}
                                                className="rounded border-gray-300 text-accent focus:ring-accent"
                                            />
                                            <span>{brand.name}</span>
                                        </label>
                                    ))}
                                    {brands.length === 0 && (
                                        <p className="text-xs text-gray-400 italic">Đang tải thương hiệu...</p>
                                    )}
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Price Ranges */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Mức giá</h4>
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
                                            <label key={idx} className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors">
                                                <input
                                                    type="radio"
                                                    name="price_range"
                                                    checked={isChecked}
                                                    onChange={() => handlePriceSelect(range.min, range.max)}
                                                    className="border-gray-300 text-accent focus:ring-accent"
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
                                <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Trạng thái</h4>
                                <label className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors text-sm text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={inStockOnly}
                                        onChange={(e) => setInStockOnly(e.target.checked)}
                                        className="rounded border-gray-300 text-accent focus:ring-accent"
                                    />
                                    <span>Chỉ hiển thị hàng có sẵn</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="lg:col-span-3">
                        {/* Sort Bar */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-4 flex justify-end items-center gap-3">
                            <span className="text-sm text-gray-500">Sắp xếp theo:</span>
                            <SearchableSelect
                                value={sortBy}
                                onChange={(val) => setSortBy(val)}
                                options={[
                                    { value: 'newest', label: 'Mới nhất' },
                                    { value: 'price_asc', label: 'Giá tăng dần' },
                                    { value: 'price_desc', label: 'Giá giảm dần' },
                                    { value: 'name', label: 'Tên A-Z' },
                                ]}
                                className="w-48"
                            />
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <div key={i} className="bg-white h-[300px] rounded-xl animate-pulse border border-gray-100" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {products.length > 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.4 }}
                                        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                                    >
                                        {products.map((product) => (
                                            <ProductCard key={product.id} product={product} />
                                        ))}
                                    </motion.div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                                        <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 mb-3">Không tìm thấy sản phẩm nào phù hợp.</p>
                                        <button
                                            onClick={clearFilters}
                                            className="text-accent hover:underline text-sm cursor-pointer"
                                        >
                                            Xóa bộ lọc
                                        </button>
                                    </div>
                                )}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-8 flex justify-center items-center gap-2">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <ChevronLeft size={16} /> Trước
                                        </button>
                                        <div className="flex gap-1">
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setPage(i + 1)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all cursor-pointer ${
                                                        page === i + 1
                                                            ? 'bg-accent text-white shadow-sm'
                                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            disabled={page === totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            Sau <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
