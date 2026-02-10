import { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Search, Filter, Box, RefreshCw, X, Check, Loader2,
    Image as ImageIcon, Layout, Settings, Share2, DollarSign, Package,
    Shield, Info, ChevronRight, ChevronLeft, PlusCircle, MinusCircle,
    Upload, Star, Eye, Layers
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi, type Product, type CreateProductDto, type UpdateProductDto } from '../../api/catalog';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type FormTab = 'general' | 'catalog' | 'media' | 'specifications' | 'seo';

interface SpecItem {
    label: string;
    value: string;
}

export const AdminProductsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [activeTab, setActiveTab] = useState<FormTab>('general');
    const [page, setPage] = useState(1);
    const pageSize = 12;
    const queryClient = useQueryClient();

    // Specific logic for attributes/specifications
    const [specs, setSpecs] = useState<SpecItem[]>([]);
    const [gallery, setGallery] = useState<string[]>([]);

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

    useEffect(() => {
        if (editingProduct?.specifications) {
            try {
                const parsed = JSON.parse(editingProduct.specifications);
                if (Array.isArray(parsed)) {
                    setSpecs(parsed.length > 0 ? parsed : [{ label: '', value: '' }]);
                } else if (typeof parsed === 'object' && parsed !== null) {
                    // Handle object format {"CPU": "...", "RAM": "..."}
                    const items = Object.entries(parsed).map(([label, value]) => ({
                        label,
                        value: String(value)
                    }));
                    setSpecs(items.length > 0 ? items : [{ label: '', value: '' }]);
                } else {
                    // Fallback if it's just a string
                    setSpecs([{ label: 'Thông tin', value: editingProduct.specifications }]);
                }
            } catch (e) {
                setSpecs([{ label: 'Mô tả', value: editingProduct.specifications }]);
            }
        } else {
            setSpecs([{ label: '', value: '' }]);
        }

        // Initialize gallery
        if (editingProduct?.galleryImages) {
            try {
                // Try to parse as JSON first
                const parsed = JSON.parse(editingProduct.galleryImages);
                if (Array.isArray(parsed)) {
                    setGallery(parsed);
                } else {
                    // Fallback to comma-separated if it's not a JSON array
                    setGallery(editingProduct.galleryImages.split(',').filter(url => url.trim() !== ''));
                }
            } catch (e) {
                // Fallback to comma-separated if parsing fails
                setGallery(editingProduct.galleryImages.split(',').filter(url => url.trim() !== ''));
            }
        } else {
            setGallery([]);
        }
    }, [editingProduct]);

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
        mutationFn: ({ id, data }: { id: string, data: UpdateProductDto }) => catalogApi.updateProduct(id, data),
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
    const filteredProducts = products; // Filtering should ideally be server-side but for now...

    const handleOpenModal = (product: Product | null = null) => {
        setEditingProduct(product);
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const handleAddSpec = () => {
        setSpecs([...specs, { label: '', value: '' }]);
    };

    const handleRemoveSpec = (index: number) => {
        setSpecs(specs.filter((_, i) => i !== index));
    };

    const handleSpecChange = (index: number, field: keyof SpecItem, val: string) => {
        const newSpecs = [...specs];
        newSpecs[index][field] = val;
        setSpecs(newSpecs);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Convert specs to JSON string
        const specsJson = JSON.stringify(specs.filter(s => s.label.trim() !== ''));

        const data: any = {
            name: (formData.get('name') as string) || editingProduct?.name || '',
            description: (formData.get('description') as string) || editingProduct?.description || '',
            price: Number(formData.get('price')) || editingProduct?.price || 0,
            oldPrice: formData.get('oldPrice') ? Number(formData.get('oldPrice')) : undefined,
            costPrice: formData.get('costPrice') ? Number(formData.get('costPrice')) : undefined,
            categoryId: (formData.get('categoryId') as string) || editingProduct?.categoryId,
            brandId: (formData.get('brandId') as string) || editingProduct?.brandId,
            stockQuantity: Number(formData.get('stockQuantity')),
            lowStockThreshold: formData.get('lowStockThreshold') ? Number(formData.get('lowStockThreshold')) : 5,
            sku: (formData.get('sku') as string) || editingProduct?.sku,
            barcode: (formData.get('barcode') as string) || editingProduct?.barcode,
            weight: formData.get('weight') ? Number(formData.get('weight')) : 0,
            imageUrl: (formData.get('imageUrl') as string) || editingProduct?.imageUrl,
            galleryImages: JSON.stringify(gallery), // Store as JSON array for PostgreSQL jsonb
            specifications: specsJson,
            warrantyInfo: (formData.get('warrantyInfo') as string) || editingProduct?.warrantyInfo,
            metaTitle: (formData.get('metaTitle') as string) || editingProduct?.metaTitle,
            metaDescription: (formData.get('metaDescription') as string) || editingProduct?.metaDescription,
            metaKeywords: (formData.get('metaKeywords') as string) || editingProduct?.metaKeywords,
        };

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const tabs = [
        { id: 'general', label: 'Cơ bản', icon: <Info size={18} /> },
        { id: 'catalog', label: 'Giá & Kho', icon: <DollarSign size={18} /> },
        { id: 'media', label: 'Hình ảnh', icon: <ImageIcon size={18} /> },
        { id: 'specifications', label: 'Kỹ thuật', icon: <Settings size={18} /> },
        { id: 'seo', label: 'SEO', icon: <Share2 size={18} /> },
    ];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-24">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-10 space-y-8">
                {/* Modern Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                            <Package className="text-[#D70018]" size={32} />
                            Quản lý Sản phẩm
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Quản lý kho hàng, giá bán và nội dung tiếp thị của bạn.</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#D70018] text-white text-sm font-bold rounded-2xl shadow-lg shadow-red-500/20 hover:bg-[#B50014] transition-all"
                    >
                        <PlusCircle size={20} />
                        Thêm sản phẩm
                    </motion.button>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D70018] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#D70018]/10 transition-all outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <select className="flex-1 lg:w-48 px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-700 outline-none">
                            <option>Tất cả danh mục</option>
                            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-100 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all text-sm font-semibold">
                            <Filter size={18} /> Lọc
                        </button>
                    </div>
                </div>

                {/* Product Cards Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-[400px] bg-white rounded-[2.5rem] border border-gray-100 animate-pulse flex flex-col p-6">
                                <div className="w-full h-48 bg-gray-100 rounded-[2rem] mb-6" />
                                <div className="h-6 bg-gray-100 rounded-full w-3/4 mb-4" />
                                <div className="h-4 bg-gray-100 rounded-full w-1/2 mb-auto" />
                                <div className="h-12 bg-gray-100 rounded-2xl w-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts?.map((product) => (
                            <motion.div
                                layout
                                key={product.id}
                                className="group relative bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300"
                            >
                                <div className="relative aspect-square rounded-[2rem] bg-gray-50 overflow-hidden mb-6 flex items-center justify-center p-8">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="text-gray-200"><Box size={60} /></div>
                                    )}
                                    {product.oldPrice && product.oldPrice > product.price && (
                                        <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">SALE</div>
                                    )}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform opacity-0 group-hover:opacity-100">
                                        <button onClick={() => handleOpenModal(product)} className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:text-blue-600 transition-colors">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => { if (confirm('Xóa sản phẩm này?')) deleteMutation.mutate(product.id) }} className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:text-red-600 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{categories?.find(c => c.id === product.categoryId)?.name || 'Danh mục'}</span>
                                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${product.stockQuantity > 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                <Layers size={10} /> {product.stockQuantity} kho
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 line-clamp-1 leading-tight">{product.name}</h3>
                                        <p className="text-xs text-gray-400 font-medium truncate italic">{product.sku || 'Không có mã SKU'}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                        <div className="flex flex-col">
                                            <span className="text-xl font-extrabold text-gray-900">{formatCurrency(product.price)}</span>
                                            {product.oldPrice && (
                                                <span className="text-xs text-gray-300 line-through font-medium">{formatCurrency(product.oldPrice)}</span>
                                            )}
                                        </div>
                                        <button onClick={() => handleOpenModal(product)} className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-all">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between py-10">
                    <p className="text-sm font-medium text-gray-400">
                        Hiển thị <span className="text-gray-900 font-bold">{response?.products.length || 0}</span> trên <span className="text-gray-900 font-bold">{response?.total || 0}</span> sản phẩm
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="w-12 h-12 flex items-center justify-center text-sm font-bold text-gray-900">
                            {page}
                        </div>
                        <button
                            disabled={!response?.total || page >= Math.ceil(response.total / pageSize)}
                            onClick={() => setPage(p => p + 1)}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Premium Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                        {editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm mới'}
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium">Hoàn thiện thông tin để sản phẩm sẵn sàng lên kệ.</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Tab System */}
                            <div className="flex px-10 py-2 border-b border-gray-50 bg-white/50 overflow-x-auto scrollbar-hide">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as FormTab)}
                                        className={`flex items-center gap-3 px-6 py-4 relative group transition-all`}
                                    >
                                        <span className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-[#D70018] text-white shadow-lg' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                                            {tab.icon}
                                        </span>
                                        <span className={`text-sm font-bold transition-all ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-700'}`}>
                                            {tab.label}
                                        </span>
                                        {activeTab === tab.id && (
                                            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-6 right-6 h-1 bg-[#D70018] rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Form Content */}
                            <form onSubmit={handleSubmit} id="mainForm" className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                                {activeTab === 'general' ? (
                                    <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2 space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Tên sản phẩm *</label>
                                            <input name="name" defaultValue={editingProduct?.name} placeholder="Ví dụ: Laptop Dell XPS 13" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-base font-semibold focus:ring-2 focus:ring-[#D70018]/10 outline-none" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Danh mục</label>
                                            <select name="categoryId" defaultValue={editingProduct?.categoryId} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold outline-none appearance-none cursor-pointer">
                                                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Thương hiệu</label>
                                            <select name="brandId" defaultValue={editingProduct?.brandId} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold outline-none appearance-none cursor-pointer">
                                                {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Mô tả chi tiết</label>
                                            <textarea name="description" defaultValue={editingProduct?.description} rows={8} placeholder="Mô tả các đặc điểm nổi bật..." className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-[#D70018]/10" />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="hidden">
                                        <input type="hidden" name="name" defaultValue={editingProduct?.name} />
                                        <input type="hidden" name="categoryId" defaultValue={editingProduct?.categoryId} />
                                        <input type="hidden" name="brandId" defaultValue={editingProduct?.brandId} />
                                        <textarea className="hidden" name="description" defaultValue={editingProduct?.description} />
                                    </div>
                                )}

                                {activeTab === 'catalog' ? (
                                    <motion.div key="catalog" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Giá bán *</label>
                                            <div className="relative">
                                                <input name="price" type="number" defaultValue={editingProduct?.price} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-xl font-extrabold text-[#D70018] outline-none" />
                                                <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-500">Giá niêm yết (nếu có)</label>
                                            <div className="relative">
                                                <input name="oldPrice" type="number" defaultValue={editingProduct?.oldPrice} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-lg font-bold text-gray-400 line-through outline-none" />
                                                <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Mã SKU</label>
                                            <input name="sku" defaultValue={editingProduct?.sku} placeholder="QH-PRO-001" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none uppercase" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Số lượng tồn kho *</label>
                                            <input name="stockQuantity" type="number" defaultValue={editingProduct?.stockQuantity} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-lg font-bold outline-none text-center" />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="hidden">
                                        <input type="hidden" name="price" defaultValue={editingProduct?.price} />
                                        <input type="hidden" name="oldPrice" defaultValue={editingProduct?.oldPrice} />
                                        <input type="hidden" name="sku" defaultValue={editingProduct?.sku} />
                                        <input type="hidden" name="stockQuantity" defaultValue={editingProduct?.stockQuantity} />
                                        <input type="hidden" name="costPrice" defaultValue={editingProduct?.costPrice} />
                                        <input type="hidden" name="barcode" defaultValue={editingProduct?.barcode} />
                                        <input type="hidden" name="weight" defaultValue={editingProduct?.weight} />
                                        <input type="hidden" name="lowStockThreshold" defaultValue={editingProduct?.lowStockThreshold} />
                                    </div>
                                )}

                                {activeTab === 'media' ? (
                                    <motion.div key="media" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                                        <div className="space-y-4">
                                            <label className="text-sm font-bold text-gray-700">Ảnh đại diện chính</label>
                                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                                <div className="w-full md:w-64 aspect-square rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gray-100 flex items-center justify-center overflow-hidden relative group">
                                                    <img
                                                        id="main-preview"
                                                        src={editingProduct?.imageUrl || ''}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        onLoad={(e) => (e.currentTarget.style.display = 'block')}
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                        <ImageIcon className="text-white" size={32} />
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-6 w-full">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tùy chọn 1: Dán URL</span>
                                                            <input
                                                                name="imageUrl"
                                                                id="imageUrlInput"
                                                                defaultValue={editingProduct?.imageUrl}
                                                                onChange={(e) => { const img = document.getElementById('main-preview') as HTMLImageElement; if (img) img.src = e.target.value; }}
                                                                placeholder="https://example.com/image.jpg"
                                                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium outline-none text-blue-600 focus:ring-2 focus:ring-[#D70018]/10"
                                                            />
                                                        </div>

                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 flex items-center pr-4">
                                                                <div className="h-px w-full bg-gray-100" />
                                                            </div>
                                                            <div className="relative flex justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white px-2">Hoặc</div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tùy chọn 2: Tải ảnh lên</span>
                                                            <div className="flex gap-3">
                                                                <label className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-2xl cursor-pointer hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-900/10">
                                                                    <Upload size={18} />
                                                                    <span className="text-sm font-bold">Chọn tệp từ máy tính</span>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const loadingToast = toast.loading('Đang tải ảnh lên...');
                                                                                try {
                                                                                    const result = await catalogApi.uploadImage(file);
                                                                                    const input = document.getElementById('imageUrlInput') as HTMLInputElement;
                                                                                    const preview = document.getElementById('main-preview') as HTMLImageElement;
                                                                                    if (input) input.value = result.url;
                                                                                    if (preview) preview.src = result.url;
                                                                                    toast.success('Tải ảnh lên thành công!', { id: loadingToast });
                                                                                } catch (err) {
                                                                                    toast.error('Tải ảnh thất bại!', { id: loadingToast });
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6 rounded-3xl bg-amber-50/50 border border-amber-100 flex items-start gap-4">
                                                        <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                                            Khuyên dùng ảnh tỷ lệ 1:1, dung lượng dưới 2MB. Các định dạng hỗ trợ: JPG, PNG, WEBP.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <label className="text-sm font-bold text-gray-700">Bộ sưu tập ảnh liên quan</label>
                                                    <p className="text-[10px] text-gray-400 font-medium">Các ảnh này sẽ xuất hiện trong phần chi tiết sản phẩm.</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl cursor-pointer hover:bg-black transition-all text-xs font-bold">
                                                        <Plus size={14} /> Tải nhiều ảnh
                                                        <input
                                                            type="file"
                                                            multiple
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const files = e.target.files;
                                                                if (!files || files.length === 0) return;

                                                                const loadingToast = toast.loading(`Đang tải ${files.length} ảnh lên...`);
                                                                try {
                                                                    const uploadPromises = Array.from(files).map(file => catalogApi.uploadImage(file));
                                                                    const results = await Promise.all(uploadPromises);
                                                                    const newUrls = results.map(r => r.url);
                                                                    setGallery(prev => [...prev, ...newUrls]);
                                                                    toast.success('Đã tải tất cả ảnh lên!', { id: loadingToast });
                                                                } catch (err) {
                                                                    toast.error('Có lỗi xảy ra khi tải ảnh!', { id: loadingToast });
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const url = prompt('Dán URL hình ảnh:');
                                                            if (url) setGallery(prev => [...prev, url]);
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-xs font-bold"
                                                    >
                                                        <PlusCircle size={14} /> Thêm URL
                                                    </button>
                                                </div>
                                            </div>

                                            {gallery.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                    {gallery.map((url, idx) => (
                                                        <div key={idx} className="relative aspect-square rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden group">
                                                            <img src={url} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setGallery(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="w-8 h-8 bg-white text-red-600 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 gap-3">
                                                    <ImageIcon size={40} />
                                                    <p className="text-xs font-bold uppercase tracking-widest">Chưa có ảnh liên quan</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <input type="hidden" name="imageUrl" defaultValue={editingProduct?.imageUrl} id="imageUrlInput_hidden" />
                                )}

                                {activeTab === 'specifications' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-bold text-gray-700">Thông số kỹ thuật sản phẩm</label>
                                            <button type="button" onClick={handleAddSpec} className="flex items-center gap-2 text-blue-600 text-xs font-bold hover:underline">
                                                <Plus size={14} /> Thêm dòng mới
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {specs.map((item, index) => (
                                                <div key={index} className="flex items-center gap-3">
                                                    <input
                                                        value={item.label}
                                                        onChange={(e) => handleSpecChange(index, 'label', e.target.value)}
                                                        placeholder="Tên thuộc tính (VD: CPU)"
                                                        className="flex-1 px-5 py-3.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none"
                                                    />
                                                    <input
                                                        value={item.value}
                                                        onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                                        placeholder="Giá trị (VD: Core i7)"
                                                        className="flex-[2] px-5 py-3.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none italic"
                                                    />
                                                    <button type="button" onClick={() => handleRemoveSpec(index)} className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                                                        <MinusCircle size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 flex gap-4 mt-10">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                                                <Star size={20} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-blue-900">Tính năng hữu ích</p>
                                                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">Bảng thông số này sẽ tự động được hệ thống render thành bảng chi tiết tại trang sản phẩm của khách hàng.</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'seo' ? (
                                    <motion.div key="seo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Tiêu đề SEO</label>
                                            <input name="metaTitle" defaultValue={editingProduct?.metaTitle} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold outline-none" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Mô tả Meta (Meta Description)</label>
                                            <textarea name="metaDescription" defaultValue={editingProduct?.metaDescription} rows={4} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium outline-none" />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="hidden">
                                        <input type="hidden" name="metaTitle" defaultValue={editingProduct?.metaTitle} />
                                        <textarea className="hidden" name="metaDescription" defaultValue={editingProduct?.metaDescription} />
                                        <input type="hidden" name="metaKeywords" defaultValue={editingProduct?.metaKeywords} />
                                    </div>
                                )}
                            </form>

                            {/* Modal Footer */}
                            <div className="px-10 py-8 bg-white border-t border-gray-100 flex items-center gap-4 sticky bottom-0 z-10 font-sans">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95">Hủy</button>
                                <button type="submit" form="mainForm" disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] py-4 bg-[#D70018] text-white text-sm font-bold rounded-2xl shadow-xl shadow-red-500/20 hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                                    {createMutation.isPending || updateMutation.isPending ? 'Đang thực thi...' : 'Hoàn tất & Lưu lại'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f1f1; border-radius: 10px; }
            `}</style>
        </div>
    );
};
