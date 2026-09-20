// TECH DEBT (D9, phase-05): reorder/update items ở đây gọi N request tuần tự thay vì
// batch. BE đã có PUT /api/content/admin/menus/{menuId}/items/reorder
// (ContentEndpoints.cs:1027, xem contentApi.admin.reorderMenuItems) có thể thay thế
// để giảm round-trip. Giữ nguyên hành vi hiện tại — không tối ưu trong phase này.
//
// Giao diện viết lại theo design-guidelines §9 (đợt đồng bộ back office):
//  · `PageHeader` + `SaveButton` 4 trạng thái — "Đã lưu" không còn là nút đỏ nhạt (§9.4).
//  · Token thay hết `bg-white`/`gray-*`/`slate-*`; tiêu đề `text-xl` chứ không `text-3xl` (§9.2).
//  · Bỏ `max-w-6xl mx-auto` — dùng hết bề ngang màn hình (§9.2), hết khoảng trống bên phải.
//  · Hàng liên kết tách sang `menu-item-row.tsx`, chuẩn hoá payload sang
//    `menu-payload-normalize.ts` để file này nằm dưới ngưỡng 200 dòng.
import { useState, useEffect } from 'react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { contentApi, type MenuItem } from '../../api/content';
import { useConfirm } from '../../context/ConfirmContext';
import { Button, Card, EmptyState, PageHeader, SaveButton, Skeleton, type SaveStatus } from '../../components/ui';
import { MenuItemRow } from './menu-item-row';
import {
    MENU_LOCATIONS, menuIdOf, menuLocationLabel, normalizeMenuItem, normalizeMenuItems,
    type MenuLocationKey,
} from './menu-payload-normalize';

export const MenuManager = () => {
    const queryClient = useQueryClient();
    const [selectedLocation, setSelectedLocation] = useState<MenuLocationKey>('HeaderMain');
    const [localItems, setLocalItems] = useState<MenuItem[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const confirm = useConfirm();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const { data: selectedMenu, isLoading } = useQuery({
        queryKey: ['menu', selectedLocation],
        queryFn: () => contentApi.getMenu(selectedLocation),
    });

    // `menuId` rỗng ⇒ payload không có id dùng được ⇒ chặn mọi mutation thay vì gọi API với id rỗng.
    const menuId = menuIdOf(selectedMenu);

    useEffect(() => {
        setLocalItems(selectedMenu ? normalizeMenuItems(selectedMenu) : []);
        if (selectedMenu) setHasChanges(false);
    }, [selectedMenu]);

    const addMutation = useMutation({
        mutationFn: (data: { menuId: string; item: Partial<MenuItem> }) =>
            contentApi.admin.createMenuItem(data.menuId, data.item),
        onSuccess: (newItem: MenuItem) => {
            // API trả item mới theo hình dạng của backend đang chạy ⇒ chuẩn hoá trước khi đưa vào state.
            setLocalItems((prev) => {
                const normalized = normalizeMenuItem(newItem, menuId, prev.length + 1);
                return normalized ? [...prev, normalized] : prev;
            });
            toast.success('Đã thêm liên kết');
        },
        onError: () => toast.error('Không thêm được liên kết'),
    });

    const deleteMutation = useMutation({
        mutationFn: (data: { menuId: string; itemId: string }) =>
            contentApi.admin.deleteMenuItem(data.menuId, data.itemId),
        onSuccess: (_: unknown, vars: { menuId: string; itemId: string }) => {
            setLocalItems((prev) => prev.filter((i) => i.id !== vars.itemId));
            setDeletingId(null);
            toast.success('Đã xoá liên kết');
        },
        onError: () => { setDeletingId(null); toast.error('Không xoá được liên kết'); },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: { menuId: string; items: MenuItem[] }) => {
            await contentApi.admin.reorderMenuItems(
                data.menuId,
                data.items.map((item, idx) => ({ id: item.id, displayOrder: idx + 1 })),
            );
            for (const item of data.items) {
                await contentApi.admin.updateMenuItem(data.menuId, item.id, {
                    label: item.label, url: item.url, icon: item.icon, openInNewTab: item.openInNewTab,
                });
            }
        },
        onMutate: () => setSaveStatus('saving'),
        onSuccess: () => {
            setHasChanges(false);
            setSaveStatus('saved');
            queryClient.invalidateQueries({ queryKey: ['menu', selectedLocation] });
        },
        /* §9.4: lỗi thì nút trở lại trạng thái rảnh và thông báo lỗi nằm ngay cạnh nút. */
        onError: () => setSaveStatus('error'),
    });

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        setLocalItems((items) => {
            const from = items.findIndex((i) => i.id === active.id);
            const to = items.findIndex((i) => i.id === over.id);
            return arrayMove(items, from, to).map((item, index) => ({ ...item, order: index + 1 }));
        });
        setHasChanges(true);
    };

    const addItem = () => {
        if (!menuId) return;
        addMutation.mutate({
            menuId,
            item: { label: 'Liên kết mới', url: '/', order: localItems.length + 1, openInNewTab: false },
        });
    };

    const deleteItem = async (id: string) => {
        if (!menuId) return;
        const ok = await confirm({ message: 'Xoá liên kết này?', variant: 'danger' });
        if (!ok) return;
        setDeletingId(id);
        deleteMutation.mutate({ menuId, itemId: id });
    };

    const updateItem = (id: string, updates: Partial<MenuItem>) => {
        setLocalItems((items) => items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
        setHasChanges(true);
        if (saveStatus !== 'idle') setSaveStatus('idle');
    };

    const handleLocationChange = async (loc: MenuLocationKey) => {
        if (hasChanges) {
            const ok = await confirm({ message: 'Bạn có thay đổi chưa lưu. Vẫn chuyển menu khác?', variant: 'warning' });
            if (!ok) return;
        }
        setSelectedLocation(loc);
        setSaveStatus('idle');
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Quản lý menu"
                description="Cấu hình các menu điều hướng của website — kéo để đổi thứ tự, bấm Lưu để áp dụng."
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={Info}
                            onClick={() => toast('Các vị trí menu được định nghĩa sẵn trong hệ thống.')}
                        >
                            Vị trí menu
                        </Button>
                        {/* Hành động chính DUY NHẤT của màn hình (§9.1). */}
                        <SaveButton
                            size="sm"
                            status={saveStatus}
                            disabled={!menuId || !hasChanges}
                            errorMessage="Không lưu được menu, thử lại."
                            onClick={() => menuId && saveMutation.mutate({ menuId, items: localItems })}
                            onDone={() => setSaveStatus('idle')}
                        />
                    </>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
                <nav aria-label="Vị trí menu" className="space-y-1.5">
                    {MENU_LOCATIONS.map((loc) => {
                        const active = selectedLocation === loc.key;
                        return (
                            <button
                                key={loc.key}
                                type="button"
                                aria-current={active ? 'true' : undefined}
                                onClick={() => handleLocationChange(loc.key)}
                                /* §9.1: mục đang chọn = vạch 2px + chữ brand, KHÔNG tô nền đỏ đặc. */
                                className={`w-full rounded-lg border border-l-2 px-3 py-2 text-left transition-colors ${
                                    active
                                        ? 'border-line border-l-brand bg-brand-subtle text-brand-text'
                                        : 'border-line border-l-transparent bg-surface text-fg hover:bg-sunken'
                                }`}
                            >
                                <span className="block text-13 font-semibold">{loc.label}</span>
                                <span className="mt-0.5 block text-2xs text-fg-muted">{loc.description}</span>
                            </button>
                        );
                    })}
                </nav>

                <Card padded radius="xl" className="min-w-0">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
                        <h2 className="truncate text-13 font-semibold uppercase tracking-wider text-fg-subtle">
                            Đang sửa: {menuLocationLabel(selectedMenu, selectedLocation)}
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={Plus}
                            loading={addMutation.isPending}
                            disabled={!menuId}
                            onClick={addItem}
                        >
                            Thêm liên kết
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                        </div>
                    ) : localItems.length === 0 ? (
                        <EmptyState
                            title="Menu này chưa có liên kết nào"
                            description="Thêm liên kết đầu tiên để menu hiện ra trên website."
                            action={{ label: 'Thêm liên kết', onClick: addItem, icon: Plus }}
                        />
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                                <ul className="space-y-2">
                                    {localItems.map((item) => (
                                        <MenuItemRow
                                            key={item.id}
                                            id={item.id}
                                            item={item}
                                            isDeleting={deletingId === item.id}
                                            onDelete={deleteItem}
                                            onUpdate={updateItem}
                                        />
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>
                    )}

                    {hasChanges && (
                        <p className="mt-3 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2 text-13 text-fg">
                            Có thay đổi chưa lưu. Bấm <strong>Lưu thay đổi</strong> ở góc trên bên phải để áp dụng.
                        </p>
                    )}
                </Card>
            </div>
        </div>
    );
};
