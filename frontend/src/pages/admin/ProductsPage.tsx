import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Box, RefreshCw, ChevronRight, MoreVertical, X, Check, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi, type Product, type CreateProductDto } from '../../api/catalog';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const AdminProductsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const queryClient = useQueryClient();

    const { data: response, isLoading } = useQuery({
        queryKey: ['admin-products', page],
        queryFn: () => catalogApi.getProducts({ page, pageSize }),
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => catalogApi.getCategories(),
    });

    const { data: brands } = useQuery({
        queryKey: ['brands'],
        queryFn: () => catalogApi.getBrands(),
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateProductDto) => catalogApi.createProduct(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            toast.success('Thêm sản phẩm thành công!');
            setIsModalOpen(false);
        },
        onError: () => toast.error('Thêm sản phẩm thất bại!')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => catalogApi.updateProduct(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            toast.success('Cập nhật sản phẩm thành công!');
            setIsModalOpen(false);
            setEditingProduct(null);
        },
        onError: () => toast.error('Cập nhật thất bại!')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => catalogApi.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            toast.success('Xóa sản phẩm thành công!');
        },
        onError: () => toast.error('Xóa thất bại!')
    });

    const products = response?.products || [];
    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (product: Product | null = null) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            price: Number(formData.get('price')),
            categoryId: formData.get('categoryId') as string,
            brandId: formData.get('brandId') as string,
            stockQuantity: Number(formData.get('stockQuantity'))
        };

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Sản phẩm</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Danh mục hàng hóa và quản lý thuộc tính sản phẩm
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Thêm sản phẩm mới
                </button>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#D70018] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên sản phẩm, mã SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all shadow-sm shadow-gray-200/50"
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl hover:text-[#D70018] hover:border-red-100 transition-all shadow-sm shadow-gray-200/50 font-black uppercase text-[10px] tracking-widest">
                    <Filter size={18} />
                    Lọc nâng cao
                </button>
            </div>

            {/* Products Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Sản phẩm</th>
                                <th className="px-8 py-5">Danh mục</th>
                                <th className="px-8 py-5">Giá bán</th>
                                <th className="px-8 py-5">Tồn kho</th>
                                <th className="px-8 py-5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <RefreshCw className="mx-auto text-[#D70018] animate-spin mb-4" size={40} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Đang tải danh mục sản phẩm...</p>
                                    </td>
                                </tr>
                            ) : filteredProducts?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <Box className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Không tìm thấy sản phẩm nào phù hợp.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts?.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-white border border-gray-100 shadow-inner overflow-hidden flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                                    <Box size={24} className="text-gray-200" />
                                                </div>
                                                <div className="max-w-xs">
                                                    <p className="text-xs font-black text-gray-800 uppercase italic tracking-tight mb-1 group-hover:text-[#D70018] transition-colors">{product.name}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase truncate">{product.description || 'Chưa có mô tả'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-2.5 py-1 rounded-lg italic">
                                                {categories?.find(c => c.id === product.categoryId)?.name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 font-black text-gray-900 tracking-tighter text-base">
                                            ₫{product.price.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${product.stockQuantity > 10 ? 'bg-emerald-500' : product.stockQuantity > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${Math.min(product.stockQuantity * 5, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-black uppercase ${product.stockQuantity > 10 ? 'text-emerald-500' : product.stockQuantity > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {product.stockQuantity}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button onClick={() => handleOpenModal(product)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-500 hover:border-blue-100 transition-all shadow-sm">
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Xác nhận xóa sản phẩm này?')) {
                                                            deleteMutation.mutate(product.id);
                                                        }
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Pagination UI */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                    Hiển thị <span className="text-gray-900">{products.length}</span> / <span className="text-gray-900">{response?.total || 0}</span> sản phẩm
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] disabled:opacity-30 transition-all"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={!response?.total || page >= Math.ceil(response.total / pageSize)}
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] disabled:opacity-30 transition-all"
                    >
                        Trang kế tiếp
                    </button>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-gray-50">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                                        {editingProduct ? 'Cập nhật' : 'Thêm'} <span className="text-[#D70018]">Sản phẩm</span>
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Thông tin chi tiết sản phẩm hệ thống</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-[#D70018] transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên sản phẩm</label>
                                        <input
                                            name="name"
                                            defaultValue={editingProduct?.name}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all"
                                            placeholder="Ví dụ: Laptop Gaming ASUS ROG Strix..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Danh mục</label>
                                        <select
                                            name="categoryId"
                                            defaultValue={editingProduct?.categoryId}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_1.25rem_center] bg-no-repeat"
                                        >
                                            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thương hiệu</label>
                                        <select
                                            name="brandId"
                                            defaultValue={editingProduct?.brandId}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_1.25rem_center] bg-no-repeat"
                                        >
                                            {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Giá bán (VNĐ)</label>
                                        <input
                                            name="price"
                                            type="number"
                                            defaultValue={editingProduct?.price}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all font-mono"
                                            placeholder="25.000.000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Số lượng tồn</label>
                                        <input
                                            name="stockQuantity"
                                            type="number"
                                            defaultValue={editingProduct?.stockQuantity}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all font-mono"
                                            placeholder="100"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mô tả sản phẩm</label>
                                        <textarea
                                            name="description"
                                            defaultValue={editingProduct?.description}
                                            rows={4}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all resize-none"
                                            placeholder="Nhập thông số kỹ thuật chi tiết..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-8 py-4 bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="flex-[2] flex items-center justify-center gap-3 px-8 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all disabled:opacity-50"
                                    >
                                        {createMutation.isPending || updateMutation.isPending ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Check size={18} />
                                        )}
                                        {editingProduct ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
