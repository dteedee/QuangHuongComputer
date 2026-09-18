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
import { Save, Plus, Trash2, GripVertical, Edit3, CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react';
import { contentApi, type HomepageSection } from '../../api/content';
import { useConfirm } from '../../context/ConfirmContext';
import { ConfigModal, type SaveMeta } from '../../components/homepage-builder/section-config-modal';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_TYPES = [
    'hero_slider', 'banner_grid', 'flash_deal',
    'product_grid', 'product_grid_with_panels', 'category_grid',
    'brand_showcase', 'service_grid',
    'post_grid', 'custom_html',
];

/** Nhãn tiếng Việt cho từng loại khối — không hiển thị slug tiếng Anh cho admin. */
const SECTION_TYPE_LABELS: Record<string, string> = {
    hero_slider: 'Slide banner đầu trang',
    banner_grid: 'Lưới banner',
    flash_deal: 'Flash Sale',
    product_grid: 'Lưới sản phẩm',
    product_grid_with_panels: 'Lưới sản phẩm kèm panel',
    category_grid: 'Lưới danh mục',
    brand_showcase: 'Thương hiệu nổi bật',
    service_grid: 'Lưới dịch vụ',
    post_grid: 'Lưới bài viết',
    custom_html: 'HTML tuỳ chỉnh',
};

// ─── Sortable Row ─────────────────────────────────────────────────────────────

interface SortableSectionProps {
    id: string;
    section: HomepageSection;
    isDeleting: boolean;
    onDelete: (id: string) => void;
    onEdit: (section: HomepageSection) => void;
    onToggle: (id: string) => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({ id, section, isDeleting, onDelete, onEdit, onToggle }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0, opacity: isDragging ? 0.5 : 1 };

    return (
        <div
            ref={setNodeRef} style={style}
            className={`flex items-center gap-4 bg-white p-4 rounded-xl border-2 ${isDragging ? 'border-red-500 shadow-md' : 'border-gray-100'} mb-3 group transition-all`}
        >
            <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical size={22} />
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-tight truncate">{section.title}</h3>
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-gray-200 shrink-0">
                        {SECTION_TYPE_LABELS[section.sectionType] ?? section.sectionType}
                    </span>
                    {!section.isActive && (
                        <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-100 flex items-center gap-1 shrink-0">
                            <XCircle size={10} /> Đã ẩn
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{section.cssClass || 'Không có class tuỳ chỉnh'}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => onToggle(section.id)}
                    className={`p-2 rounded-lg transition-colors ${section.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}
                    title={section.isActive ? 'Ẩn khối' : 'Hiện khối'}
                >
                    <CheckCircle2 size={18} />
                </button>
                <button
                    onClick={() => onEdit(section)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Sửa cấu hình"
                >
                    <Edit3 size={18} />
                </button>
                <button
                    onClick={() => onDelete(section.id)}
                    disabled={isDeleting}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Xoá khối"
                >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
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
            toast.error('Không tải được danh sách khối');
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

    const handleSaveConfig = async (id: string, config: Record<string, unknown>, meta: SaveMeta) => {
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
            setSections(prev => prev.map(s =>
                s.id === id ? { ...s, title: meta.title, cssClass: meta.cssClass, configuration: configJson } : s
            ));
            toast.success('Đã lưu cấu hình!');
        } catch {
            toast.error('Không lưu được cấu hình');
            throw new Error('save failed');
        }
    };

    const addSection = async (type: string) => {
        setIsAdding(true);
        try {
            const created = await contentApi.admin.createHomepageSection({
                title: `${SECTION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')} mới`,
                sectionType: type,
                configuration: '{}',
                displayOrder: sections.length + 1,
                isActive: true,
                isVisible: true,
                cssClass: '',
            });
            setSections(prev => [...prev, created]);
            toast.success('Đã thêm khối!');
        } catch {
            toast.error('Không thêm được khối');
        } finally {
            setIsAdding(false);
        }
    };

    const deleteSection = async (id: string) => {
        const ok = await confirm({ message: 'Xoá khối này? Không thể hoàn tác.', variant: 'danger' });
        if (!ok) return;
        setDeletingId(id);
        try {
            await contentApi.admin.deleteHomepageSection(id);
            setSections(prev => prev.filter(s => s.id !== id));
            toast.success('Đã xoá khối!');
        } catch {
            toast.error('Không xoá được khối');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleSection = async (id: string) => {
        const section = sections.find(s => s.id === id);
        if (!section) return;
        const newIsActive = !section.isActive;
        setSections(prev => prev.map(s => s.id === id ? { ...s, isActive: newIsActive } : s));
        try {
            await contentApi.admin.updateHomepageSection(id, { ...section, isActive: newIsActive, isVisible: newIsActive });
            toast.success(newIsActive ? 'Khối đã hiện' : 'Khối đã ẩn');
        } catch {
            setSections(prev => prev.map(s => s.id === id ? { ...s, isActive: !newIsActive } : s));
            toast.error('Không đổi được trạng thái hiển thị');
        }
    };

    const handlePublish = async () => {
        setIsSaving(true);
        try {
            await contentApi.admin.reorderHomepageSections(
                sections.map((s, i) => ({ id: s.id, displayOrder: i + 1 }))
            );
            setHasOrderChanged(false);
            toast.success('Đã đăng bố cục trang chủ!');
        } catch {
            toast.error('Không đăng được bố cục');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-8 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-red-500" size={48} />
                <p className="text-gray-400 font-bold uppercase text-sm">Đang tải các khối...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-white uppercase tracking-wider">Xây dựng trang chủ</h1>
                    <p className="text-gray-400 mt-1">Thiết kế và sắp xếp lại các khối của trang chủ</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.open('/', '_blank')}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl transition flex items-center gap-2 text-sm"
                    >
                        <Eye size={16} /> Xem trước
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isSaving || !hasOrderChanged}
                        className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-xl transition flex items-center gap-2 font-bold shadow-lg shadow-accent-dark/20 text-sm"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Đang đăng...' : hasOrderChanged ? 'Đăng thứ tự' : 'Đã lưu thứ tự'}
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Section Type Palette */}
                <div className="lg:col-span-1 border-r border-white/10 pr-8">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Thêm khối</h3>
                    <div className="space-y-2">
                        {SECTION_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => addSection(type)}
                                disabled={isAdding}
                                className="w-full bg-white/5 hover:bg-blue-500/10 hover:text-red-400 text-gray-400 p-3 rounded-xl border-2 border-transparent hover:border-red-500/30 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="flex items-center justify-between font-bold text-xs uppercase">
                                    {SECTION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
                                    {isAdding
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    }
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* DnD Layout */}
                <div className="lg:col-span-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Bố cục hiện tại</h3>
                    {sections.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <p className="text-lg font-bold">Chưa có khối nào</p>
                            <p className="text-sm mt-2">Thêm khối từ bảng bên trái</p>
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
