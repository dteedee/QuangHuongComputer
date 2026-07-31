import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Store as StoreIcon,
    Plus,
    Edit2,
    Trash2,
    Search,
    X,
    Check,
    MapPin,
    Phone,
    Building2,
    ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';
import { storeApi, type Store } from '../../api/store';
import StoreForm from '../../components/admin/store-form';

/**
 * Trang quản trị chi nhánh (Store).
 *
 * Chức năng:
 * - Bảng danh sách: Code, Name, Địa chỉ, Phone, IsActive (toggle), IsPickupPoint (badge)
 * - Tạo mới / Sửa qua `<StoreForm />` (đã có sẵn từ Phase 05 stream trước)
 * - Xác nhận trước khi xoá (dùng `useConfirm`)
 * - Filter Active/Inactive/All + tìm theo tên/mã/địa chỉ/SĐT
 */

type StatusFilter = 'all' | 'active' | 'inactive';

export default function StoresPage() {
    const confirm = useConfirm();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const loadStores = useCallback(async () => {
        setLoading(true);
        try {
            const data = await storeApi.list();
            // Sắp xếp theo sortOrder rồi theo tên
            data.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'vi'));
            setStores(data);
        } catch {
            toast.error('Không tải được danh sách chi nhánh');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStores();
    }, [loadStores]);

    const openCreate = () => {
        setEditingId(null);
        setFormOpen(true);
    };

    const openEdit = (id: string) => {
        setEditingId(id);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
    };

    const handleDelete = async (store: Store) => {
        const ok = await confirm({
            title: 'Xoá chi nhánh',
            message: `Bạn có chắc muốn xoá chi nhánh "${store.name}"?\nHành động này không thể hoàn tác.`,
            variant: 'danger',
            confirmText: 'Xoá',
        });
        if (!ok) return;
        try {
            await storeApi.remove(store.id);
            toast.success('Đã xoá chi nhánh');
            loadStores();
        } catch (err) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            toast.error(anyErr.response?.data?.message || 'Không thể xoá chi nhánh');
        }
    };

    const handleToggleActive = async (store: Store) => {
        setTogglingId(store.id);
        try {
            // Lấy detail để giữ nguyên link warehouses/employees, tránh mất dữ liệu.
            const detail = await storeApi.get(store.id);
            await storeApi.update(store.id, {
                code: detail.code,
                name: detail.name,
                address: detail.address,
                ward: detail.ward,
                district: detail.district,
                province: detail.province,
                phone: detail.phone,
                email: detail.email,
                openingHoursJson: detail.openingHoursJson,
                latitude: detail.latitude,
                longitude: detail.longitude,
                isActive: !detail.isActive,
                isPickupPoint: detail.isPickupPoint,
                sortOrder: detail.sortOrder,
                warehouseIds: detail.warehouses.map(w => w.warehouseId),
                employeeIds: detail.employees.map(e => e.employeeId),
            });
            toast.success(detail.isActive ? 'Đã tạm ngưng chi nhánh' : 'Đã kích hoạt chi nhánh');
            loadStores();
        } catch (err) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            toast.error(anyErr.response?.data?.message || 'Không thay đổi được trạng thái');
        } finally {
            setTogglingId(null);
        }
    };

    const visibleStores = useMemo(() => {
        return stores.filter(s => {
            if (statusFilter === 'active' && !s.isActive) return false;
            if (statusFilter === 'inactive' && s.isActive) return false;
            if (!debouncedSearch) return true;
            const hay = [s.code, s.name, s.address, s.ward, s.district, s.province, s.phone]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(debouncedSearch);
        });
    }, [stores, statusFilter, debouncedSearch]);

    const stats = useMemo(() => ({
        total: stores.length,
        active: stores.filter(s => s.isActive).length,
        pickup: stores.filter(s => s.isPickupPoint).length,
    }), [stores]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-[var(--accent-primary,#dc2626)]" />
                        Quản lý chi nhánh
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Cấu hình các cửa hàng vật lý — địa chỉ, giờ mở cửa, kho trực thuộc, nhân sự.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-primary,#dc2626)] text-white rounded-xl font-semibold hover:opacity-90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Tạo chi nhánh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={<StoreIcon className="w-6 h-6" />} label="Tổng chi nhánh" value={stats.total} tone="blue" />
                <StatCard icon={<Check className="w-6 h-6" />} label="Đang hoạt động" value={stats.active} tone="green" />
                <StatCard icon={<ShoppingBag className="w-6 h-6" />} label="Nhận tại cửa hàng" value={stats.pickup} tone="amber" />
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm theo mã, tên, địa chỉ, SĐT..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[var(--accent-primary,#dc2626)]/20 outline-none placeholder:text-gray-400"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                            aria-label="Xoá tìm kiếm"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {(['all', 'active', 'inactive'] as StatusFilter[]).map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setStatusFilter(v)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                statusFilter === v
                                    ? 'bg-[var(--accent-primary,#dc2626)] text-white border-transparent'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {v === 'all' ? 'Tất cả' : v === 'active' ? 'Đang hoạt động' : 'Đã tạm ngưng'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-[var(--accent-primary,#dc2626)] rounded-full animate-spin" />
                    </div>
                ) : visibleStores.length === 0 ? (
                    <EmptyState hasFilter={!!debouncedSearch || statusFilter !== 'all'} onCreate={openCreate} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold">Mã</th>
                                    <th className="text-left px-4 py-3 font-semibold">Tên</th>
                                    <th className="text-left px-4 py-3 font-semibold">Địa chỉ</th>
                                    <th className="text-left px-4 py-3 font-semibold">Điện thoại</th>
                                    <th className="text-center px-4 py-3 font-semibold">Trạng thái</th>
                                    <th className="text-center px-4 py-3 font-semibold">Nhận hàng</th>
                                    <th className="text-right px-4 py-3 font-semibold">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleStores.map(s => (
                                    <StoreRow
                                        key={s.id}
                                        store={s}
                                        toggling={togglingId === s.id}
                                        onEdit={() => openEdit(s.id)}
                                        onDelete={() => handleDelete(s)}
                                        onToggleActive={() => handleToggleActive(s)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form modal */}
            {formOpen && (
                <StoreForm
                    editingId={editingId}
                    onClose={closeForm}
                    onSaved={loadStores}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

interface StoreRowProps {
    store: Store;
    toggling: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: () => void;
}

function StoreRow({ store, toggling, onEdit, onDelete, onToggleActive }: StoreRowProps) {
    const fullAddress = [store.address, store.ward, store.district, store.province]
        .filter(Boolean)
        .join(', ');
    return (
        <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
            <td className="px-4 py-3 font-mono text-xs text-gray-600">{store.code}</td>
            <td className="px-4 py-3">
                <button
                    type="button"
                    onClick={onEdit}
                    className="text-left font-semibold text-gray-900 hover:text-[var(--accent-primary,#dc2626)] transition-colors"
                >
                    {store.name}
                </button>
            </td>
            <td className="px-4 py-3 text-gray-600 max-w-md">
                <span className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                    <span className="truncate">{fullAddress || '—'}</span>
                </span>
            </td>
            <td className="px-4 py-3 text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {store.phone || '—'}
                </span>
            </td>
            <td className="px-4 py-3 text-center">
                <button
                    type="button"
                    onClick={onToggleActive}
                    disabled={toggling}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-60 ${
                        store.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                    }`}
                    title={store.isActive ? 'Đang hoạt động — nhấn để tạm ngưng' : 'Đã tạm ngưng — nhấn để bật lại'}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${store.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {store.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                </button>
            </td>
            <td className="px-4 py-3 text-center">
                {store.isPickupPoint ? (
                    <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-semibold">
                        Nhận tại cửa hàng
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">—</span>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xoá"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function EmptyState({ hasFilter, onCreate }: { hasFilter: boolean; onCreate: () => void }) {
    return (
        <div className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <StoreIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
                {hasFilter ? 'Không tìm thấy chi nhánh phù hợp' : 'Chưa có chi nhánh nào'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {hasFilter
                    ? 'Thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác.'
                    : 'Tạo chi nhánh đầu tiên để khách hàng có thể tra cứu điểm bán.'}
            </p>
            {!hasFilter && (
                <button
                    type="button"
                    onClick={onCreate}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary,#dc2626)] text-white rounded-xl font-semibold hover:opacity-90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Tạo chi nhánh
                </button>
            )}
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone: 'blue' | 'green' | 'amber';
}

function StatCard({ icon, label, value, tone }: StatCardProps) {
    const tones: Record<StatCardProps['tone'], string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tones[tone]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
