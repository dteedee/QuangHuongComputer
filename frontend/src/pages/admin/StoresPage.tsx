/**
 * Trang quản trị chi nhánh (Store) — viết lại giao diện theo design-guidelines §9.
 *
 * Chức năng giữ nguyên: bảng danh sách, tạo/sửa qua `<StoreForm />`, xác nhận trước khi
 * xoá, lọc Đang hoạt động / Tạm ngưng / Tất cả, tìm theo tên/mã/địa chỉ/SĐT.
 *
 * Đổi về giao diện:
 *  · `<table>` tự viết → `DataTable` của bộ UI kit (§9.3).
 *  · `StatCard`, `PageHeader`, `Input`, `Button`, `StatusBadge` của kit thay cho bản tự chế.
 *  · Hết `var(--accent-primary,#dc2626)`, hết `gray-*`, hết `bg-white` — dùng token (§9.1).
 *  · Bỏ `p-6 max-w-7xl mx-auto`: vỏ admin đã lo padding, trang dùng hết bề ngang (§9.2).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Store as StoreIcon, Plus, Edit2, Trash2, Search, Check, MapPin, Phone, ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';
import { storeApi, type Store } from '../../api/store';
import StoreForm from '../../components/admin/store-form';
import {
    Button, Card, DataTable, IconButton, Input, PageHeader, StatCard, StatusBadge,
    type DataTableColumn,
} from '../../components/ui';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'inactive', label: 'Đã tạm ngưng' },
];

export default function StoresPage() {
    const confirm = useConfirm();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const loadStores = useCallback(async () => {
        setLoading(true);
        try {
            const data = await storeApi.adminList();
            data.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'vi'));
            setStores(data);
            setLoadError(null);
        } catch (e) {
            setLoadError(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStores(); }, [loadStores]);

    const openCreate = () => { setEditingId(null); setFormOpen(true); };
    const openEdit = (id: string) => { setEditingId(id); setFormOpen(true); };
    const closeForm = () => { setFormOpen(false); setEditingId(null); };

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
            await storeApi.toggleActive(store.id);
            toast.success(store.isActive ? 'Đã tạm ngưng chi nhánh' : 'Đã kích hoạt chi nhánh');
            loadStores();
        } catch (err) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            toast.error(anyErr.response?.data?.message || 'Không thay đổi được trạng thái');
        } finally {
            setTogglingId(null);
        }
    };

    const visibleStores = useMemo(() => stores.filter((s) => {
        if (statusFilter === 'active' && !s.isActive) return false;
        if (statusFilter === 'inactive' && s.isActive) return false;
        if (!debouncedSearch) return true;
        const hay = [s.code, s.name, s.address, s.ward, s.district, s.province, s.phone]
            .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(debouncedSearch);
    }), [stores, statusFilter, debouncedSearch]);

    const stats = useMemo(() => ({
        total: stores.length,
        active: stores.filter((s) => s.isActive).length,
        pickup: stores.filter((s) => s.isPickupPoint).length,
    }), [stores]);

    const hasFilter = !!debouncedSearch || statusFilter !== 'all';

    const columns: DataTableColumn<Store>[] = [
        { id: 'code', header: 'Mã', nowrap: true, locked: true, cell: (s) => <span className="font-mono text-2xs text-fg-muted">{s.code}</span> },
        {
            id: 'name', header: 'Tên chi nhánh', locked: true,
            cell: (s) => (
                <button type="button" onClick={() => openEdit(s.id)} className="text-left font-medium text-fg hover:text-brand-text">
                    {s.name}
                </button>
            ),
        },
        {
            id: 'address', header: 'Địa chỉ', width: '32rem',
            cell: (s) => {
                const full = [s.address, s.ward, s.district, s.province].filter(Boolean).join(', ');
                return (
                    <span className="flex items-start gap-1.5 text-fg-muted" title={full || undefined}>
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                        <span className="truncate">{full || '—'}</span>
                    </span>
                );
            },
        },
        {
            id: 'phone', header: 'Điện thoại', nowrap: true,
            cell: (s) => (
                <span className="inline-flex items-center gap-1.5 text-fg-muted">
                    <Phone className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
                    {s.phone || '—'}
                </span>
            ),
        },
        {
            id: 'status', header: 'Trạng thái', align: 'center',
            cell: (s) => (
                <button
                    type="button"
                    onClick={() => handleToggleActive(s)}
                    disabled={togglingId === s.id}
                    title={s.isActive ? 'Đang hoạt động — nhấn để tạm ngưng' : 'Đã tạm ngưng — nhấn để bật lại'}
                    className="disabled:opacity-60"
                >
                    <StatusBadge tone={s.isActive ? 'success' : 'neutral'}>
                        {s.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                    </StatusBadge>
                </button>
            ),
        },
        {
            id: 'pickup', header: 'Nhận hàng', align: 'center',
            cell: (s) => s.isPickupPoint
                ? <StatusBadge tone="info">Nhận tại cửa hàng</StatusBadge>
                : <span className="text-2xs text-fg-subtle">—</span>,
        },
        {
            id: 'actions', header: 'Thao tác', align: 'right', width: '1%', locked: true,
            cell: (s) => (
                <div className="flex items-center justify-end gap-1">
                    <IconButton aria-label={`Sửa chi nhánh ${s.name}`} title="Chỉnh sửa" variant="ghost" size="sm" onClick={() => openEdit(s.id)}>
                        <Edit2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton aria-label={`Xoá chi nhánh ${s.name}`} title="Xoá" variant="ghost" size="sm" onClick={() => handleDelete(s)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Chi nhánh"
                description="Cấu hình cửa hàng vật lý — địa chỉ, giờ mở cửa, kho trực thuộc, nhân sự."
                actions={
                    /* Nút đỏ DUY NHẤT của màn hình (§9.1). */
                    <Button size="sm" icon={Plus} onClick={openCreate}>Tạo chi nhánh</Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={StoreIcon} label="Tổng chi nhánh" value={loading ? null : stats.total} />
                <StatCard icon={Check} label="Đang hoạt động" value={loading ? null : stats.active} />
                <StatCard icon={ShoppingBag} label="Nhận tại cửa hàng" value={loading ? null : stats.pickup} />
            </div>

            <Card padded radius="xl">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="min-w-0 flex-1">
                        <Input
                            label="Tìm kiếm"
                            icon={Search}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm theo mã, tên, địa chỉ, SĐT…"
                        />
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2" role="group" aria-label="Lọc theo trạng thái">
                        {STATUS_FILTERS.map((f) => (
                            <Button
                                key={f.value}
                                size="sm"
                                variant={statusFilter === f.value ? 'outline' : 'ghost'}
                                aria-pressed={statusFilter === f.value}
                                className={statusFilter === f.value ? 'border-brand-line bg-brand-subtle text-brand-text' : undefined}
                                onClick={() => setStatusFilter(f.value)}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            <Card padded radius="xl">
                <DataTable
                    caption="Danh sách chi nhánh"
                    columns={columns}
                    rows={loading ? undefined : visibleStores}
                    rowKey={(s) => s.id}
                    loading={loading}
                    error={loadError}
                    onRetry={() => void loadStores()}
                    enableColumnVisibility
                    empty={hasFilter
                        ? {
                            icon: StoreIcon,
                            title: 'Không tìm thấy chi nhánh phù hợp',
                            description: 'Thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác.',
                            action: { label: 'Xoá bộ lọc', onClick: () => { setSearch(''); setStatusFilter('all'); } },
                        }
                        : {
                            icon: StoreIcon,
                            title: 'Chưa có chi nhánh nào',
                            description: 'Tạo chi nhánh đầu tiên để khách hàng có thể tra cứu điểm bán.',
                            action: { label: 'Tạo chi nhánh', onClick: openCreate, icon: Plus },
                        }}
                />
            </Card>

            {formOpen && <StoreForm editingId={editingId} onClose={closeForm} onSaved={loadStores} />}
        </div>
    );
}
