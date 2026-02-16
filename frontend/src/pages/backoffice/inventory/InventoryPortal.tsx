import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Package, TrendingDown, AlertTriangle, ShoppingCart, Plus, Search,
    Box, Filter, ArrowUpDown, Edit2, Check, X, RefreshCw, Layers,
    ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi, type Product, type Category } from '../../../api/catalog';
import toast from 'react-hot-toast';

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type SortField = 'name' | 'stockQuantity' | 'price' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export const InventoryPortal = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightedProductId = searchParams.get('productId');
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('stockQuantity');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [page, setPage] = useState(1);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);
    const pageSize = 20;

    // Handle productId from URL - scroll to and highlight the product
    useEffect(() => {
        if (highlightedProductId && highlightedRowRef.current) {
            highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Clear the productId from URL after 3 seconds
            const timer = setTimeout(() => {
                searchParams.delete('productId');
                setSearchParams(searchParams, { replace: true });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [highlightedProductId, highlightedRowRef.current]);

    // Fetch all products for inventory management
    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ['inventory-products', page, searchTerm],
        queryFn: () => catalogApi.getProducts({
            page,
            pageSize: 100, // Get more to filter client-side
            includeInactive: true,
            search: searchTerm || undefined
        }),
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => catalogApi.getCategories(),
    });

    // Update stock mutation
    const updateStockMutation = useMutation({
        mutationFn: ({ id, stockQuantity }: { id: string; stockQuantity: number }) =>
            catalogApi.updateProduct(id, { stockQuantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
            toast.success('Cập nhật số lượng thành công!');
            setEditingId(null);
        },
        onError: () => toast.error('Cập nhật thất bại!')
    });

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let products = response?.products || [];

        // Apply stock filter
        switch (stockFilter) {
            case 'in_stock':
                products = products.filter(p => p.stockQuantity > 5);
                break;
            case 'low_stock':
                products = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5);
                break;
            case 'out_of_stock':
                products = products.filter(p => p.stockQuantity === 0);
                break;
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            products = products.filter(p => p.categoryId === categoryFilter);
        }

        // Sort
        products = [...products].sort((a, b) => {
            let compareValue = 0;
            switch (sortField) {
                case 'name':
                    compareValue = a.name.localeCompare(b.name);
                    break;
                case 'stockQuantity':
                    compareValue = a.stockQuantity - b.stockQuantity;
                    break;
                case 'price':
                    compareValue = a.price - b.price;
                    break;
                case 'updatedAt':
                    compareValue = new Date(a.updatedAt || a.createdAt).getTime() -
                        new Date(b.updatedAt || b.createdAt).getTime();
                    break;
            }
            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return products;
    }, [response?.products, stockFilter, categoryFilter, sortField, sortOrder]);

    // Calculate stats
    const stats = useMemo(() => {
        const products = response?.products || [];
        return {
            total: products.length,
            totalStock: products.reduce((sum, p) => sum + p.stockQuantity, 0),
            inStock: products.filter(p => p.stockQuantity > 5).length,
            lowStock: products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5).length,
            outOfStock: products.filter(p => p.stockQuantity === 0).length,
        };
    }, [response?.products]);

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleEditStock = (product: Product) => {
        setEditingId(product.id);
        setEditValue(product.stockQuantity);
    };

    const handleSaveStock = (id: string) => {
        updateStockMutation.mutate({ id, stockQuantity: editValue });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue(0);
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const getStockBadge = (quantity: number, threshold: number = 5) => {
        if (quantity === 0) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-red-100 text-red-700 ring-1 ring-red-200">
                    <AlertCircle size={12} />
                    HẾT HÀNG
                </span>
            );
        }
        if (quantity <= threshold) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                    <AlertTriangle size={12} />
                    SẮP HẾT
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
                <CheckCircle size={12} />
                CÒN HÀNG
            </span>
        );
    };

    const getCategoryName = (categoryId: string) => {
        return categories?.find(c => c.id === categoryId)?.name || 'N/A';
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Kho hàng</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                        Theo dõi số lượng tồn kho, cảnh báo sắp hết hàng và điều chỉnh nhanh
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-3 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => setStockFilter('all')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stockFilter === 'all'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                            <Package size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter tabular-nums">{stats.total}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Tổng SP</p>
                </motion.div>

                <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => setStockFilter('all')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stockFilter === 'all'
                            ? 'bg-purple-50 border-purple-200'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
                            <Layers size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter tabular-nums">{stats.totalStock.toLocaleString()}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Tổng kho</p>
                </motion.div>

                <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => setStockFilter('in_stock')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stockFilter === 'in_stock'
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-600 tracking-tighter tabular-nums">{stats.inStock}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Còn hàng</p>
                </motion.div>

                <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => setStockFilter('low_stock')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stockFilter === 'low_stock'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-amber-600 tracking-tighter tabular-nums">{stats.lowStock}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Sắp hết</p>
                </motion.div>

                <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => setStockFilter('out_of_stock')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stockFilter === 'out_of_stock'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-red-600 tracking-tighter tabular-nums">{stats.outOfStock}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Hết hàng</p>
                </motion.div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col lg:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setPage(1);
                        }}
                        className="flex-1 lg:w-44 px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 outline-none"
                    >
                        <option value="all">Tất cả danh mục</option>
                        {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                        value={stockFilter}
                        onChange={(e) => {
                            setStockFilter(e.target.value as StockFilter);
                            setPage(1);
                        }}
                        className="flex-1 lg:w-40 px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 outline-none"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="in_stock">Còn hàng</option>
                        <option value="low_stock">Sắp hết</option>
                        <option value="out_of_stock">Hết hàng</option>
                    </select>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left py-4 px-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Sản phẩm
                                </th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Danh mục
                                </th>
                                <th
                                    className="text-center py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => handleSort('stockQuantity')}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Tồn kho
                                        <ArrowUpDown size={12} />
                                    </span>
                                </th>
                                <th className="text-center py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Trạng thái
                                </th>
                                <th
                                    className="text-right py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => handleSort('price')}
                                >
                                    <span className="inline-flex items-center gap-1 justify-end">
                                        Giá bán
                                        <ArrowUpDown size={12} />
                                    </span>
                                </th>
                                <th className="text-center py-4 px-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gray-100 rounded-xl" />
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-gray-100 rounded w-48" />
                                                    <div className="h-3 bg-gray-100 rounded w-24" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                                        <td className="py-4 px-4"><div className="h-8 bg-gray-100 rounded w-16 mx-auto" /></td>
                                        <td className="py-4 px-4"><div className="h-6 bg-gray-100 rounded-full w-24 mx-auto" /></td>
                                        <td className="py-4 px-4"><div className="h-4 bg-gray-100 rounded w-24 ml-auto" /></td>
                                        <td className="py-4 px-6"><div className="h-8 bg-gray-100 rounded w-20 mx-auto" /></td>
                                    </tr>
                                ))
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Box className="mx-auto text-gray-200 mb-4" size={60} />
                                        <p className="text-gray-400 font-bold">Không tìm thấy sản phẩm nào</p>
                                        <p className="text-gray-300 text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map((product) => {
                                    const isHighlighted = product.id === highlightedProductId;
                                    return (
                                    <motion.tr
                                        key={product.id}
                                        ref={isHighlighted ? highlightedRowRef : undefined}
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: 1,
                                            backgroundColor: isHighlighted ? ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.3)'] : undefined
                                        }}
                                        transition={isHighlighted ? {
                                            backgroundColor: { duration: 1.5, repeat: 2, ease: 'easeInOut' }
                                        } : undefined}
                                        className={`hover:bg-gray-50/50 transition-colors ${
                                            isHighlighted ? 'ring-2 ring-blue-500 ring-inset' :
                                            product.stockQuantity === 0 ? 'bg-red-50/30' :
                                            product.stockQuantity <= 5 ? 'bg-amber-50/30' : ''
                                        }`}
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <Box size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm truncate max-w-xs">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                                                        SKU: {product.sku || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-sm font-medium text-gray-600">
                                                {getCategoryName(product.categoryId)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-center">
                                                {editingId === product.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(Math.max(0, parseInt(e.target.value) || 0))}
                                                            className="w-20 px-3 py-2 text-center text-sm font-bold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                            autoFocus
                                                            min={0}
                                                        />
                                                        <button
                                                            onClick={() => handleSaveStock(product.id)}
                                                            disabled={updateStockMutation.isPending}
                                                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xl font-black tabular-nums ${
                                                        product.stockQuantity === 0 ? 'text-red-600' :
                                                        product.stockQuantity <= 5 ? 'text-amber-600' : 'text-gray-900'
                                                    }`}>
                                                        {product.stockQuantity}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex justify-center">
                                                {getStockBadge(product.stockQuantity, product.lowStockThreshold)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <span className="text-sm font-bold text-gray-900">
                                                {formatCurrency(product.price)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center">
                                                {editingId !== product.id && (
                                                    <button
                                                        onClick={() => handleEditStock(product)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                                                    >
                                                        <Edit2 size={14} />
                                                        Sửa SL
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-500">
                            Hiển thị <span className="text-gray-900 font-bold">{paginatedProducts.length}</span> trên{' '}
                            <span className="text-gray-900 font-bold">{filteredProducts.length}</span> sản phẩm
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-4 py-2 text-sm font-bold text-gray-900">
                                {page} / {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats Summary */}
            {stats.lowStock + stats.outOfStock > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 to-red-50 rounded-2xl p-6 border border-amber-200"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-lg">Cảnh báo tồn kho</h3>
                            <p className="text-gray-600 text-sm mt-1">
                                Có <span className="font-bold text-amber-600">{stats.lowStock} sản phẩm sắp hết</span> và{' '}
                                <span className="font-bold text-red-600">{stats.outOfStock} sản phẩm đã hết hàng</span>.
                                Vui lòng kiểm tra và nhập thêm hàng.
                            </p>
                            <button
                                onClick={() => setStockFilter('low_stock')}
                                className="mt-3 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
                            >
                                Xem sản phẩm cần nhập
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
