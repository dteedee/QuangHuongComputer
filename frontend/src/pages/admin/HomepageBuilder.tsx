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
    Edit3, CheckCircle2, XCircle, Eye, Loader2, X
} from 'lucide-react';
import { contentApi, type HomepageSection } from '../../api/content';
import { useConfirm } from '../../context/ConfirmContext';
import { getSectionConfigForm } from '../../components/homepage-builder/section-config-forms';
import { SectionPreview } from '../../components/homepage-builder/section-preview';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SortableSectionProps {
    id: string;
    section: HomepageSection;
    isDeleting: boolean;
    onDelete: (id: string) => void;
    onEdit: (section: HomepageSection) => void;
    onToggle: (id: string) => void;
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────

const SortableSection: React.FC<SortableSectionProps> = ({ id, section, isDeleting, onDelete, onEdit, onToggle }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 bg-white p-4 rounded-xl border-2 ${isDragging ? 'border-red-500 shadow-md' : 'border-gray-100'} mb-3 group transition-all`}
        >
            <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical size={22} />
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-tight truncate">{section.title}</h3>
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-gray-200 shrink-0">
                        {section.sectionType}
                    </span>
                    {!section.isActive && (
                        <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-100 flex items-center gap-1 shrink-0">
                            <XCircle size={10} /> Hidden
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{section.cssClass || 'No custom classes'}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => onToggle(section.id)}
                    className={`p-2 rounded-lg transition-colors ${section.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}
                    title={section.isActive ? 'Hide Section' : 'Show Section'}
                >
                    <CheckCircle2 size={18} />
                </button>
                <button
                    onClick={() => onEdit(section)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Configuration"
                >
                    <Edit3 size={18} />
                </button>
                <button
                    onClick={() => onDelete(section.id)}
                    disabled={isDeleting}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Section"
                >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
            </div>
        </div>
    );
};

// ─── Available Section Types ──────────────────────────────────────────────────

const SECTION_TYPES = [
    'hero_slider', 'banner_grid', 'flash_deal',
    'product_grid', 'category_grid', 'service_grid',
    'post_grid', 'custom_html'
];

// ─── Config Modal ─────────────────────────────────────────────────────────────

interface ConfigModalProps {
    section: HomepageSection;
    onSave: (id: string, config: Record<string, unknown>, meta: { title: string; cssClass: string }) => Promise<void>;
    onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ section, onSave, onClose }) => {
    const parseConfig = (raw: string | null): Record<string, unknown> => {
        try { return JSON.parse(raw || '{}'); } catch { return {}; }
    };

    const [config, setConfig] = useState<Record<string, unknown>>(parseConfig(section.configuration));
    const [title, setTitle] = useState(section.title);
    const [cssClass, setCssClass] = useState(section.cssClass ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

    const ConfigForm = getSectionConfigForm(section.sectionType);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(section.id, config, { title, cssClass });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <header className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 uppercase tracking-tight">
                            Configure: <span className="text-blue-600">{section.sectionType.replace(/_/g, ' ')}</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Visual section editor</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                        <X size={20} />
                    </button>
                </header>

                {/* Meta fields */}
                <div className="px-6 py-3 bg-gray-50 border-b flex gap-4 shrink-0">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Section Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CSS Class</label>
                        <input
                            value={cssClass}
                            onChange={e => setCssClass(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="optional"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b shrink-0">
                    {(['config', 'preview'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab === 'config' ? 'Configure' : 'Preview'}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'config' ? (
                        <ConfigForm config={config} onChange={setConfig} />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-400 font-medium">Visual approximation of how this section will appear on the homepage.</p>
                            <SectionPreview sectionType={section.sectionType} config={config} title={title} />
                            <details className="mt-4">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View raw JSON</summary>
                                <pre className="mt-2 text-[10px] font-mono bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-auto max-h-40 text-gray-600">
                                    {JSON.stringify(config, null, 2)}
                                </pre>
                            </details>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold shadow transition text-sm flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save to Server'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const HomepageBuilder = () => {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
    const [hasOrderChanged, setHasOrderChanged] = useState(false);
    const confirm = useConfirm();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => { fetchSections(); }, []);

    const fetchSections = async () => {
        try {
            setIsLoading(true);
            const data = await contentApi.admin.getHomepageSections();
            setSections(data.sort((a, b) => a.displayOrder - b.displayOrder));
        } catch {
            toast.error('Failed to fetch sections');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSections(items => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex).map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
            });
            setHasOrderChanged(true);
        }
    };

    const handleSaveConfig = async (id: string, config: Record<string, unknown>, meta: { title: string; cssClass: string }) => {
        const section = sections.find(s => s.id === id);
        if (!section) return;
        const configJson = JSON.stringify(config);
        try {
            await contentApi.admin.updateHomepageSection(id, {
                ...section,
                title: meta.title,
                cssClass: meta.cssClass,
                configuration: configJson,
            });
            setSections(sections.map(s =>
                s.id === id ? { ...s, title: meta.title, cssClass: meta.cssClass, configuration: configJson } : s
            ));
            toast.success('Configuration saved!');
        } catch {
            toast.error('Failed to save configuration');
            throw new Error('save failed');
        }
    };

    const addSection = async (type: string) => {
        setIsAdding(true);
        try {
            const created = await contentApi.admin.createHomepageSection({
                title: `New ${type.replace(/_/g, ' ')} Section`,
                sectionType: type,
                configuration: '{}',
                displayOrder: sections.length + 1,
                isActive: true,
                isVisible: true,
                cssClass: '',
            });
            setSections(prev => [...prev, created]);
            toast.success('Section added!');
        } catch {
            toast.error('Failed to add section');
        } finally {
            setIsAdding(false);
        }
    };

    const deleteSection = async (id: string) => {
        const ok = await confirm({ message: 'Delete this section? This cannot be undone.', variant: 'danger' });
        if (!ok) return;
        setDeletingId(id);
        try {
            await contentApi.admin.deleteHomepageSection(id);
            setSections(sections.filter(s => s.id !== id));
            toast.success('Section deleted!');
        } catch {
            toast.error('Failed to delete section');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleSection = async (id: string) => {
        const section = sections.find(s => s.id === id);
        if (!section) return;
        const newIsActive = !section.isActive;
        setSections(sections.map(s => s.id === id ? { ...s, isActive: newIsActive } : s));
        try {
            await contentApi.admin.updateHomepageSection(id, { ...section, isActive: newIsActive, isVisible: newIsActive });
            toast.success(newIsActive ? 'Section visible' : 'Section hidden');
        } catch {
            setSections(sections.map(s => s.id === id ? { ...s, isActive: !newIsActive } : s));
            toast.error('Failed to toggle visibility');
        }
    };

    const handlePublish = async () => {
        setIsSaving(true);
        try {
            await contentApi.admin.reorderHomepageSections(
                sections.map((s, i) => ({ id: s.id, displayOrder: i + 1 }))
            );
            setHasOrderChanged(false);
            toast.success('Homepage layout published!');
        } catch {
            toast.error('Failed to publish layout');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-8 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-red-500" size={48} />
                <p className="text-gray-400 font-bold uppercase text-sm">Loading sections...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-white uppercase tracking-wider">Homepage Builder</h1>
                    <p className="text-gray-400 mt-1">Design and reorder sections of your homepage</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.open('/', '_blank')}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl transition flex items-center gap-2 text-sm"
                    >
                        <Eye size={16} /> Preview
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isSaving || !hasOrderChanged}
                        className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-xl transition flex items-center gap-2 font-bold shadow-lg shadow-accent-dark/20 text-sm"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Publishing...' : hasOrderChanged ? 'Publish Order' : 'Order Saved'}
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Available Section Types */}
                <div className="lg:col-span-1 border-r border-white/10 pr-8">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Add Section</h3>
                    <div className="space-y-2">
                        {SECTION_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => addSection(type)}
                                disabled={isAdding}
                                className="w-full bg-white/5 hover:bg-blue-500/10 hover:text-red-400 text-gray-400 p-3 rounded-xl border-2 border-transparent hover:border-red-500/30 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="flex items-center justify-between font-bold text-xs uppercase">
                                    {type.replace(/_/g, ' ')}
                                    {isAdding ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Layout Builder */}
                <div className="lg:col-span-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Current Layout</h3>
                    {sections.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <p className="text-lg font-bold">No sections yet</p>
                            <p className="text-sm mt-2">Add a section from the left panel</p>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                <div>
                                    {sections.map(section => (
                                        <SortableSection
                                            key={section.id}
                                            id={section.id}
                                            section={section}
                                            isDeleting={deletingId === section.id}
                                            onDelete={deleteSection}
                                            onEdit={setEditingSection}
                                            onToggle={toggleSection}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Visual Config Modal */}
            {editingSection && (
                <ConfigModal
                    section={editingSection}
                    onSave={handleSaveConfig}
                    onClose={() => setEditingSection(null)}
                />
            )}
        </div>
    );
};
