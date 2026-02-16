import { useState, useEffect } from 'react';
import { contentApi, type FlashSale, type CreateFlashSaleDto } from '../../api/content';
import {
    Zap, Plus, Edit2, Trash2, Play, Pause, Clock,
    Calendar, TrendingUp, Package, AlertCircle, X, Check, Search, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import FlashSaleCountdown from '../../components/FlashSaleCountdown';

type ModalMode = 'create' | 'edit' | null;

interface FormData {
    name: string;
    description: string;
    discountType: 'Percentage' | 'FixedAmount';
    discountValue: number;
    startTime: string;
    endTime: string;
    maxDiscount?: number;
    imageUrl?: string;
    bannerImageUrl?: string;
    productIds?: string;
    categoryIds?: string;
    applyToAllProducts: boolean;
    maxQuantityPerOrder?: number;
    totalQuantityLimit?: number;
    displayOrder: number;
    badgeText?: string;
    badgeColor?: string;
}

const initialFormData: FormData = {
    name: '',
    description: '',
    discountType: 'Percentage',
    discountValue: 10,
    startTime: '',
    endTime: '',
    applyToAllProducts: true,
    displayOrder: 0,
    badgeColor: '#D70018',
};

export default function FlashSalesPage() {
    const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [stats, setStats] = useState<{
        total: number;
        active: number;
        scheduled: number;
        ended: number;
        totalSold: number;
    } | null>(null);
    const [filter, setFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const hasActiveFilters = searchTerm || filter;

    const resetFilters = () => {
        setSearchTerm('');
        setFilter('');
    };

    useEffect(() => {
        loadFlashSales();
        loadStats();
    }, [filter]);

    const loadFlashSales = async () => {
        setLoading(true);
        try {
            const data = await contentApi.admin.flashSales.getAll(filter || undefined);
            setFlashSales(data);
        } catch (error) {
            toast.error('Không thể tải danh sách Flash Sales');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await contentApi.admin.flashSales.getStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const openCreateModal = () => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        setFormData({
            ...initialFormData,
            startTime: now.toISOString().slice(0, 16),
            endTime: tomorrow.toISOString().slice(0, 16),
        });
        setEditingId(null);
        setModalMode('create');
    };

    const openEditModal = (flashSale: FlashSale) => {
        setFormData({
            name: flashSale.name,
            description: flashSale.description,
            discountType: flashSale.discountType,
            discountValue: flashSale.discountValue,
            startTime: new Date(flashSale.startTime).toISOString().slice(0, 16),
            endTime: new Date(flashSale.endTime).toISOString().slice(0, 16),
            maxDiscount: flashSale.maxDiscount,
            imageUrl: flashSale.imageUrl,
            bannerImageUrl: flashSale.bannerImageUrl,
            productIds: flashSale.productIds,
            categoryIds: flashSale.categoryIds,
            applyToAllProducts: flashSale.applyToAllProducts,
            maxQuantityPerOrder: flashSale.maxQuantityPerOrder,
            totalQuantityLimit: flashSale.totalQuantityLimit,
            displayOrder: flashSale.displayOrder,
            badgeText: flashSale.badgeText,
            badgeColor: flashSale.badgeColor,
        });
        setEditingId(flashSale.id);
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
            const payload: CreateFlashSaleDto = {
                name: formData.name,
                description: formData.description,
                discountType: formData.discountType,
                discountValue: formData.discountValue,
                startTime: new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString(),
                maxDiscount: formData.maxDiscount,
                imageUrl: formData.imageUrl,
                bannerImageUrl: formData.bannerImageUrl,
                productIds: formData.productIds,
                categoryIds: formData.categoryIds,
                applyToAllProducts: formData.applyToAllProducts,
                maxQuantityPerOrder: formData.maxQuantityPerOrder,
                totalQuantityLimit: formData.totalQuantityLimit,
                displayOrder: formData.displayOrder,
                badgeText: formData.badgeText,
                badgeColor: formData.badgeColor,
            };

            if (modalMode === 'create') {
                await contentApi.admin.flashSales.create(payload);
                toast.success('Tạo Flash Sale thành công!');
            } else if (editingId) {
                await contentApi.admin.flashSales.update(editingId, payload);
                toast.success('Cập nhật Flash Sale thành công!');
            }

            closeModal();
            loadFlashSales();
            loadStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleActivate = async (id: string) => {
        try {
            await contentApi.admin.flashSales.activate(id);
            toast.success('Đã kích hoạt Flash Sale');
            loadFlashSales();
            loadStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể kích hoạt');
        }
    };

    const handleDeactivate = async (id: string) => {
        try {
            await contentApi.admin.flashSales.deactivate(id);
            toast.success('Đã hủy Flash Sale');
            loadFlashSales();
            loadStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể hủy');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa Flash Sale này?')) return;

        try {
            await contentApi.admin.flashSales.delete(id);
            toast.success('Đã xóa Flash Sale');
            loadFlashSales();
            loadStats();
        } catch (error) {
            toast.error('Không thể xóa Flash Sale');
        }
    };

    const getStatusBadge = (status: string, isActive: boolean) => {
        if (!isActive) {
            return (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                    Đã hủy
                </span>
            );
        }

        switch (status) {
            case 'Active':
                return (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Đang diễn ra
                    </span>
                );
            case 'Scheduled':
                return (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sắp diễn ra
                    </span>
                );
            case 'Ended':
                return (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                        Đã kết thúc
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Zap className="w-7 h-7 text-[#D70018]" />
                        Quản lý Flash Sales
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Tạo và quản lý các chương trình Flash Sale
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D70018] text-white rounded-xl font-bold hover:bg-[#b50014] transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Tạo Flash Sale
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                                <p className="text-xs text-gray-500">Tổng cộng</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Play className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-green-600">{stats.active}</p>
                                <p className="text-xs text-gray-500">Đang diễn ra</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-blue-600">{stats.scheduled}</p>
                                <p className="text-xs text-gray-500">Sắp diễn ra</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Pause className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-600">{stats.ended}</p>
                                <p className="text-xs text-gray-500">Đã kết thúc</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-amber-600">{stats.totalSold}</p>
                                <p className="text-xs text-gray-500">Đã bán</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
                <div className="flex flex-col lg:flex-row items-stretch gap-4">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D70018] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên chương trình Flash Sale..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#D70018]/10 transition-all outline-none placeholder:text-gray-400"
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

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-2">
                        {[
                            { value: '', label: 'Tất cả' },
                            { value: 'Active', label: 'Đang diễn ra' },
                            { value: 'Scheduled', label: 'Sắp diễn ra' },
                            { value: 'Ended', label: 'Đã kết thúc' },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => setFilter(tab.value)}
                                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                    filter === tab.value
                                        ? 'bg-[#D70018] text-white shadow-lg shadow-red-500/20'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}

                        {/* Reset Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="flex items-center gap-1.5 px-4 py-3 text-sm font-bold text-gray-500 hover:text-[#D70018] hover:bg-red-50 rounded-xl transition-all"
                            >
                                <RefreshCw size={14} />
                                Đặt lại
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Flash Sales List */}
            {(() => {
                // Apply client-side search filter
                const filteredSales = flashSales.filter(sale =>
                    !debouncedSearch || sale.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    (sale.description && sale.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
                );

                if (loading) {
                    return (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#D70018] rounded-full animate-spin" />
                        </div>
                    );
                }

                if (filteredSales.length === 0) {
                    return (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {debouncedSearch ? 'Không tìm thấy Flash Sale' : 'Chưa có Flash Sale nào'}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {debouncedSearch ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo Flash Sale đầu tiên để bắt đầu'}
                            </p>
                            {!debouncedSearch && (
                                <button
                                    onClick={openCreateModal}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#D70018] text-white rounded-xl font-bold hover:bg-[#b50014] transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Tạo Flash Sale
                                </button>
                            )}
                        </div>
                    );
                }

                return (
                    <div className="space-y-4">
                        {filteredSales.map((sale) => (
                        <div
                            key={sale.id}
                            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-gray-900">{sale.name}</h3>
                                        {getStatusBadge(sale.status, sale.isActive)}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-3">{sale.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1 text-[#D70018] font-bold">
                                            <Zap className="w-4 h-4" />
                                            {sale.discountType === 'Percentage'
                                                ? `-${sale.discountValue}%`
                                                : `-${sale.discountValue.toLocaleString()}đ`}
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(sale.startTime).toLocaleDateString('vi-VN')} -{' '}
                                            {new Date(sale.endTime).toLocaleDateString('vi-VN')}
                                        </div>
                                        {sale.totalQuantityLimit && (
                                            <div className="flex items-center gap-1 text-gray-500">
                                                <Package className="w-4 h-4" />
                                                {sale.soldQuantity}/{sale.totalQuantityLimit} đã bán
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {sale.status === 'Active' && sale.isActive && (
                                    <div className="shrink-0">
                                        <FlashSaleCountdown
                                            endTime={sale.endTime}
                                            variant="compact"
                                            showLabel={false}
                                        />
                                    </div>
                                )}

                                <div className="flex items-center gap-2 shrink-0">
                                    {sale.isActive && sale.status !== 'Ended' ? (
                                        <button
                                            onClick={() => handleDeactivate(sale.id)}
                                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="Hủy Flash Sale"
                                        >
                                            <Pause className="w-5 h-5" />
                                        </button>
                                    ) : sale.status !== 'Ended' ? (
                                        <button
                                            onClick={() => handleActivate(sale.id)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Kích hoạt Flash Sale"
                                        >
                                            <Play className="w-5 h-5" />
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={() => openEditModal(sale)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Chỉnh sửa"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(sale.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Xóa"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                );
            })()}

            {/* Create/Edit Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeModal}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-[#D70018] to-[#ff4d4d] px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-white">
                                    {modalMode === 'create' ? 'Tạo Flash Sale mới' : 'Chỉnh sửa Flash Sale'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Tên Flash Sale *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="VD: Flash Sale Tết 2026"
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    placeholder="Mô tả ngắn về chương trình khuyến mãi"
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none resize-none placeholder:text-gray-400"
                                />
                            </div>

                            {/* Discount Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Loại giảm giá *
                                    </label>
                                    <select
                                        value={formData.discountType}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                discountType: e.target.value as 'Percentage' | 'FixedAmount',
                                            })
                                        }
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                    >
                                        <option value="Percentage">Phần trăm (%)</option>
                                        <option value="FixedAmount">Số tiền cố định (đ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Giá trị giảm *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.discountValue}
                                        onChange={(e) =>
                                            setFormData({ ...formData, discountValue: Number(e.target.value) })
                                        }
                                        required
                                        min={1}
                                        max={formData.discountType === 'Percentage' ? 100 : undefined}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Time Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Thời gian bắt đầu *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Thời gian kết thúc *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Quantity Limits */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Giới hạn mỗi đơn hàng
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxQuantityPerOrder || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                maxQuantityPerOrder: e.target.value ? Number(e.target.value) : undefined,
                                            })
                                        }
                                        placeholder="Không giới hạn"
                                        min={1}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Tổng số lượng giới hạn
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.totalQuantityLimit || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                totalQuantityLimit: e.target.value ? Number(e.target.value) : undefined,
                                            })
                                        }
                                        placeholder="Không giới hạn"
                                        min={1}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Badge Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Badge text
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.badgeText || ''}
                                        onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                                        placeholder="VD: HOT, SALE, -50%"
                                        maxLength={20}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#D70018] outline-none placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Badge color
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.badgeColor || '#D70018'}
                                            onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value })}
                                            className="w-12 h-10 border-2 border-gray-200 rounded-lg cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formData.badgeColor || '#D70018'}
                                            onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value })}
                                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#D70018] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Apply to all products */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="applyToAll"
                                    checked={formData.applyToAllProducts}
                                    onChange={(e) =>
                                        setFormData({ ...formData, applyToAllProducts: e.target.checked })
                                    }
                                    className="w-5 h-5 rounded border-gray-300 text-[#D70018] focus:ring-[#D70018]"
                                />
                                <label htmlFor="applyToAll" className="text-sm font-medium text-gray-700">
                                    Áp dụng cho tất cả sản phẩm
                                </label>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4">
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
                                    className="flex-1 px-4 py-3 bg-[#D70018] text-white rounded-xl font-bold hover:bg-[#b50014] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            {modalMode === 'create' ? 'Tạo Flash Sale' : 'Lưu thay đổi'}
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
