// TECH DEBT (D9, phase-05): reorder/update items ở đây gọi N request tuần tự thay vì
// batch. BE đã có PUT /api/content/admin/menus/{menuId}/items/reorder
// (ContentEndpoints.cs:1027, xem contentApi.admin.reorderMenuItems) có thể thay thế
// để giảm round-trip. Giữ nguyên hành vi hiện tại — không tối ưu trong phase này.
import React, { useState, useEffect } from 'react';
import { 
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    Save, Plus, Trash2, GripVertical, 
    ChevronRight, Settings, Info, Loader2
} from 'lucide-react';
import { contentApi, type Menu, type MenuItem } from '../../api/content';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '../../context/ConfirmContext';
import toast from 'react-hot-toast';

interface SortableItemProps {
    id: string;
    item: MenuItem;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<MenuItem>) => void;
    isDeleting: boolean;
}

const SortableMenuItem: React.FC<SortableItemProps> = ({ id, item, onDelete, onUpdate, isDeleting }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={`flex items-center gap-4 bg-white p-4 rounded-xl border-2 ${isDragging ? 'border-red-500 shadow-md' : 'border-gray-100'} mb-3 group transition-all`}
        >
            <button 
                {...attributes} 
                {...listeners}
                className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={20} />
            </button>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                    type="text"
                    value={item.label}
                    placeholder="Nhãn hiển thị"
                    onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                    className="bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-accent"
                />
                <input 
                    type="text"
                    value={item.url}
                    placeholder="URL (/path or https://)"
                    onChange={(e) => onUpdate(item.id, { url: e.target.value })}
                    className="bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent"
                />
                <div className="flex items-center gap-2">
                    <input 
                        type="text"
                        value={item.icon || ''}
                        placeholder="Icon (tên Lucide)"
                        onChange={(e) => onUpdate(item.id, { icon: e.target.value })}
                        className="flex-1 bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={item.openInNewTab}
                            onChange={(e) => onUpdate(item.id, { openInNewTab: e.target.checked })}
                            className="rounded text-red-600 focus:ring-accent"
                        />
                        Tab mới
                    </label>
                </div>
            </div>

            <button 
                onClick={() => onDelete(item.id)}
                disabled={isDeleting}
                className="text-gray-300 hover:text-red-500 disabled:opacity-50 transition-colors p-2"
            >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
        </div>
    );
};

// ── Chuẩn hoá payload menu (W0 gate) ──────────────────────────────
// Hai backend đang chạy trả hai hình dạng khác nhau cho `GET /content/menus?location=`:
//   :5000 (binary cũ) → PascalCase: { Id, Location: 0, Items: [{ Id, Label, DisplayOrder, ... }] }
//   :5050 (binary mới) → camelCase: { id, location: "HeaderMain", items: [{ id, label, displayOrder, ... }] }
// Trước đây code spread trực tiếp `[...selectedMenu.items]` ⇒ với PascalCase thì `items` là
// undefined và cả trang sập vào error boundary ("selectedMenu.items is not iterable").
// Các helper dưới đây chấp nhận cả hai hình dạng, cả `null`/thiếu trường, và không bao giờ throw.
type RawRecord = Record<string, unknown>;

const asRecord = (value: unknown): RawRecord | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null;

/** Lấy giá trị đầu tiên không undefined/null theo danh sách tên trường (camelCase hoặc PascalCase). */
const pickField = (source: RawRecord, ...keys: string[]): unknown => {
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null) return value;
    }
    return undefined;
};

const pickString = (source: RawRecord, ...keys: string[]): string => {
    const value = pickField(source, ...keys);
    return typeof value === 'string' ? value : value === undefined ? '' : String(value);
};

const pickNumber = (source: RawRecord, fallback: number, ...keys: string[]): number => {
    const value = pickField(source, ...keys);
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/** `id` của menu đang chọn, bất kể hình dạng. Rỗng nghĩa là không thao tác được. */
const menuIdOf = (menu: unknown): string => {
    const record = asRecord(menu);
    return record ? pickString(record, 'id', 'Id') : '';
};

/** Nhãn vị trí menu; backend cũ trả enum dạng số nên mới cần fallback về key đang chọn. */
const menuLocationLabel = (menu: unknown, fallback: string): string => {
    const record = asRecord(menu);
    if (!record) return fallback;
    const raw = pickField(record, 'location', 'Location');
    return typeof raw === 'string' && raw.trim() !== '' ? raw : fallback;
};

/** Một item menu đã chuẩn hoá; `null` nếu payload không dùng được (thiếu id). */
const normalizeMenuItem = (rawItem: unknown, menuId: string, fallbackOrder: number): MenuItem | null => {
    const item = asRecord(rawItem);
    if (!item) return null;
    const id = pickString(item, 'id', 'Id');
    if (!id) return null;
    return {
        id,
        label: pickString(item, 'label', 'Label'),
        url: pickString(item, 'url', 'Url'),
        icon: pickString(item, 'icon', 'Icon') || undefined,
        parentId: pickString(item, 'parentId', 'ParentId') || undefined,
        order: pickNumber(item, fallbackOrder, 'order', 'Order', 'displayOrder', 'DisplayOrder'),
        openInNewTab: pickField(item, 'openInNewTab', 'OpenInNewTab') === true,
        cssClass: pickString(item, 'cssClass', 'CssClass') || undefined,
        pageId: pickString(item, 'pageId', 'PageId') || undefined,
        categoryId: pickString(item, 'categoryId', 'CategoryId') || undefined,
        menuId: pickString(item, 'menuId', 'MenuId') || menuId,
    };
};

/** Danh sách item đã chuẩn hoá + sắp theo thứ tự; luôn trả về array (có thể rỗng). */
const normalizeMenuItems = (menu: unknown): MenuItem[] => {
    const record = asRecord(menu);
    if (!record) return [];
    const rawItems = pickField(record, 'items', 'Items');
    if (!Array.isArray(rawItems)) return [];
    const menuId = pickString(record, 'id', 'Id');
    return rawItems
        .map((rawItem, index) => normalizeMenuItem(rawItem, menuId, index + 1))
        .filter((item): item is MenuItem => item !== null)
        .sort((a, b) => a.order - b.order);
};

type MenuLocationKey = 'HeaderMain' | 'FooterMain' | 'FooterBottom';

const MENU_LOCATIONS: { key: MenuLocationKey; label: string; description: string }[] = [
    { key: 'HeaderMain', label: 'HeaderMain', description: 'Main Header' },
    { key: 'FooterMain', label: 'FooterMain', description: 'Product Categories' },
    { key: 'FooterBottom', label: 'FooterBottom', description: 'Policies & Links' },
];

export const MenuManager = () => {
    const queryClient = useQueryClient();
    const [selectedLocation, setSelectedLocation] = useState<MenuLocationKey>('HeaderMain');
    const [localItems, setLocalItems] = useState<MenuItem[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const confirm = useConfirm();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // ── Fetch menu for selected location ──────────────────────────
    const { data: selectedMenu, isLoading } = useQuery({
        queryKey: ['menu', selectedLocation],
        queryFn: () => contentApi.getMenu(selectedLocation),
    });

    // `menuId` rỗng ⇒ payload không có id dùng được ⇒ chặn mọi mutation thay vì gọi API với id rỗng.
    const menuId = menuIdOf(selectedMenu);

    useEffect(() => {
        if (selectedMenu) {
            setLocalItems(normalizeMenuItems(selectedMenu));
            setHasChanges(false);
        } else {
            setLocalItems([]);
        }
    }, [selectedMenu]);

    // ── Add menu item via API ─────────────────────────────────────
    const addMutation = useMutation({
        mutationFn: (data: { menuId: string; item: Partial<MenuItem> }) =>
            contentApi.admin.createMenuItem(data.menuId, data.item),
        onSuccess: (newItem: MenuItem) => {
            // API trả về item mới theo cùng hình dạng của backend đang chạy ⇒ chuẩn hoá trước khi đưa vào state.
            setLocalItems(prev => {
                const normalized = normalizeMenuItem(newItem, menuId, prev.length + 1);
                return normalized ? [...prev, normalized] : prev;
            });
            toast.success('Đã thêm liên kết');
        },
        onError: () => toast.error('Không thêm được liên kết'),
    });

    // ── Delete menu item via API ──────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: (data: { menuId: string; itemId: string }) =>
            contentApi.admin.deleteMenuItem(data.menuId, data.itemId),
        onSuccess: (_: unknown, vars: { menuId: string; itemId: string }) => {
            setLocalItems(prev => prev.filter(i => i.id !== vars.itemId));
            setDeletingId(null);
            toast.success('Đã xoá liên kết');
        },
        onError: () => {
            setDeletingId(null);
            toast.error('Không xoá được liên kết');
        },
    });

    // ── Save all changes (reorder + update each item) ─────────────
    const saveMutation = useMutation({
        mutationFn: async (data: { menuId: string; items: MenuItem[] }) => {
            await contentApi.admin.reorderMenuItems(data.menuId,
                data.items.map((item, idx) => ({ id: item.id, displayOrder: idx + 1 }))
            );
            for (const item of data.items) {
                await contentApi.admin.updateMenuItem(data.menuId, item.id, {
                    label: item.label,
                    url: item.url,
                    icon: item.icon,
                    openInNewTab: item.openInNewTab,
                });
            }
        },
        onSuccess: () => {
            setHasChanges(false);
            queryClient.invalidateQueries({ queryKey: ['menu', selectedLocation] });
            toast.success('Đã lưu menu!');
        },
        onError: () => toast.error('Không lưu được menu'),
    });

    // ── Handlers ──────────────────────────────────────────────────
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setLocalItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const updated = arrayMove(items, oldIndex, newIndex);
                return updated.map((item, index) => ({ ...item, order: index + 1 }));
            });
            setHasChanges(true);
        }
    };

    const addItem = () => {
        if (!menuId) return;
        addMutation.mutate({
            menuId,
            item: {
                label: 'New Link',
                url: '/',
                order: localItems.length + 1,
                openInNewTab: false,
            }
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
        setLocalItems(items => items.map(i => i.id === id ? { ...i, ...updates } : i));
        setHasChanges(true);
    };

    const handleSave = () => {
        if (!menuId) return;
        saveMutation.mutate({ menuId, items: localItems });
    };

    const handleLocationChange = async (loc: MenuLocationKey) => {
        if (hasChanges) {
            const ok = await confirm({ message: 'Bạn có thay đổi chưa lưu. Vẫn chuyển menu khác?', variant: 'warning' });
            if (!ok) return;
        }
        setSelectedLocation(loc);
    };

    // ── Render ─────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="p-8 text-slate-700 flex items-center gap-3">
            <Loader2 className="animate-spin" size={24} />
            Đang tải menu...
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">Quản lý menu</h1>
                    <p className="text-gray-500 mt-1">Cấu hình các menu điều hướng của website</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => toast('Các vị trí menu được định nghĩa sẵn trong hệ thống.')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition flex items-center gap-2"
                    >
                        <Info size={18} />
                        Vị trí menu
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!menuId || saveMutation.isPending || !hasChanges}
                        className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-2 rounded-xl transition flex items-center gap-2 font-bold shadow-lg shadow-accent-dark/20"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        {saveMutation.isPending ? 'Đang lưu...' : hasChanges ? 'Lưu thay đổi' : 'Đã lưu'}
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Menu List */}
                <div className="lg:col-span-1 space-y-3">
                    {MENU_LOCATIONS.map((loc) => (
                        <button
                            key={loc.key}
                            onClick={() => handleLocationChange(loc.key)}
                            className={`w-full text-left p-4 rounded-xl transition-all border-2 ${selectedLocation === loc.key ? 'bg-accent border-accent text-white shadow-lg' : 'bg-white border-gray-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <div className="font-bold flex items-center justify-between">
                                {loc.label}
                                <ChevronRight size={16} />
                            </div>
                            <p className={`text-xs mt-1 ${selectedLocation === loc.key ? 'text-red-50' : 'text-gray-500'}`}>
                                {loc.description}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <div className="lg:col-span-3">
                    {!selectedMenu ? (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
                            <Settings size={48} className="text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-500">Chọn một menu để bắt đầu chỉnh sửa</h3>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-slate-900 px-2 uppercase">
                                    Đang sửa: {menuLocationLabel(selectedMenu, selectedLocation)}
                                </h2>
                                <button
                                    onClick={addItem}
                                    disabled={addMutation.isPending || !menuId}
                                    className="text-accent hover:opacity-80 disabled:opacity-50 flex items-center gap-2 text-sm font-bold bg-red-50 px-4 py-2 rounded-xl transition"
                                >
                                    {addMutation.isPending ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Plus size={18} />
                                    )}
                                    {addMutation.isPending ? 'Đang thêm...' : 'Thêm liên kết'}
                                </button>
                            </div>

                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext 
                                    items={localItems.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {localItems.map((item) => (
                                            <SortableMenuItem 
                                                key={item.id} 
                                                id={item.id} 
                                                item={item}
                                                onDelete={deleteItem}
                                                onUpdate={updateItem}
                                                isDeleting={deletingId === item.id}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>

                            {localItems.length === 0 && (
                                <div className="text-center py-20 text-gray-500">
                                    Menu này chưa có liên kết nào. Bấm "Thêm liên kết" để bắt đầu.
                                </div>
                            )}

                            {hasChanges && (
                                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm text-center">
                                    Bạn có thay đổi chưa lưu. Bấm <strong>"Lưu thay đổi"</strong> để áp dụng.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
