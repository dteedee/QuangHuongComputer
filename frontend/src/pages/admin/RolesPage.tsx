import { useState, useEffect } from 'react';
import { authApi } from '../../api/auth';
import {
    Shield, Plus, Save, Check, Users, Settings,
    ShoppingCart, Wrench, Package, FileText, TrendingUp,
    Megaphone, BarChart3, Cog, ChevronRight, Loader2,
    AlertCircle, CheckCircle2, X, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    groupPermissionsByCategory,
    getPermissionInfo,
    CATEGORY_ORDER,
    type PermissionInfo
} from '../../constants/permissions';

// Icon mapping cho từng category
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Quản lý người dùng': <Users size={20} />,
    'Quản lý vai trò': <Shield size={20} />,
    'Quản lý sản phẩm': <Package size={20} />,
    'Quản lý bán hàng': <ShoppingCart size={20} />,
    'Quản lý sửa chữa': <Wrench size={20} />,
    'Quản lý kho': <Package size={20} />,
    'Quản lý mua hàng': <FileText size={20} />,
    'Kế toán': <TrendingUp size={20} />,
    'Marketing': <Megaphone size={20} />,
    'Báo cáo': <BarChart3 size={20} />,
    'Hệ thống': <Cog size={20} />,
};

// Mô tả vai trò mặc định
const ROLE_DESCRIPTIONS: Record<string, string> = {
    'Admin': 'Toàn quyền quản trị hệ thống',
    'Manager': 'Quản lý cửa hàng, nhân viên, đơn hàng',
    'Technician': 'Kỹ thuật viên sửa chữa',
    'Sales': 'Nhân viên bán hàng',
    'Accountant': 'Kế toán, quản lý tài chính',
    'Marketing': 'Quản lý nội dung, khuyến mãi',
    'Customer': 'Khách hàng đã đăng ký',
};

export const RolesPage = () => {
    const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState<{ id: string; name: string } | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState('');
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter roles based on search term
    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            loadRolePermissions(selectedRole.id);
        } else {
            setRolePermissions([]);
        }
    }, [selectedRole]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rolesData, permsData] = await Promise.all([
                authApi.getRoles(),
                authApi.getAllPermissions()
            ]);
            setRoles(rolesData);
            setPermissions(permsData);
        } catch (error) {
            console.error(error);
            toast.error('Không thể tải dữ liệu');
        } finally {
            setIsLoading(false);
        }
    };

    const loadRolePermissions = async (roleId: string) => {
        try {
            const data = await authApi.getRolePermissions(roleId);
            setRolePermissions(data);
        } catch (error) {
            console.error(error);
            toast.error('Không thể tải quyền hạn của vai trò');
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) {
            toast.error('Vui lòng nhập tên vai trò');
            return;
        }

        setIsCreatingRole(true);
        try {
            await authApi.createRole(newRoleName.trim());
            toast.success('Đã tạo vai trò mới!');
            setNewRoleName('');
            setShowCreateModal(false);
            await loadData();
        } catch (error) {
            toast.error('Lỗi khi tạo vai trò. Tên có thể đã tồn tại.');
        } finally {
            setIsCreatingRole(false);
        }
    };

    const handleDeleteRole = async (roleName: string) => {
        if (roleName === 'Admin') {
            toast.error('Không thể xóa vai trò Admin');
            return;
        }

        if (!window.confirm(`Bạn có chắc muốn xóa vai trò "${roleName}"?\nNgười dùng có vai trò này sẽ mất quyền truy cập.`)) {
            return;
        }

        try {
            await authApi.deleteRole(roleName);
            toast.success('Đã xóa vai trò!');
            if (selectedRole?.name === roleName) {
                setSelectedRole(null);
            }
            await loadData();
        } catch (error) {
            toast.error('Không thể xóa vai trò. Có thể đang được sử dụng.');
        }
    };

    const savePermissions = async () => {
        if (!selectedRole) return;

        setIsSaving(true);
        try {
            await authApi.updateRolePermissions(selectedRole.id, rolePermissions);
            toast.success('Đã lưu quyền hạn thành công!');
        } catch (error) {
            toast.error('Lỗi khi lưu quyền hạn');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePermission = (perm: string) => {
        setRolePermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const toggleAllInCategory = (categoryPerms: PermissionInfo[]) => {
        const permKeys = categoryPerms.map(p => p.key);
        const allSelected = permKeys.every(k => rolePermissions.includes(k));

        if (allSelected) {
            setRolePermissions(prev => prev.filter(p => !permKeys.includes(p)));
        } else {
            setRolePermissions(prev => [...new Set([...prev, ...permKeys])]);
        }
    };

    const groupedPermissions = groupPermissionsByCategory(permissions);

    // Sắp xếp categories theo thứ tự định nghĩa
    const sortedCategories = Object.entries(groupedPermissions).sort(([a], [b]) => {
        const indexA = CATEGORY_ORDER.indexOf(a);
        const indexB = CATEGORY_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const totalPermissions = permissions.length;
    const selectedCount = rolePermissions.length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[#D70018] mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Đang tải dữ liệu phân quyền...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase italic leading-none mb-3">
                        Quản lý <span className="text-[#D70018]">Phân quyền</span>
                    </h1>
                    <p className="text-gray-600 font-semibold text-sm">
                        Cấu hình vai trò và quyền hạn cho từng nhóm người dùng trong hệ thống
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-3 px-6 py-4 bg-[#D70018] hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wide rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                    <Plus size={20} />
                    Tạo vai trò mới
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Roles List - Left Sidebar */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm sticky top-6">
                        <div className="p-6 border-b-2 border-gray-50">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-3">
                                <Shield className="text-[#D70018]" size={22} />
                                Danh sách vai trò
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">{roles.length} vai trò trong hệ thống</p>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-gray-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Tìm vai trò..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#D70018]/10 transition-all outline-none placeholder:text-gray-400"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                            {filteredRoles.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Search size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Không tìm thấy vai trò</p>
                                </div>
                            ) : filteredRoles.map(role => {
                                const isSelected = selectedRole?.id === role.id;
                                const isAdmin = role.name === 'Admin';

                                return (
                                    <motion.div
                                        key={role.id}
                                        whileHover={{ x: 4 }}
                                        onClick={() => setSelectedRole(role)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                                            isSelected
                                                ? 'bg-gray-900 text-white shadow-lg'
                                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm uppercase tracking-wide truncate">
                                                    {role.name}
                                                </span>
                                                {isAdmin && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                        isSelected ? 'bg-amber-400 text-amber-900' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        SUPER
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs mt-1 truncate ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                                                {ROLE_DESCRIPTIONS[role.name] || 'Vai trò tùy chỉnh'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!isAdmin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRole(role.name);
                                                    }}
                                                    className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                                                        isSelected
                                                            ? 'hover:bg-white/20 text-white'
                                                            : 'hover:bg-red-100 text-red-500'
                                                    }`}
                                                    title="Xóa vai trò"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                            <ChevronRight size={18} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Permissions Panel - Right Side */}
                <div className="lg:col-span-8 xl:col-span-9">
                    {selectedRole ? (
                        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                            {/* Role Header */}
                            <div className="p-6 border-b-2 border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#D70018] text-white flex items-center justify-center">
                                            <Shield size={22} />
                                        </div>
                                        {selectedRole.name}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {ROLE_DESCRIPTIONS[selectedRole.name] || 'Cấu hình quyền hạn cho vai trò này'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-2xl font-black text-gray-900">{selectedCount}/{totalPermissions}</p>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">quyền đã chọn</p>
                                    </div>
                                    <button
                                        onClick={savePermissions}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold uppercase tracking-wide rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 active:scale-95"
                                    >
                                        {isSaving ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(selectedCount / totalPermissions) * 100}%` }}
                                            className="h-full bg-gradient-to-r from-[#D70018] to-amber-500 rounded-full"
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-600 whitespace-nowrap">
                                        {Math.round((selectedCount / totalPermissions) * 100)}%
                                    </span>
                                </div>
                            </div>

                            {/* Permissions Grid */}
                            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 max-h-[calc(100vh-400px)] overflow-y-auto">
                                {sortedCategories.map(([category, perms]) => {
                                    const allSelected = perms.every(p => rolePermissions.includes(p.key));
                                    const someSelected = perms.some(p => rolePermissions.includes(p.key));

                                    return (
                                        <div
                                            key={category}
                                            className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden"
                                        >
                                            {/* Category Header */}
                                            <div
                                                onClick={() => toggleAllInCategory(perms)}
                                                className="p-4 bg-white border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                        allSelected
                                                            ? 'bg-[#D70018] text-white'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {CATEGORY_ICONS[category] || <Settings size={20} />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">
                                                            {category}
                                                        </h3>
                                                        <p className="text-xs text-gray-500">
                                                            {perms.filter(p => rolePermissions.includes(p.key)).length}/{perms.length} quyền
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                    allSelected
                                                        ? 'bg-[#D70018] border-[#D70018] text-white'
                                                        : someSelected
                                                            ? 'bg-amber-100 border-amber-400'
                                                            : 'border-gray-300 bg-white'
                                                }`}>
                                                    {allSelected && <Check size={14} strokeWidth={3} />}
                                                    {someSelected && !allSelected && <div className="w-2 h-2 bg-amber-500 rounded-full" />}
                                                </div>
                                            </div>

                                            {/* Permission Items */}
                                            <div className="p-3 space-y-1">
                                                {perms.map(perm => {
                                                    const isChecked = rolePermissions.includes(perm.key);

                                                    return (
                                                        <label
                                                            key={perm.key}
                                                            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                                                isChecked
                                                                    ? 'bg-white shadow-sm border border-gray-100'
                                                                    : 'hover:bg-white/50'
                                                            }`}
                                                        >
                                                            <div
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    togglePermission(perm.key);
                                                                }}
                                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                                                    isChecked
                                                                        ? 'bg-[#D70018] border-[#D70018] text-white'
                                                                        : 'border-gray-300 bg-white hover:border-gray-400'
                                                                }`}
                                                            >
                                                                {isChecked && <Check size={12} strokeWidth={3} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-semibold ${
                                                                    isChecked ? 'text-gray-900' : 'text-gray-600'
                                                                }`}>
                                                                    {perm.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {perm.description}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 h-[600px] flex flex-col items-center justify-center text-center p-8">
                            <div className="w-24 h-24 rounded-3xl bg-gray-100 flex items-center justify-center mb-6">
                                <Shield size={48} className="text-gray-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-400 uppercase tracking-tight mb-2">
                                Chọn một vai trò
                            </h3>
                            <p className="text-gray-500 max-w-md">
                                Chọn vai trò từ danh sách bên trái để xem và cấu hình quyền hạn
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Role Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                                    Tạo vai trò mới
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Sau khi tạo, bạn có thể phân quyền cho vai trò này
                                </p>
                            </div>

                            <form onSubmit={handleCreateRole} className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                                        Tên vai trò
                                    </label>
                                    <input
                                        type="text"
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        placeholder="Ví dụ: Supervisor, Cashier..."
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:border-[#D70018] focus:bg-white transition-all"
                                        autoFocus
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Tên vai trò nên ngắn gọn, dễ nhớ và không có ký tự đặc biệt
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold uppercase tracking-wide rounded-xl hover:bg-gray-200 transition-all"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreatingRole || !newRoleName.trim()}
                                        className="flex-1 py-3 px-4 bg-[#D70018] text-white font-bold uppercase tracking-wide rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isCreatingRole ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Plus size={18} />
                                        )}
                                        {isCreatingRole ? 'Đang tạo...' : 'Tạo vai trò'}
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
