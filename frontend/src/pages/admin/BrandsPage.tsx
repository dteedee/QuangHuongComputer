import { useState, useEffect } from 'react';
import { catalogApi, type Brand } from '../../api/catalog';
import { 
    Tag, Plus, Edit2, Trash2, Search, X, Check, Package, 
    RefreshCw, AlertCircle, Play, Pause
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

type ModalMode = 'create' | 'edit' | null;

interface FormData {
    name: string;
    description: string;
    isActive: boolean;
}

const initialFormData: FormData = {
    name: '',
    description: '',
    isActive: true,
};

export default function BrandsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const confirm = useConfirm();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        loadBrands();
    }, []);

    const loadBrands = async () => {
        setLoading(true);
        try {
            const data = await catalogApi.getBrands();
            setBrands(data);
        } catch (error) {
            toast.error('Không thể tải danh sách thương hiệu');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setFormData(initialFormData);
        setEditingId(null);
        setModalMode('create');
    };

    const openEditModal = (brand: Brand) => {
        setFormData({
            name: brand.name,
            description: brand.description || '',
            isActive: brand.isActive,
        });
        setEditingId(brand.id);
        setModalMode('edit');
    };

    const closeModal = () => {
        setModalMode(null);
        setEditingId(null);
        setFormData(initialFormData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (modalMode === 'create') {
                await catalogApi.createBrand({
                    name: formData.name,
                    description: formData.description,
                });
                toast.success('Tạo thương hiệu thành công!');
            } else if (editingId) {
                await catalogApi.updateBrand(editingId, {
                    name: formData.name,
                    description: formData.description,
                    isActive: formData.isActive,
                });
                toast.success('Cập nhật thương hiệu thành công!');
            }

            closeModal();
            loadBrands();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (brand: Brand) => {
        try {
            if (brand.isActive) {
                await catalogApi.deleteBrand(brand.id); // Soft delete / deactivate
                toast.success('Đã vô hiệu hóa thương hiệu');
            } else {
                await catalogApi.activateBrand(brand.id);
                toast.success('Đã kích hoạt thương hiệu');
            }
            loadBrands();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể thay đổi trạng thái');
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({ message: 'Bạn có chắc muốn xóa thương hiệu này?', variant: 'danger' });
        if (!ok) return;

        try {
            await catalogApi.deleteBrand(id); // Using soft delete endpoint as hard delete
            toast.success('Đã vô hiệu hóa thương hiệu');
            loadBrands();
        } catch (error) {
            toast.error('Không thể xóa thương hiệu');
        }
    };

    const filteredBrands = brands.filter(brand =>
        !debouncedSearch || 
        brand.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (brand.description && brand.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );

    const activeBrands = brands.filter(b => b.isActive).length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Tag className="w-7 h-7 text-accent" />
                        Quản lý Thương hiệu
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Quản lý danh sách các thương hiệu sản phẩm của hệ thống
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Thêm thương hiệu
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Tag className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tổng số hãng</p>
                        <p className="text-2xl font-black text-gray-900">{brands.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <Check className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Đang hoạt động</p>
                        <p className="text-2xl font-black text-gray-900">{activeBrands}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Đã ẩn</p>
                        <p className="text-2xl font-black text-gray-900">{brands.length - activeBrands}</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="relative flex-1 group max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm thương hiệu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-accent/10 transition-all outline-none placeholder:text-gray-400"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Brands Grid/List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-accent rounded-full animate-spin" />
                </div>
            ) : filteredBrands.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Tag className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {debouncedSearch ? 'Không tìm thấy thương hiệu' : 'Chưa có thương hiệu nào'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {debouncedSearch ? 'Thử tìm kiếm với từ khóa khác' : 'Thêm thương hiệu đầu tiên để bắt đầu quản lý'}
                    </p>
                    {!debouncedSearch && (
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Thêm thương hiệu
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBrands.map((brand) => (
                        <div key={brand.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            {!brand.isActive && (
                                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                                    <div className="absolute top-4 -right-6 w-24 bg-gray-500 text-white text-[10px] font-bold text-center py-1 opacity-90 transform rotate-45 shadow-sm">
                                        ĐÃ ẨN
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className={`text-lg font-bold ${brand.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {brand.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {brand.description || 'Chưa có mô tả'}
                                    </p>
                                    
                                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5 opacity-70">
                                            <Package className="w-4 h-4" />
                                            <span className="font-medium">{brand.productCount || 0} sản phẩm</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => handleToggleStatus(brand)}
                                    className={`p-2 rounded-lg transition-colors ${
                                        brand.isActive 
                                            ? 'text-orange-600 hover:bg-orange-50' 
                                            : 'text-green-600 hover:bg-green-50'
                                    }`}
                                    title={brand.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                >
                                    {brand.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={() => openEditModal(brand)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Chỉnh sửa"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(brand.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Xóa"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeModal}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-xl font-black text-gray-900">
                                {modalMode === 'create' ? 'Thêm thương hiệu mới' : 'Chỉnh sửa thương hiệu'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Tên thương hiệu <span className="text-accent">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="VD: ASUS, MSI, Dell..."
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-accent outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    placeholder="Thông tin về thương hiệu này..."
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-accent outline-none transition-colors resize-none"
                                />
                            </div>

                            {modalMode === 'edit' && (
                                <div className="flex items-center gap-3 pt-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                        <span className="ml-3 text-sm font-bold text-gray-700">Trạng thái hoạt động</span>
                                    </label>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            {modalMode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
