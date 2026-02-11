import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { catalogApi, type Product, type Category, type Brand } from '../api/catalog';
import { Filter, Grid, List, ChevronRight, Home, Search, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductFilter } from '../components/ProductFilter';
import { ProductListItem } from '../components/ProductListItem';
import SEO from '../components/SEO';

interface ProductCatalogProps {
  categorySlug?: string;
  brandSlug?: string;
}

export default function ProductCatalogPage({ }: ProductCatalogProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || ''
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    searchParams.get('brand') || ''
  );
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: Number(searchParams.get('minPrice')) || 0,
    max: Number(searchParams.get('maxPrice')) || 100000000,
  });
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get('inStock') === 'true'
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const pageSize = 20;

  useEffect(() => {
    loadCategories();
    loadBrands();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedBrand, priceRange, inStockOnly, sortBy, page, searchQuery]);

  // Sync state with URL params when they change externally (e.g. back button)
  useEffect(() => {
    const cat = searchParams.get('category') || '';
    const br = searchParams.get('brand') || '';
    const min = Number(searchParams.get('minPrice')) || 0;
    const max = Number(searchParams.get('maxPrice')) || 100000000;
    const stock = searchParams.get('inStock') === 'true';
    const sort = searchParams.get('sortBy') || 'newest';
    const q = searchParams.get('q') || '';
    const p = Number(searchParams.get('page')) || 1;

    if (cat !== selectedCategory) setSelectedCategory(cat);
    if (br !== selectedBrand) setSelectedBrand(br);
    // Avoid infinite loops with price range objects, compare values
    if (min !== priceRange.min || max !== priceRange.max) setPriceRange({ min, max });
    if (stock !== inStockOnly) setInStockOnly(stock);
    if (sort !== sortBy) setSortBy(sort);
    if (q !== searchQuery) setSearchQuery(q);
    if (p !== page) setPage(p);
  }, [searchParams]);

  const loadCategories = async () => {
    try {
      const data = await catalogApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await catalogApi.getBrands();
      setBrands(data);
    } catch (error) {
      console.error('Failed to load brands:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await catalogApi.searchProducts({
        query: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        brandId: selectedBrand || undefined,
        minPrice: priceRange.min > 0 ? priceRange.min : undefined,
        maxPrice: priceRange.max < 100000000 ? priceRange.max : undefined,
        inStock: inStockOnly,
        sortBy,
        page,
        pageSize,
      });
      setProducts(data.products);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateURL = (newParams: any) => {
    const params: Record<string, string> = {};
    // Merge current state with new params to ensure consistency before state update completes
    const mergedState = {
      category: selectedCategory,
      brand: selectedBrand,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      inStock: inStockOnly,
      sortBy: sortBy,
      q: searchQuery,
      page: page,
      ...newParams
    };

    if (mergedState.category) params.category = mergedState.category;
    if (mergedState.brand) params.brand = mergedState.brand;
    if (mergedState.minPrice > 0) params.minPrice = mergedState.minPrice.toString();
    if (mergedState.maxPrice < 100000000) params.maxPrice = mergedState.maxPrice.toString();
    if (mergedState.inStock) params.inStock = 'true';
    if (mergedState.sortBy !== 'newest') params.sortBy = mergedState.sortBy;
    if (mergedState.q) params.q = mergedState.q;
    if (mergedState.page > 1) params.page = mergedState.page.toString();

    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateURL({ page: 1, q: searchQuery });
  };

  const activeFiltersCount = [
    selectedCategory,
    selectedBrand,
    priceRange.min > 0,
    priceRange.max < 100000000,
    inStockOnly
  ].filter(Boolean).length;

  const currentCategoryName = categories.find(c => c.id === selectedCategory)?.name || 'Tất cả sản phẩm';
  const currentBrandName = brands.find(b => b.id === selectedBrand)?.name;
  const seoTitle = currentBrandName
    ? `${currentBrandName} - ${currentCategoryName}`
    : currentCategoryName;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO
        title={seoTitle}
        description={`Danh mục ${seoTitle} tại Quang Hưởng Computer. Cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt nhất.`}
      />

      {/* Hero / Header Section */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <nav className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link to="/" className="hover:text-[#D70018] flex items-center gap-1 transition-colors"><Home size={14} /> Trang chủ</Link>
                <ChevronRight size={14} />
                <span className="text-gray-900 font-medium">Sản phẩm</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {currentCategoryName}
                {currentBrandName && <span className="text-gray-400 font-normal">/ {currentBrandName}</span>}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <form onSubmit={handleSearch} className="relative w-full md:w-80 group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-[#D70018]/20 focus:bg-white transition-all outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#D70018] transition-colors" />
              </form>
            </div>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="mt-4 md:hidden flex items-center justify-between">
            <button
              onClick={() => setShowMobileFilter(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium shadow-sm active:bg-gray-50"
            >
              <Filter size={16} />
              Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            <span className="text-sm text-gray-500">
              {total} sản phẩm
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Desktop Sidebar */}
          <div className="hidden lg:block sticky top-24 h-fit">
            <ProductFilter
              categories={categories}
              brands={brands}
              selectedCategory={selectedCategory}
              selectedBrand={selectedBrand}
              priceRange={priceRange}
              inStockOnly={inStockOnly}
              onCategoryChange={(id) => { setSelectedCategory(id === selectedCategory ? '' : id); updateURL({ category: id === selectedCategory ? '' : id, page: 1 }); }}
              onBrandChange={(id) => { setSelectedBrand(id === selectedBrand ? '' : id); updateURL({ brand: id === selectedBrand ? '' : id, page: 1 }); }}
              onPriceChange={(range) => { setPriceRange(range); updateURL({ minPrice: range.min, maxPrice: range.max, page: 1 }); }}
              onInStockChange={(checked) => { setInStockOnly(checked); updateURL({ inStock: checked, page: 1 }); }}
              onReset={() => {
                setSelectedCategory('');
                setSelectedBrand('');
                setPriceRange({ min: 0, max: 100000000 });
                setInStockOnly(false);
                setSearchQuery('');
                setPage(1);
                setSearchParams({});
              }}
            />
          </div>

          {/* Mobile Filter Drawer */}
          {showMobileFilter && (
            <div className="fixed inset-0 z-50 lg:hidden font-sans">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowMobileFilter(false)} />
              <div className="absolute inset-y-0 left-0 w-[80%] max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out h-full overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                  <h2 className="font-bold text-lg text-gray-900">Bộ lọc tìm kiếm</h2>
                  <button onClick={() => setShowMobileFilter(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 flex-1">
                  <ProductFilter
                    categories={categories}
                    brands={brands}
                    selectedCategory={selectedCategory}
                    selectedBrand={selectedBrand}
                    priceRange={priceRange}
                    inStockOnly={inStockOnly}
                    onCategoryChange={(id) => { setSelectedCategory(id === selectedCategory ? '' : id); updateURL({ category: id === selectedCategory ? '' : id, page: 1 }); }}
                    onBrandChange={(id) => { setSelectedBrand(id === selectedBrand ? '' : id); updateURL({ brand: id === selectedBrand ? '' : id, page: 1 }); }}
                    onPriceChange={(range) => { setPriceRange(range); updateURL({ minPrice: range.min, maxPrice: range.max, page: 1 }); }}
                    onInStockChange={(checked) => { setInStockOnly(checked); updateURL({ inStock: checked, page: 1 }); }}
                    onReset={() => {
                      setSelectedCategory('');
                      setSelectedBrand('');
                      setPriceRange({ min: 0, max: 100000000 });
                      setInStockOnly(false);
                      setSearchQuery('');
                      setPage(1);
                      setSearchParams({});
                      setShowMobileFilter(false);
                    }}
                  />
                </div>
                <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
                  <button
                    onClick={() => setShowMobileFilter(false)}
                    className="w-full py-3 bg-[#D70018] text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-colors"
                  >
                    Xem {total} kết quả
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-20 z-20">
              <div className="hidden md:block text-gray-500 text-sm">
                Hiển thị <strong>{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)}</strong> trong <strong>{total}</strong> sản phẩm
              </div>

              <div className="flex items-center gap-3 ml-auto w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                  <span className="text-sm text-gray-500 whitespace-nowrap">Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                      updateURL({ sortBy: e.target.value });
                    }}
                    className="bg-transparent border-none text-sm font-medium text-gray-800 focus:ring-0 cursor-pointer py-0 pl-1 pr-6"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="price_asc">Giá tăng dần</option>
                    <option value="price_desc">Giá giảm dần</option>
                    <option value="name">Tên A-Z</option>
                  </select>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#D70018] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Lưới"
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#D70018] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Danh sách"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid/List */}
            {loading ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-4"}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse h-80">
                    <div className="bg-gray-100 h-40 rounded-lg mb-4 w-full"></div>
                    <div className="bg-gray-100 h-4 rounded w-3/4 mb-2"></div>
                    <div className="bg-gray-100 h-4 rounded w-1/2 mb-4"></div>
                    <div className="bg-gray-100 h-8 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm nào</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn để tìm thấy sản phẩm mong muốn.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedBrand('');
                    setPriceRange({ min: 0, max: 100000000 });
                    setInStockOnly(false);
                    setSearchQuery('');
                    setPage(1);
                    setSearchParams({});
                  }}
                  className="px-8 py-3 bg-[#D70018] text-white rounded-full hover:bg-red-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <ProductListItem key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > pageSize && (
              <div className="mt-10 flex justify-center pb-8">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    Trước
                  </button>

                  <div className="hidden sm:flex gap-1">
                    {[...Array(Math.ceil(total / pageSize))].map((_, i) => {
                      const pageNum = i + 1;
                      const showPage =
                        pageNum === 1 ||
                        pageNum === Math.ceil(total / pageSize) ||
                        (pageNum >= page - 1 && pageNum <= page + 1);

                      if (!showPage) {
                        if (pageNum === page - 2 || pageNum === page + 2) {
                          return (
                            <span key={pageNum} className="px-3 py-2 text-gray-400">...</span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className={`min-w-[40px] h-10 rounded-lg font-medium text-sm transition-all shadow-sm ${page === pageNum
                            ? 'bg-[#D70018] text-white shadow-md transform scale-105'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => { setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === Math.ceil(total / pageSize)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
