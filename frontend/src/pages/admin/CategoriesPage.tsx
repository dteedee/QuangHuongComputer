import { useState, useMemo } from 'react';
import {
    Plus, Edit, Trash2, Search, Filter, Box, RefreshCw, X, Check, Loader2, MoreVertical,
    Layout, Settings, Tag, Bookmark, Info, ChevronRight, ChevronLeft,
    PlusCircle, AlertCircle, ChevronDown, ChevronUp, RotateCcw, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
    ToggleLeft, ToggleRight
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi, type Category, type Brand } from '../../api/catalog';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const CategoriesPage = () => {
    const [activeType, setActiveType] = useState<'categories' | 'brands'>('categories');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | Brand | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState<'name' | 'isActive'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const queryClient = useQueryClient();

    const { data: categories, isLoading: categoriesLoading } = useQuery({
        queryKey: ['admin-categories'],
        queryFn: () => catalogApi.getCategories(),
    });

    const { data: brands, isLoading: brandsLoading } = useQuery({
        queryKey: ['admin-brands'],
        queryFn: () => catalogApi.getBrands(),
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string, description: string }) =>
            activeType === 'categories'
                ? catalogApi.createCategory(data) as Promise<any>
                : catalogApi.createBrand(data) as Promise<any>,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeType === 'categories' ? 'admin-categories' : 'admin-brands'] });
            toast.success(`Thêm thành công!`);
            setIsModalOpen(false);
        },
        onError: () => toast.error('Thao tác thất bại!')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) =>
            activeType === 'categories'
                ? catalogApi.updateCategory(id, data) as Promise<any>
                : catalogApi.updateBrand(id, data) as Promise<any>,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeType === 'categories' ? 'admin-categories' : 'admin-brands'] });
            toast.success('Cập nhật thành công!');
            setIsModalOpen(false);
            setEditingItem(null);
        },
        onError: () => toast.error('Cập nhật thất bại!')
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: string) =>
            activeType === 'categories'
                ? catalogApi.deleteCategory(id) as Promise<any>
                : catalogApi.deleteBrand(id) as Promise<any>,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeType === 'categories' ? 'admin-categories' : 'admin-brands'] });
            toast.success('Đã vô hiệu hóa thành công!');
        },
        onError: () => toast.error('Vô hiệu hóa thất bại!')
    });

    const activateMutation = useMutation({
        mutationFn: (id: string) =>
            activeType === 'categories'
                ? catalogApi.activateCategory(id) as Promise<any>
                : catalogApi.activateBrand(id) as Promise<any>,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeType === 'categories' ? 'admin-categories' : 'admin-brands'] });
            toast.success('Đã kích hoạt thành công!');
        },
        onError: () => toast.error('Kích hoạt thất bại!')
    });

    const items = activeType === 'categories' ? categories : brands;
    const isLoading = activeType === 'categories' ? categoriesLoading : brandsLoading;

    // Filter items based on search term
    const filteredItems = items?.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    // Handle pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const sortedItems = [...filteredItems].sort((a, b) => {
            if (sortBy === 'name') {
                return sortOrder === 'asc' 
                    ? a.name.localeCompare(b.name) 
                    : b.name.localeCompare(a.name);
            } else {
                return sortOrder === 'asc'
                    ? (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1)
                    : (a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1);
            }
        });
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage, sortBy, sortOrder]);

    // Handle selection
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setSelectAllChecked(isChecked);
        
        if (isChecked) {
            const currentPageIds = paginatedItems.map(item => item.id);
            setSelectedIds([...new Set([...selectedIds, ...currentPageIds])]);
        } else {
            const currentPageIds = paginatedItems.map(item => item.id);
            setSelectedIds(selectedIds.filter(id => !currentPageIds.includes(id)));
        }
    };

    const handleSelectItem = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        
        if (isChecked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        }
        
        // Update select all checkbox state
        const allPageItemsSelected = paginatedItems.every(item => 
            selectedIds.includes(item.id) || item.id === id
        );
        setSelectAllChecked(allPageItemsSelected && paginatedItems.length > 0);
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        const confirmMessage = `Bạn có chắc muốn vô hiệu hóa ${selectedIds.length} mục đã chọn? Hành động này không thể hoàn tác.`;
        if (confirm(confirmMessage)) {
            selectedIds.forEach(id => deactivateMutation.mutate(id));
            setSelectedIds([]);
            setSelectAllChecked(false);
        }
    };

    const handleToggleStatus = (item: Category | Brand) => {
        const action = item.isActive ? 'vô hiệu hóa' : 'kích hoạt';
        const warning = item.isActive ? ' Các sản phẩm liên quan cũng sẽ không hiển thị.' : '';

        if (confirm(`Bạn có chắc muốn ${action} mục này?${warning}`)) {
            if (item.isActive) {
                deactivateMutation.mutate(item.id);
            } else {
                activateMutation.mutate(item.id);
            }
        }
    };

    const getSortIcon = (field: string) => {
        if (sortBy !== field) return <ChevronDown size={16} className="text-gray-400" />;
        return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    };

    const handleSort = (field: 'name' | 'isActive') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedIds([]);
        setSelectAllChecked(false);
        setCurrentPage(1);
    };

    const handleOpenModal = (item: Category | Brand | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const data: any = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            isActive: formData.get('isActive') === 'true'
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-24">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-10 space-y-8">
                {/* Modern Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                            <Box className="text-[#D70018]" size={32} />
                            Quản lý Phân loại & Thương hiệu
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Tổ chức danh mục sản phẩm và các hãng sản xuất của bạn.</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#D70018] text-white text-sm font-bold rounded-2xl shadow-lg shadow-red-500/20 hover:bg-[#B50014] transition-all"
                    >
                        <PlusCircle size={20} />
                        Thêm {activeType === 'categories' ? 'Danh mục' : 'Thương hiệu'}
                    </motion.button>
                </div>

                {/* Type Switcher & Search */}
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-2 w-full lg:w-auto">
                        <button
                            onClick={() => setActiveType('categories')}
                            className={`flex-1 lg:w-40 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeType === 'categories' ? 'bg-gray-950 text-white shadow-xl translate-y-[-2px]' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <Tag size={18} /> Danh mục
                        </button>
                        <button
                            onClick={() => setActiveType('brands')}
                            className={`flex-1 lg:w-40 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeType === 'brands' ? 'bg-gray-950 text-white shadow-xl translate-y-[-2px]' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <Bookmark size={18} /> Thương hiệu
                        </button>
                    </div>

                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D70018] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder={`Tìm kiếm ${activeType === 'categories' ? 'danh mục' : 'thương hiệu'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-6 py-5 bg-white border-none rounded-[2rem] text-sm font-semibold text-gray-900 shadow-sm focus:ring-2 focus:ring-[#D70018]/10 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* List Content - Table View */}
                {isLoading ? (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="animate-pulse">
                            <div className="h-12 bg-gray-100 border-b border-gray-200"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-20 bg-gray-50 border-b border-gray-200"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Bulk Actions */}
                        {selectedIds.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-blue-800">
                                        {selectedIds.length} mục được chọn
                                    </span>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="text-sm font-bold text-red-600 hover:text-red-700 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        Vô hiệu hóa đã chọn
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="text-sm font-bold text-gray-600 hover:text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Bỏ chọn
                                </button>
                            </div>
                        )}

                        {/* Data Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Table Header */}
                            <div className="border-b border-gray-200 bg-gray-50">
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    <div className="col-span-1 flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectAllChecked}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-[#D70018] bg-gray-100 border-gray-300 rounded focus:ring-[#D70018] cursor-pointer"
                                        />
                                    </div>
                                    <div className="col-span-1">STT</div>
                                    <div className="col-span-3">Tên</div>
                                    <div className="col-span-4">Mô tả</div>
                                    <div className="col-span-2">Trạng thái</div>
                                    <div className="col-span-1">Thao tác</div>
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-gray-200">
                                {paginatedItems.length > 0 ? (
                                    paginatedItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`grid grid-cols-12 gap-4 px-6 py-4 text-sm font-medium transition-colors hover:bg-gray-50 ${!item.isActive ? 'bg-gray-50/50' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <div className="col-span-1 flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={(e) => handleSelectItem(item.id, e)}
                                                    className="w-4 h-4 text-[#D70018] bg-gray-100 border-gray-300 rounded focus:ring-[#D70018] cursor-pointer"
                                                />
                                            </div>

                                            {/* STT */}
                                            <div className="col-span-1 text-gray-500">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </div>

                                            {/* Name with Icon */}
                                            <div className="col-span-3 flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${activeType === 'categories' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                    {activeType === 'categories' ? 
                                                        <Tag size={16} className="fill-current" /> : 
                                                        <Bookmark size={16} className="fill-current" />
                                                    }
                                                </div>
                                                <Tooltip content={item.name} place="right" delayShow={300}>
                                                    <span className="text-gray-900 hover:text-[#D70018] cursor-help">
                                                        {item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name}
                                                    </span>
                                                </Tooltip>
                                            </div>

                                            {/* Description with Tooltip */}
                                            <div className="col-span-4">
                                                <Tooltip 
                                                    content={item.description || 'Không có mô tả'} 
                                                    place="right" 
                                                    delayShow={300}
                                                    className="max-w-xs"
                                                >
                                                    <p className="text-gray-600 cursor-help">
                                                        {item.description 
                                                            ? item.description.length > 60 
                                                                ? item.description.substring(0, 60) + '...' 
                                                                : item.description
                                                            : 'Không có mô tả'
                                                        }
                                                    </p>
                                                </Tooltip>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                                    item.isActive 
                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                                        : 'bg-red-100 text-red-700 border border-red-200'
                                                }`}>
                                                    {item.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-1 flex items-center justify-end gap-2">
                                                <Tooltip content="Chỉnh sửa" place="top" delayShow={300}>
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:bg-[#D70018] hover:text-white transition-all"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={item.isActive ? "Vô hiệu hóa" : "Kích hoạt"} place="top" delayShow={300}>
                                                    <button
                                                        onClick={() => handleToggleStatus(item)}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                                            item.isActive
                                                                ? 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'
                                                                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800'
                                                        }`}
                                                    >
                                                        {item.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center">
                                        <Search size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500 font-bold">Không tìm thấy kết quả nào phù hợp</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="border-t border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-700">
                                            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} 
                                            của {filteredItems.length} kết quả
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className={`p-2 rounded-lg ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                <ChevronLeftIcon size={20} />
                                            </button>
                                            
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-10 h-10 rounded-lg font-bold transition-all ${
                                                            currentPage === pageNum
                                                                ? 'bg-[#D70018] text-white shadow-lg'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                <ChevronRightIcon size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
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
                            className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-white">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                        {editingItem ? 'Chỉnh sửa' : 'Thêm mới'} {activeType === 'categories' ? 'Danh mục' : 'Thương hiệu'}
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium">Nhập thông tin cơ bản để hiển thị trên hệ thống.</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-gray-700">Tên hiển thị *</label>
                                    <input
                                        name="name"
                                        required
                                        defaultValue={editingItem?.name}
                                        placeholder={`Ví dụ: ${activeType === 'categories' ? 'Laptop Gaming' : 'ASUS'}`}
                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-base font-semibold focus:ring-2 focus:ring-[#D70018]/10 outline-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-gray-700">Mô tả ngắn</label>
                                    <textarea
                                        name="description"
                                        defaultValue={editingItem?.description}
                                        rows={4}
                                        placeholder="Mô tả tóm tắt..."
                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-[#D70018]/10"
                                    />
                                </div>

                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-900 uppercase">Trạng thái hoạt động</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Nếu tắt, mục này sẽ không hiển thị trên trang chủ.</p>
                                    </div>
                                    <select
                                        name="isActive"
                                        defaultValue={editingItem ? (editingItem.isActive ? 'true' : 'false') : 'true'}
                                        className="px-4 py-2 bg-white border-none rounded-xl text-xs font-bold shadow-sm outline-none cursor-pointer"
                                    >
                                        <option value="true">HOẠT ĐỘNG</option>
                                        <option value="false">TẠM DỪNG</option>
                                    </select>
                                </div>

                                {editingItem && (
                                    <div className="flex items-start gap-4 p-5 bg-red-50 rounded-2xl border border-red-100">
                                        <AlertCircle className="text-[#D70018] flex-shrink-0" size={20} />
                                        <p className="text-[11px] text-red-900 font-medium leading-relaxed">
                                            Lưu ý: Nếu thay đổi trạng thái thành "Tạm dừng", toàn bộ sản phẩm thuộc mục này sẽ không được liệt kê trên website cho đến khi được kích hoạt lại.
                                        </p>
                                    </div>
                                )}

                                <div className="pt-4 flex items-center gap-4 font-sans">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-100 transition-all">Hủy</button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="flex-[2] py-4 bg-[#D70018] text-white text-sm font-bold rounded-2xl shadow-xl shadow-red-500/20 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
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
