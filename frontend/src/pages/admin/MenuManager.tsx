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
    ExternalLink, ChevronRight, Settings, Info
} from 'lucide-react';
import { contentApi, type Menu, type MenuItem } from '../../api/content';
import toast from 'react-hot-toast';

interface SortableItemProps {
    id: string;
    item: MenuItem;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<MenuItem>) => void;
}

const SortableMenuItem: React.FC<SortableItemProps> = ({ id, item, onDelete, onUpdate }) => {
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
                className="text-gray-300 hover:text-red-500 transition-colors p-2"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};

export const MenuManager = () => {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchMenus();
    }, []);

    const fetchMenus = async () => {
        try {
            const data = await contentApi.getMenu('HeaderMain'); 
            handleSelectMenu(data);
            setIsLoading(false);
        } catch (error) {
            toast.error('Failed to fetch menus');
        }
    };

    const handleSelectMenu = (menu: Menu) => {
        setSelectedMenu(menu);
        setItems([...menu.items].sort((a, b) => a.order - b.order));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const updated = arrayMove(items, oldIndex, newIndex);
                // Update order values
                return updated.map((item, index) => ({ ...item, order: index + 1 }));
            });
        }
    };

    const addItem = () => {
        const newItem: MenuItem = {
            id: Math.random().toString(36).substr(2, 9), // Temporary ID
            label: 'New Link',
            url: '/',
            order: items.length + 1,
            openInNewTab: false,
            menuId: selectedMenu?.id || ''
        };
        setItems([...items, newItem]);
    };

    const deleteItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, updates: Partial<MenuItem>) => {
        setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const handleSave = async () => {
        if (!selectedMenu) return;
        setIsSaving(true);
        try {
            // For now, update the whole menu. 
            // The API needs to support direct menu updates.
            // We'll simulate success here as we need to implement the PUT endpoint.
            toast.success('Menu saved successfully (Simulated)');
        } catch (error) {
            toast.error('Failed to save menu');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-white">Loading menus...</div>;

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
                        disabled={!selectedMenu || isSaving}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl transition flex items-center gap-2 font-bold shadow-lg shadow-red-900/20"
                    >
                        <Save size={18} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Menu List */}
                <div className="lg:col-span-1 space-y-3">
                    {['HeaderMain', 'FooterMain', 'FooterBottom'].map((loc) => (
                        <button
                            key={loc}
                            onClick={async () => {
                                const data = await contentApi.getMenu(loc as any);
                                handleSelectMenu(data);
                            }}
                            className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${selectedMenu?.location === loc ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                        >
                            <div className="font-bold flex items-center justify-between">
                                {loc}
                                <ChevronRight size={16} />
                            </div>
                            <p className={`text-xs mt-1 ${selectedMenu?.location === loc ? 'text-red-100' : 'text-gray-500'}`}>
                                {loc === 'HeaderMain' ? 'Main Header' : loc === 'FooterMain' ? 'Product Categories' : 'Policies & Links'}
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
                                    className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm font-bold bg-red-400/10 px-4 py-2 rounded-xl transition"
                                >
                                    <Plus size={18} />
                                    Add Link
                                </button>
                            </div>

                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext 
                                    items={items.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {items.map((item) => (
                                            <SortableMenuItem 
                                                key={item.id} 
                                                id={item.id} 
                                                item={item}
                                                onDelete={deleteItem}
                                                onUpdate={updateItem}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>

                            {items.length === 0 && (
                                <div className="text-center py-20 text-gray-500">
                                    No items in this menu.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
