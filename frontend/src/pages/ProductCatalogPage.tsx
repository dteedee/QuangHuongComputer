import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogApi, type Product, type Category, type Brand } from '../api/catalog';
import { aiApi } from '../api/ai';
import { ProductFilter } from '../components/ProductFilter';
import SEO from '../components/SEO';
import CatalogBreadcrumbHeader from '../components/catalog/catalog-breadcrumb-header';
import CatalogMobileFilterDrawer from '../components/catalog/catalog-mobile-filter-drawer';
import CatalogAiSearchBanner from '../components/catalog/catalog-ai-search-banner';
import CatalogToolbar from '../components/catalog/catalog-toolbar';
import CatalogProductsGrid from '../components/catalog/catalog-products-grid';
import CatalogPagination from '../components/catalog/catalog-pagination';

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
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [loadingAiResult, setLoadingAiResult] = useState(false);

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

    if (searchQuery && page === 1) {
      setLoadingAiResult(true);
      aiApi.naturalLanguageSearch(searchQuery)
        .then(res => setAiResult(res.intelligentResult))
        .catch(() => setAiResult(null))
        .finally(() => setLoadingAiResult(false));
    } else if (!searchQuery) {
      setAiResult(null);
    }

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

  const resetFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setPriceRange({ min: 0, max: 100000000 });
    setInStockOnly(false);
    setSearchQuery('');
    setPage(1);
    setSearchParams({});
  };

  const visibleCategories = categories.filter(c => (c.productCount ?? 0) > 0);
  const visibleBrands = brands.filter(b => (b.productCount ?? 0) > 0);

  const handleCategoryChange = (id: string) => {
    const next = id === selectedCategory ? '' : id;
    setSelectedCategory(next);
    updateURL({ category: next, page: 1 });
  };
  const handleBrandChange = (id: string) => {
    const next = id === selectedBrand ? '' : id;
    setSelectedBrand(next);
    updateURL({ brand: next, page: 1 });
  };
  const handlePriceChange = (range: { min: number; max: number }) => {
    setPriceRange(range);
    updateURL({ minPrice: range.min, maxPrice: range.max, page: 1 });
  };
  const handleInStockChange = (checked: boolean) => {
    setInStockOnly(checked);
    updateURL({ inStock: checked, page: 1 });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO
        title={seoTitle}
        description={`Danh mục ${seoTitle} tại Quang Hưởng Computer. Cung cấp linh kiện máy tính, laptop, PC gaming chính hãng giá tốt nhất.`}
      />

      <CatalogBreadcrumbHeader
        searchQuery={searchQuery}
        currentCategoryName={currentCategoryName}
        currentBrandName={currentBrandName}
        total={total}
        activeFiltersCount={activeFiltersCount}
        onOpenMobileFilter={() => setShowMobileFilter(true)}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Desktop Sidebar */}
          <div className="hidden lg:block sticky top-24 h-fit">
            <ProductFilter
              categories={visibleCategories}
              brands={visibleBrands}
              selectedCategory={selectedCategory}
              selectedBrand={selectedBrand}
              priceRange={priceRange}
              inStockOnly={inStockOnly}
              onCategoryChange={handleCategoryChange}
              onBrandChange={handleBrandChange}
              onPriceChange={handlePriceChange}
              onInStockChange={handleInStockChange}
              onReset={resetFilters}
            />
          </div>

          {/* Mobile Filter Drawer */}
          {showMobileFilter && (
            <CatalogMobileFilterDrawer
              categories={visibleCategories}
              brands={visibleBrands}
              selectedCategory={selectedCategory}
              selectedBrand={selectedBrand}
              priceRange={priceRange}
              inStockOnly={inStockOnly}
              total={total}
              onCategoryChange={handleCategoryChange}
              onBrandChange={handleBrandChange}
              onPriceChange={handlePriceChange}
              onInStockChange={handleInStockChange}
              onReset={() => { resetFilters(); setShowMobileFilter(false); }}
              onClose={() => setShowMobileFilter(false)}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <CatalogAiSearchBanner aiResult={aiResult} loadingAiResult={loadingAiResult} searchQuery={searchQuery} />

            <CatalogToolbar
              page={page}
              pageSize={pageSize}
              total={total}
              sortBy={sortBy}
              onSortChange={(val) => { setSortBy(val); setPage(1); updateURL({ sortBy: val }); }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            <CatalogProductsGrid
              loading={loading}
              products={products}
              viewMode={viewMode}
              onClearFilters={resetFilters}
            />

            <CatalogPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
