import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogApi, type Product, type Category, type Brand } from '../api/catalog';
import { Filter, SlidersHorizontal, Grid, List, ChevronDown } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';

interface ProductCatalogProps {
  categorySlug?: string;
  brandSlug?: string;
}

export default function ProductCatalogPage({ categorySlug, brandSlug }: ProductCatalogProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const updateURL = () => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (selectedBrand) params.brand = selectedBrand;
    if (priceRange.min > 0) params.minPrice = priceRange.min.toString();
    if (priceRange.max < 100000000) params.maxPrice = priceRange.max.toString();
    if (inStockOnly) params.inStock = 'true';
    if (sortBy !== 'newest') params.sortBy = sortBy;
    if (searchQuery) params.q = searchQuery;
    if (page > 1) params.page = page.toString();
    setSearchParams(params);
  };

  useEffect(() => {
    updateURL();
  }, [selectedCategory, selectedBrand, priceRange, inStockOnly, sortBy, page, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getDiscountPercentage = (product: Product) => {
    if (product.oldPrice && product.oldPrice > product.price) {
      return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
    }
    return null;
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Hết hàng', className: 'bg-red-100 text-red-800' };
    if (stock < 5) return { text: `Còn ${stock} sản phẩm`, className: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Còn hàng', className: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Cửa Hàng Máy Tính</h1>
          <p className="text-blue-100 text-lg">
            Khám phá hàng ngàn sản phẩm máy tính chất lượng cao
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Tìm kiếm
            </button>
          </div>
        </form>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Bộ lọc
                </h2>
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedBrand('');
                    setPriceRange({ min: 0, max: 100000000 });
                    setInStockOnly(false);
                    setSortBy('newest');
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Đặt lại
                </button>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Danh mục</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === ''}
                      onChange={() => setSelectedCategory('')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 group-hover:text-blue-600">All Categories</span>
                  </label>
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === category.id}
                        onChange={() => setSelectedCategory(category.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-blue-600">{category.name || 'Unnamed Category'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Thương hiệu</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === ''}
                      onChange={() => setSelectedBrand('')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 group-hover:text-blue-600">All Brands</span>
                  </label>
                  {brands.map((brand) => (
                    <label key={brand.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="brand"
                        checked={selectedBrand === brand.id}
                        onChange={() => setSelectedBrand(brand.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-blue-600">{brand.name || 'Unnamed Brand'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Khoảng giá</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Giá từ</label>
                    <input
                      type="number"
                      value={priceRange.min || ''}
                      onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Giá đến</label>
                    <input
                      type="number"
                      value={priceRange.max < 100000000 ? priceRange.max : ''}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 100000000 })}
                      placeholder="100,000,000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Filter */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="font-medium">Chỉ hiển thị hàng còn sẵn</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
              <div className="text-gray-600">
                Tìm thấy <span className="font-semibold text-gray-900">{total}</span> sản phẩm
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá thấp đến cao</option>
                  <option value="price_desc">Giá cao đến thấp</option>
                  <option value="name">Tên A-Z</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid/List */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedBrand('');
                    setPriceRange({ min: 0, max: 100000000 });
                    setInStockOnly(false);
                    setSearchQuery('');
                  }}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => {
                  const discount = getDiscountPercentage(product);
                  const stockStatus = getStockStatus(product.stockQuantity);

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex gap-4"
                    >
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-gray-300 font-bold text-4xl select-none">
                            {product.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-xl text-gray-900 mb-2">{product.name}</h3>
                            <p className="text-gray-600 mb-4 line-clamp-2">{product.description}</p>

                            <div className="flex items-baseline gap-3 mb-3">
                              <span className="text-3xl font-bold text-blue-600">
                                {formatPrice(product.price)}
                              </span>
                              {product.oldPrice && (
                                <>
                                  <span className="text-lg text-gray-400 line-through">
                                    {formatPrice(product.oldPrice)}
                                  </span>
                                  {discount && (
                                    <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
                                      -{discount}%
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 rounded text-sm font-medium ${stockStatus.className}`}>
                                {stockStatus.text}
                              </span>
                              <span className="text-sm text-gray-500">SKU: {product.sku}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              onClick={() => (window.location.href = `/products/${product.id}`)}
                            >
                              Xem chi tiết
                            </button>
                            <button
                              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                              disabled={product.stockQuantity === 0}
                            >
                              Thêm vào giỏ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {total > pageSize && (
              <div className="mt-8 flex justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Trước
                  </button>

                  {[...Array(Math.ceil(total / pageSize))].map((_, i) => {
                    const pageNum = i + 1;
                    const showPage =
                      pageNum === 1 ||
                      pageNum === Math.ceil(total / pageSize) ||
                      (pageNum >= page - 1 && pageNum <= page + 1);

                    if (!showPage) {
                      if (pageNum === page - 2 || pageNum === page + 2) {
                        return (
                          <span key={pageNum} className="px-2 py-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2 rounded-lg ${page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                    disabled={page === Math.ceil(total / pageSize)}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
