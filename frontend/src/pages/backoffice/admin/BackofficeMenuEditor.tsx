import React, { useState, useEffect } from 'react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical, Plus, Trash2, Save, ChevronDown, ChevronRight,
    Eye, EyeOff, Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemConfigApi, type BackofficeMenuGroupDto, type BackofficeMenuItemDto } from '../../../api/systemConfig';
import { getIcon, iconNames } from '../../../utils/icon-registry';
import { useConfirm } from '../../../context/ConfirmContext';
import toast from 'react-hot-toast';

// ── Sortable Group Row ───────────────────────────────────────────────────────

interface SortableGroupProps {
    group: BackofficeMenuGroupDto;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
}

const SortableGroup: React.FC<SortableGroupProps> = ({ group, isSelected, onSelect, onDelete, onToggleActive }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border transition-all mb-1 ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
            } ${!group.isActive ? 'opacity-50' : ''}`}
        >
            <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab">
                <GripVertical size={16} />
            </button>
            <span className={group.colorClass || 'text-gray-500'}>
                {getIcon(group.iconName, 16)}
            </span>
            <span className="flex-1 text-sm font-medium text-gray-800 truncate">{group.title}</span>
            <span className="text-xs text-gray-400">{group.items.length} items</span>
            <button
                onClick={e => { e.stopPropagation(); onToggleActive(group.id, !group.isActive); }}
                className="text-gray-400 hover:text-blue-500"
                title={group.isActive ? 'Ẩn nhóm' : 'Hiện nhóm'}
            >
                {group.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
                onClick={e => { e.stopPropagation(); onDelete(group.id); }}
                className="text-gray-400 hover:text-red-500"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};

// ── Sortable Item Row ────────────────────────────────────────────────────────

interface SortableItemProps {
    item: BackofficeMenuItemDto;
    onDelete: (id: string) => void;
    onUpdate: (id: string, data: Partial<BackofficeMenuItemDto>) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, onDelete, onUpdate }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    const [expanded, setExpanded] = useState(false);

    const allRoles = ['Admin', 'Manager', 'Sale', 'Accountant', 'TechnicianInShop', 'TechnicianOnSite', 'Supplier'];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`border rounded-lg mb-2 bg-white ${!item.isActive ? 'opacity-60' : ''} ${isDragging ? 'border-blue-400 shadow-md' : 'border-gray-200'}`}
        >
            {/* Header row */}
            <div className="flex items-center gap-2 px-3 py-2">
                <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0">
                    <GripVertical size={16} />
                </button>
                <span className="text-gray-500 flex-shrink-0">{getIcon(item.iconName, 16)}</span>
                <input
                    type="text"
                    value={item.title}
                    onChange={e => onUpdate(item.id, { title: e.target.value })}
                    className="flex-1 text-sm font-medium bg-transparent border-0 outline-none min-w-0"
                    placeholder="Tên mục"
                />
                <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[120px]">{item.path}</span>
                <button onClick={() => setExpanded(x => !x)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <button
                    onClick={() => onUpdate(item.id, { isActive: !item.isActive })}
                    className="text-gray-400 hover:text-blue-500 flex-shrink-0"
                >
                    {item.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                    onClick={() => onDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Expanded edit fields */}
            {expanded && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 font-medium">Đường dẫn</label>
                            <input
                                type="text"
                                value={item.path}
                                onChange={e => onUpdate(item.id, { path: e.target.value })}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                placeholder="/backoffice/..."
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-medium">Icon</label>
                            <select
                                value={item.iconName || ''}
                                onChange={e => onUpdate(item.id, { iconName: e.target.value })}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            >
                                {iconNames.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-medium">Mô tả</label>
                        <input
                            type="text"
                            value={item.description || ''}
                            onChange={e => onUpdate(item.id, { description: e.target.value })}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="Mô tả ngắn"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Vai trò được phép</label>
                        <div className="flex flex-wrap gap-2">
                            {allRoles.map(role => (
                                <label key={role} className="flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={item.allowedRoles.includes(role)}
                                        onChange={e => {
                                            const roles = e.target.checked
                                                ? [...item.allowedRoles, role]
                                                : item.allowedRoles.filter(r => r !== role);
                                            onUpdate(item.id, { allowedRoles: roles });
                                        }}
                                        className="rounded"
                                    />
                                    {role}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Page ────────────────────────────────────────────────────────────────

export const BackofficeMenuEditor: React.FC = () => {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [localGroups, setLocalGroups] = useState<BackofficeMenuGroupDto[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const { isLoading, data: remoteGroups } = useQuery({
        queryKey: ['backoffice-menu-admin'],
        queryFn: () => systemConfigApi.backofficeMenu.admin.getAll(),
    });

    useEffect(() => {
        if (remoteGroups) {
            setLocalGroups(remoteGroups);
            if (!selectedGroupId && remoteGroups.length > 0) setSelectedGroupId(remoteGroups[0].id);
        }
    }, [remoteGroups]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            // Reorder groups
            await systemConfigApi.backofficeMenu.admin.reorderGroups(
                localGroups.map((g, i) => ({ id: g.id, order: i }))
            );
            // Update each group's metadata + reorder items
            for (const group of localGroups) {
                await systemConfigApi.backofficeMenu.admin.updateGroup(group.id, {
                    title: group.title,
                    iconName: group.iconName,
                    colorClass: group.colorClass,
                    isActive: group.isActive,
                });
                await systemConfigApi.backofficeMenu.admin.reorderItems(
                    group.items.map((item, i) => ({ id: item.id, order: i, groupId: group.id }))
                );
                for (const item of group.items) {
                    await systemConfigApi.backofficeMenu.admin.updateItem(item.id, {
                        title: item.title,
                        path: item.path,
                        description: item.description,
                        iconName: item.iconName,
                        allowedRoles: item.allowedRoles,
                        isActive: item.isActive,
                        badgeSource: item.badgeSource,
                    });
                }
            }
        },
        onSuccess: () => {
            toast.success('Đã lưu menu');
            setIsDirty(false);
            qc.invalidateQueries({ queryKey: ['backoffice-menu'] });
            qc.invalidateQueries({ queryKey: ['backoffice-menu-admin'] });
        },
        onError: () => toast.error('Lưu thất bại'),
    });

    const addGroupMutation = useMutation({
        mutationFn: () => systemConfigApi.backofficeMenu.admin.createGroup({
            title: 'Nhóm mới', iconName: 'Settings', colorClass: 'text-gray-500', isActive: true
        }),
        onSuccess: (newGroup) => {
            setLocalGroups(prev => [...prev, { ...newGroup, items: [] }]);
            setSelectedGroupId(newGroup.id);
            setIsDirty(true);
        },
    });

    const deleteGroupMutation = useMutation({
        mutationFn: (id: string) => systemConfigApi.backofficeMenu.admin.deleteGroup(id),
        onSuccess: (_, id) => {
            setLocalGroups(prev => prev.filter(g => g.id !== id));
            if (selectedGroupId === id) setSelectedGroupId(localGroups[0]?.id ?? null);
            setIsDirty(false);
            qc.invalidateQueries({ queryKey: ['backoffice-menu'] });
        },
        onError: () => toast.error('Xóa nhóm thất bại'),
    });

    const addItemMutation = useMutation({
        mutationFn: (groupId: string) => systemConfigApi.backofficeMenu.admin.createItem({
            groupId, title: 'Mục mới', path: '/backoffice/', iconName: 'Settings',
            allowedRoles: ['Admin'], isActive: true
        }),
        onSuccess: (newItem) => {
            setLocalGroups(prev => prev.map(g =>
                g.id === newItem.groupId ? { ...g, items: [...g.items, newItem] } : g
            ));
            setIsDirty(true);
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: (id: string) => systemConfigApi.backofficeMenu.admin.deleteItem(id),
        onSuccess: (_, id) => {
            setLocalGroups(prev => prev.map(g => ({ ...g, items: g.items.filter(i => i.id !== id) })));
            setIsDirty(false);
            qc.invalidateQueries({ queryKey: ['backoffice-menu'] });
        },
        onError: () => toast.error('Xóa mục thất bại'),
    });

    const handleGroupDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setLocalGroups(prev => {
            const oldIndex = prev.findIndex(g => g.id === active.id);
            const newIndex = prev.findIndex(g => g.id === over.id);
            return arrayMove(prev, oldIndex, newIndex);
        });
        setIsDirty(true);
    };

    const handleItemDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !selectedGroupId) return;
        setLocalGroups(prev => prev.map(g => {
            if (g.id !== selectedGroupId) return g;
            const oldIdx = g.items.findIndex(i => i.id === active.id);
            const newIdx = g.items.findIndex(i => i.id === over.id);
            return { ...g, items: arrayMove(g.items, oldIdx, newIdx) };
        }));
        setIsDirty(true);
    };

    const updateItem = (id: string, data: Partial<BackofficeMenuItemDto>) => {
        setLocalGroups(prev => prev.map(g => ({
            ...g,
            items: g.items.map(i => i.id === id ? { ...i, ...data } : i)
        })));
        setIsDirty(true);
    };

    const updateGroup = (id: string, data: Partial<BackofficeMenuGroupDto>) => {
        setLocalGroups(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
        setIsDirty(true);
    };

    const handleDeleteGroup = async (id: string) => {
        const ok = await confirm({ message: 'Xóa nhóm menu này? Tất cả mục trong nhóm sẽ bị xóa.' });
        if (ok) deleteGroupMutation.mutate(id);
    };

    const handleDeleteItem = async (id: string) => {
        const ok = await confirm({ message: 'Xóa mục menu này?' });
        if (ok) deleteItemMutation.mutate(id);
    };

    const selectedGroup = localGroups.find(g => g.id === selectedGroupId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Quản lý Menu Backoffice</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Kéo thả để sắp xếp, bấm vào item để chỉnh sửa</p>
                </div>
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={!isDirty || saveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Lưu thay đổi
                </button>
            </div>

            {/* Two-panel layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: group list */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-700">Nhóm menu</h2>
                        <button
                            onClick={() => addGroupMutation.mutate()}
                            disabled={addGroupMutation.isPending}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <Plus size={14} /> Thêm nhóm
                        </button>
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
                        <SortableContext items={localGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                            {localGroups.map(group => (
                                <SortableGroup
                                    key={group.id}
                                    group={group}
                                    isSelected={selectedGroupId === group.id}
                                    onSelect={() => setSelectedGroupId(group.id)}
                                    onDelete={handleDeleteGroup}
                                    onToggleActive={(id, isActive) => updateGroup(id, { isActive })}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Right: items of selected group */}
                <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-gray-200">
                    {selectedGroup ? (
                        <>
                            {/* Group header edit */}
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Tên nhóm</label>
                                        <input
                                            type="text"
                                            value={selectedGroup.title}
                                            onChange={e => updateGroup(selectedGroup.id, { title: e.target.value })}
                                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Icon nhóm</label>
                                        <select
                                            value={selectedGroup.iconName || ''}
                                            onChange={e => updateGroup(selectedGroup.id, { iconName: e.target.value })}
                                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        >
                                            {iconNames.map(n => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-700">
                                    Mục trong nhóm ({selectedGroup.items.length})
                                </h3>
                                <button
                                    onClick={() => addItemMutation.mutate(selectedGroup.id)}
                                    disabled={addItemMutation.isPending}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    <Plus size={14} /> Thêm mục
                                </button>
                            </div>

                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
                                <SortableContext
                                    items={selectedGroup.items.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {selectedGroup.items.map(item => (
                                        <SortableItem
                                            key={item.id}
                                            item={item}
                                            onDelete={handleDeleteItem}
                                            onUpdate={updateItem}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>

                            {selectedGroup.items.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    Nhóm này chưa có mục nào. Bấm "Thêm mục" để bắt đầu.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full py-16 text-gray-400 text-sm">
                            Chọn một nhóm bên trái để xem và chỉnh sửa
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BackofficeMenuEditor;
