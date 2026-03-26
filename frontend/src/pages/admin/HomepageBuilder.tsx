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
    Edit3, Settings, 
    CheckCircle2, XCircle, Eye, Loader2
} from 'lucide-react';
import { contentApi, type HomepageSection } from '../../api/content';
import { useConfirm } from '../../context/ConfirmContext';
import toast from 'react-hot-toast';

interface SortableSectionProps {
    id: string;
    section: HomepageSection;
    isDeleting: boolean;
    onDelete: (id: string) => void;
    onEdit: (section: HomepageSection) => void;
    onToggle: (id: string) => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({ id, section, isDeleting, onDelete, onEdit, onToggle }) => {
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
            className={`flex items-center gap-6 bg-white p-5 rounded-2xl border-2 ${isDragging ? 'border-red-500 shadow-2xl' : 'border-gray-100'} mb-4 group transition-all`}
        >
            <button 
                {...attributes} 
                {...listeners}
                className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={24} />
            </button>

            <div className="flex-1">
                <div className="flex items-center gap-3">
                    <h3 className="font-black text-gray-800 uppercase tracking-tight text-lg">
                        {section.title}
                    </h3>
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-gray-200">
                        {section.sectionType}
                    </span>
                    {!section.isActive && (
                        <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-100 flex items-center gap-1">
                            <XCircle size={10} /> Hidden
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1 italic font-medium">
                    {section.cssClass || 'No custom classes'}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={() => onToggle(section.id)}
                    className={`p-2 rounded-lg transition-colors ${section.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}
                    title={section.isActive ? 'Hide Section' : 'Show Section'}
                >
                    <CheckCircle2 size={20} />
                </button>
                <button 
                    onClick={() => onEdit(section)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Configuration"
                >
                    <Edit3 size={20} />
                </button>
                <button 
                    onClick={() => onDelete(section.id)}
                    disabled={isDeleting}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Section"
                >
                    {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                </button>
            </div>
        </div>
    );
};

export const HomepageBuilder = () => {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
    const [configText, setConfigText] = useState('');
    const [hasOrderChanged, setHasOrderChanged] = useState(false);
    const confirm = useConfirm();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        try {
            setIsLoading(true);
            const data = await contentApi.admin.getHomepageSections();
            setSections(data.sort((a, b) => a.displayOrder - b.displayOrder));
        } catch (error) {
            toast.error('Failed to fetch sections');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSections((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const updated = arrayMove(items, oldIndex, newIndex);
                return updated.map((section, index) => ({ ...section, displayOrder: index + 1 }));
            });
            setHasOrderChanged(true);
        }
    };

    const handleEdit = (section: HomepageSection) => {
        setEditingSection(section);
        setConfigText(section.configuration || '{}');
    };

    const handleSaveConfig = async () => {
        if (!editingSection) return;
        try {
            JSON.parse(configText); // Validate JSON
        } catch (e) {
            toast.error('Invalid JSON format');
            return;
        }

        try {
            await contentApi.admin.updateHomepageSection(editingSection.id, {
                ...editingSection,
                configuration: configText,
            });
            setSections(sections.map(s => 
                s.id === editingSection.id ? { ...s, configuration: configText } : s
            ));
            setEditingSection(null);
            toast.success('Configuration saved!');
        } catch (error) {
            toast.error('Failed to save configuration');
        }
    };

    const addSection = async (type: string) => {
        setIsAdding(true);
        const newSectionData = {
            title: `New ${type.replace(/_/g, ' ')} Section`,
            sectionType: type,
            configuration: '{}',
            displayOrder: sections.length + 1,
            isActive: true,
            isVisible: true,
            cssClass: ''
        };

        try {
            const created = await contentApi.admin.createHomepageSection(newSectionData);
            setSections([...sections, created]);
            toast.success('Section added!');
        } catch (error) {
            toast.error('Failed to add section');
        } finally {
            setIsAdding(false);
        }
    };

    const deleteSection = async (id: string) => {
        const ok = await confirm({ message: 'Are you sure you want to delete this section? This cannot be undone.', variant: 'danger' });
        if (!ok) {
            return;
        }

        setDeletingId(id);
        try {
            await contentApi.admin.deleteHomepageSection(id);
            setSections(sections.filter(s => s.id !== id));
            toast.success('Section deleted!');
        } catch (error) {
            toast.error('Failed to delete section');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleSection = async (id: string) => {
        const section = sections.find(s => s.id === id);
        if (!section) return;

        const newIsActive = !section.isActive;
        // Optimistic update
        setSections(sections.map(s => s.id === id ? { ...s, isActive: newIsActive } : s));

        try {
            await contentApi.admin.updateHomepageSection(id, {
                ...section,
                isActive: newIsActive,
                isVisible: newIsActive,
            });
            toast.success(newIsActive ? 'Section is now visible' : 'Section is now hidden');
        } catch (error) {
            // Revert on failure
            setSections(sections.map(s => s.id === id ? { ...s, isActive: !newIsActive } : s));
            toast.error('Failed to toggle visibility');
        }
    };

    const handlePublish = async () => {
        setIsSaving(true);
        try {
            const reorderData = sections.map((s, index) => ({
                id: s.id,
                displayOrder: index + 1,
            }));
            await contentApi.admin.reorderHomepageSections(reorderData);
            setHasOrderChanged(false);
            toast.success('Homepage layout published successfully!');
        } catch (error) {
            toast.error('Failed to publish layout');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-8 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-red-500" size={48} />
                <p className="text-gray-400 font-bold uppercase text-sm tracking-widest">Loading sections...</p>
            </div>
        );
    }

    const SECTION_TYPES = [
        'hero_slider', 'banner_grid', 'flash_deal', 
        'product_grid', 'category_grid', 'service_grid', 
        'post_grid', 'custom_html'
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-wider">Homepage Builder</h1>
                    <p className="text-gray-400 mt-1">Design and reorder sections of your homepage</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => window.open('/', '_blank')}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl transition flex items-center gap-2"
                    >
                        <Eye size={18} />
                        Preview
                    </button>
                    <button 
                        onClick={handlePublish}
                        disabled={isSaving || !hasOrderChanged}
                        className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-2 rounded-xl transition flex items-center gap-2 font-bold shadow-lg shadow-accent-dark/20"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? 'Publishing...' : hasOrderChanged ? 'Publish Order' : 'Order Saved'}
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Available Sections */}
                <div className="lg:col-span-1 border-r border-white/10 pr-8">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Available Types</h3>
                    <div className="space-y-4">
                        {SECTION_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() => addSection(type)}
                                disabled={isAdding}
                                className="w-full bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 p-4 rounded-2xl border-2 border-transparent hover:border-red-500/30 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="flex items-center justify-between font-bold text-sm uppercase">
                                    {type.replace(/_/g, ' ')}
                                    {isAdding ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Layout Builder */}
                <div className="lg:col-span-3">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Current Layout</h3>
                    {sections.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <p className="text-lg font-bold">No sections yet</p>
                            <p className="text-sm mt-2">Add a section from the left panel to get started</p>
                        </div>
                    ) : (
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext 
                                items={sections.map(s => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {sections.map((section) => (
                                        <SortableSection 
                                            key={section.id} 
                                            id={section.id} 
                                            section={section}
                                            isDeleting={deletingId === section.id}
                                            onDelete={deleteSection}
                                            onEdit={handleEdit}
                                            onToggle={toggleSection}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Config Editor Modal Overlay */}
            {editingSection && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="p-6 bg-gray-50 border-b flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                                    Configure: {editingSection.title}
                                </h3>
                                <p className="text-sm text-gray-500">Edit the JSON configuration for this section</p>
                            </div>
                            <button onClick={() => setEditingSection(null)} className="text-gray-400 hover:text-gray-600">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </header>
                        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
                            <div className="flex-1 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-inner">
                                <textarea 
                                    value={configText}
                                    onChange={(e) => setConfigText(e.target.value)}
                                    className="w-full h-full p-6 font-mono text-sm bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent/20"
                                    spellCheck={false}
                                />
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-400 text-xs text-blue-700 font-medium">
                                <Settings size={14} className="inline mr-2" />
                                Tip: Use property names defined in the component (e.g., slides, banners, categoryId, etc.)
                            </div>
                        </div>
                        <footer className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingSection(null)}
                                className="px-6 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveConfig}
                                className="bg-accent hover:bg-accent-hover text-white px-8 py-2 rounded-xl font-bold shadow-lg transition"
                            >
                                Save to Server
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};
