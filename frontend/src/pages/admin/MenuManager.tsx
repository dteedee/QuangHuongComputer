import React, { useState } from 'react';
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
            className={`flex items-center gap-4 bg-white p-4 rounded-xl border-2 ${isDragging ? 'border-red-500 shadow-2xl' : 'border-gray-100'} mb-3 group transition-all`}
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
                    placeholder="Label"
                    onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                    className="bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-red-500"
                />
                <input 
                    type="text"
                    value={item.url}
                    placeholder="URL (/path or https://)"
                    onChange={(e) => onUpdate(item.id, { url: e.target.value })}
                    className="bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                    <input 
                        type="text"
                        value={item.icon || ''}
                        placeholder="Icon (Lucide name)"
                        onChange={(e) => onUpdate(item.id, { icon: e.target.value })}
                        className="flex-1 bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={item.openInNewTab}
                            onChange={(e) => onUpdate(item.id, { openInNewTab: e.target.checked })}
                            className="rounded text-red-600 focus:ring-red-500"
                        />
                        New Tab
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
        onSuccess: (menu: Menu) => {
            setLocalItems([...menu.items].sort((a, b) => a.order - b.order));
            setHasChanges(false);
        }
    });

    // ── Add menu item via API ─────────────────────────────────────
    const addMutation = useMutation({
        mutationFn: (data: { menuId: string; item: Partial<MenuItem> }) =>
            contentApi.admin.createMenuItem(data.menuId, data.item),
        onSuccess: (newItem: MenuItem) => {
            setLocalItems(prev => [...prev, newItem]);
            toast.success('Link added');
        },
        onError: () => toast.error('Failed to add link'),
    });

    // ── Delete menu item via API ──────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: (data: { menuId: string; itemId: string }) =>
            contentApi.admin.deleteMenuItem(data.menuId, data.itemId),
        onSuccess: (_: unknown, vars: { menuId: string; itemId: string }) => {
            setLocalItems(prev => prev.filter(i => i.id !== vars.itemId));
            setDeletingId(null);
            toast.success('Link removed');
        },
        onError: () => {
            setDeletingId(null);
            toast.error('Failed to delete link');
        },
    });

    // ── Save all changes (order + field edits) via updateMenu ─────
    const saveMutation = useMutation({
        mutationFn: (data: { menuId: string; items: MenuItem[] }) =>
            contentApi.admin.updateMenu(data.menuId, {
                items: data.items.map((item, idx) => ({
                    id: item.id,
                    label: item.label,
                    url: item.url,
                    icon: item.icon,
                    openInNewTab: item.openInNewTab,
                    order: idx + 1,
                    type: item.type,
                }))
            }),
        onSuccess: () => {
            setHasChanges(false);
            queryClient.invalidateQueries({ queryKey: ['menu', selectedLocation] });
            toast.success('Menu saved successfully!');
        },
        onError: () => toast.error('Failed to save menu'),
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
        if (!selectedMenu) return;
        addMutation.mutate({
            menuId: selectedMenu.id,
            item: {
                label: 'New Link',
                url: '/',
                order: localItems.length + 1,
                openInNewTab: false,
            }
        });
    };

    const deleteItem = (id: string) => {
        if (!selectedMenu) return;
        if (!confirm('Remove this link?')) return;
        setDeletingId(id);
        deleteMutation.mutate({ menuId: selectedMenu.id, itemId: id });
    };

    const updateItem = (id: string, updates: Partial<MenuItem>) => {
        setLocalItems(items => items.map(i => i.id === id ? { ...i, ...updates } : i));
        setHasChanges(true);
    };

    const handleSave = () => {
        if (!selectedMenu) return;
        saveMutation.mutate({ menuId: selectedMenu.id, items: localItems });
    };

    const handleLocationChange = async (loc: MenuLocationKey) => {
        if (hasChanges) {
            if (!confirm('You have unsaved changes. Switch menu anyway?')) return;
        }
        setSelectedLocation(loc);
    };

    // ── Render ─────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="p-8 text-white flex items-center gap-3">
            <Loader2 className="animate-spin" size={24} />
            Loading menus...
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white">Menu Manager</h1>
                    <p className="text-gray-400 mt-1">Configure your site navigation menus</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => toast('Menu locations are predefined in the system.')}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl transition flex items-center gap-2"
                    >
                        <Info size={18} />
                        Locations
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!selectedMenu || saveMutation.isLoading || !hasChanges}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl transition flex items-center gap-2 font-bold shadow-lg shadow-red-900/20"
                    >
                        {saveMutation.isLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        {saveMutation.isLoading ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
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
                            className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${selectedLocation === loc.key ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                        >
                            <div className="font-bold flex items-center justify-between">
                                {loc.label}
                                <ChevronRight size={16} />
                            </div>
                            <p className={`text-xs mt-1 ${selectedLocation === loc.key ? 'text-red-100' : 'text-gray-500'}`}>
                                {loc.description}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <div className="lg:col-span-3">
                    {!selectedMenu ? (
                        <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-3xl p-20 text-center">
                            <Settings size={48} className="text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-400">Select a menu to start editing</h3>
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-white px-2 uppercase tracking-widest">
                                    Editing: {selectedMenu.location}
                                </h2>
                                <button 
                                    onClick={addItem}
                                    disabled={addMutation.isLoading}
                                    className="text-red-400 hover:text-red-300 disabled:opacity-50 flex items-center gap-2 text-sm font-bold bg-red-400/10 px-4 py-2 rounded-xl transition"
                                >
                                    {addMutation.isLoading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Plus size={18} />
                                    )}
                                    {addMutation.isLoading ? 'Adding...' : 'Add Link'}
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
                                    No items in this menu. Click "Add Link" to get started.
                                </div>
                            )}

                            {hasChanges && (
                                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm text-center">
                                    You have unsaved changes. Click <strong>"Save Changes"</strong> to apply.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
