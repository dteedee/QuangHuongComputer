import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Box, RefreshCw, MoreVertical, X, Check, Loader2 } from 'lucide-react';
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
            stockQuantity: Number(formData.get('stockQuantity')),
            imageUrl: formData.get('imageUrl') as string
        };

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Quản lý <span className="text-[#D70018]">Sản phẩm</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Danh mục hàng hóa và quản lý thuộc tính sản phẩm
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Thêm sản phẩm mới
                </button>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D70018] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên sản phẩm, mã SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:border-[#D70018] transition-all shadow-sm placeholder:text-gray-400"
                    />
                </div>
                <button className="flex items-center gap-3 px-8 py-5 bg-white border-2 border-gray-100 text-gray-950 rounded-2xl hover:border-[#D70018] transition-all shadow-sm font-black uppercase text-xs tracking-widest">
                    <Filter size={18} />
                    Lọc nâng cao
                </button>
            </div>

            {/* Products Table */}
            <div className="premium-card overflow-hidden border-2">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Sản phẩm</th>
                                <th className="px-8 py-5">Danh mục</th>
                                <th className="px-8 py-5">Giá bán</th>
                                <th className="px-8 py-5">Tồn kho</th>
                                <th className="px-8 py-5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <RefreshCw className="mx-auto text-[#D70018] animate-spin mb-4" size={48} />
                                        <p className="text-sm text-gray-900 font-black uppercase italic tracking-widest">Đang tải danh mục sản phẩm...</p>
                                    </td>
                                </tr>
                            ) : filteredProducts?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <Box className="mx-auto text-gray-100 mb-4" size={80} />
                                        <p className="text-sm text-gray-400 font-black uppercase italic tracking-widest">Không tìm thấy sản phẩm nào phù hợp.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts?.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50/80 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 rounded-xl bg-white border-2 border-gray-50 shadow-sm overflow-hidden flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Box size={28} className="text-gray-200" />
                                                    )}
                                                </div>
                                                <div className="max-w-md">
                                                    <p className="text-base font-black text-gray-950 uppercase italic tracking-tight mb-1 group-hover:text-[#D70018] transition-colors line-clamp-1">{product.name}</p>
                                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide truncate">{product.description || 'Chưa có mô tả chi tiết cho sản phẩm này'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-gray-900 px-3 py-1.5 rounded-lg italic shadow-sm">
                                                {categories?.find(c => c.id === product.categoryId)?.name || 'Chưa phân loại'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 font-black text-gray-950 tracking-tighter text-lg italic">
                                            ₫{product.price.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 w-20 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full rounded-full ${product.stockQuantity > 10 ? 'bg-emerald-500' : product.stockQuantity > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${Math.min(product.stockQuantity * 5, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-black uppercase tracking-tighter ${product.stockQuantity > 10 ? 'text-emerald-600' : product.stockQuantity > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {product.stockQuantity}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button onClick={() => handleOpenModal(product)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-90">
                                                    <Edit size={20} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Xác nhận xóa sản phẩm này?')) {
                                                            deleteMutation.mutate(product.id);
                                                        }
                                                    }}
                                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm active:scale-90"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination UI */}
            <div className="flex justify-between items-center premium-card p-6 border-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest italic">
                    Hiển thị <span className="text-gray-950 underline">{products.length}</span> / <span className="text-gray-950">{response?.total || 0}</span> sản phẩm trong hệ thống
                </p>
                <div className="flex gap-4">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-8 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] hover:border-red-100 disabled:opacity-30 transition-all shadow-sm"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={!response?.total || page >= Math.ceil(response.total / pageSize)}
                        onClick={() => setPage(p => p + 1)}
                        className="px-8 py-3 bg-white border-2 border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-gray-950 hover:text-white hover:bg-gray-950 transition-all shadow-sm"
                    >
                        Trang kế tiếp
                    </button>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border-4 border-gray-100"
                        >
                            <div className="flex items-center justify-between p-10 border-b-2 border-gray-50 bg-gray-50/30">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter">
                                        {editingProduct ? 'Cập nhật' : 'Thêm'} <span className="text-[#D70018]">Sản phẩm</span>
                                    </h2>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Cấu hình thông tin hàng hóa hệ thống</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-gray-100 text-gray-400 hover:bg-red-50 hover:text-[#D70018] hover:border-red-100 transition-all shadow-sm">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Tên sản phẩm đầy đủ</label>
                                        <input
                                            name="name"
                                            defaultValue={editingProduct?.name}
                                            required
                                            className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-950 focus:outline-none focus:border-[#D70018] transition-all shadow-sm"
                                            placeholder="Ví dụ: Laptop Gaming ASUS ROG Strix G16 2024..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Danh mục sản phẩm</label>
                                        <select
                                            name="categoryId"
                                            defaultValue={editingProduct?.categoryId}
                                            required
                                            className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-950 focus:outline-none focus:border-[#D70018] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px] bg-[right_1.5rem_center] bg-no-repeat shadow-sm"
                                        >
                                            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Thương hiệu</label>
                                        <select
                                            name="brandId"
                                            defaultValue={editingProduct?.brandId}
                                            required
                                            className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-950 focus:outline-none focus:border-[#D70018] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px] bg-[right_1.5rem_center] bg-no-repeat shadow-sm"
                                        >
                                            {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Giá bán (VNĐ)</label>
                                        <input
                                            name="price"
                                            type="number"
                                            defaultValue={editingProduct?.price}
                                            required
                                            className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black text-gray-950 focus:outline-none focus:border-[#D70018] transition-all shadow-sm font-mono italic"
                                            placeholder="25.000.000"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Số lượng dự trữ</label>
                                        <input
                                            name="stockQuantity"
                                            type="number"
                                            defaultValue={editingProduct?.stockQuantity}
                                            required
                                            className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black text-gray-950 focus:outline-none focus:border-[#D70018] transition-all shadow-sm font-mono italic"
                                            placeholder="100"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Đường dẫn ảnh sản phẩm (URL)</label>
                                        <input
                                            name="imageUrl"
                                            defaultValue={editingProduct?.imageUrl}
                                            className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-blue-600 focus:outline-none focus:border-[#D70018] transition-all shadow-sm font-mono underline"
                                            placeholder="https://images.quanghuong.vn/products/laptop-asus.jpg"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Mô tả và Thông số kỹ thuật</label>
                                        <textarea
                                            name="description"
                                            defaultValue={editingProduct?.description}
                                            rows={5}
                                            className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-950 focus:outline-none focus:border-[#D70018] transition-all resize-none shadow-sm"
                                            placeholder="Nhập thông tin chi tiết về cấu hình, bảo hành và ưu điểm sản phẩm..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-6 sticky bottom-0 bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-8 py-5 bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all font-sans"
                                    >
                                        Hủy thao tác
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="flex-[2] flex items-center justify-center gap-3 px-8 py-5 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-red-500/30 hover:bg-[#b50014] transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {createMutation.isPending || updateMutation.isPending ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (
                                            <Check size={24} />
                                        )}
                                        {editingProduct ? 'Xác nhận cập nhật' : 'Thêm mới vào hệ thống'}
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
