/**
 * Trình dựng trang chủ — viết lại giao diện theo design-guidelines §9.
 *  · `PageHeader` + `SaveButton` 4 trạng thái thay cho nút "Đã lưu thứ tự" màu đỏ nhạt (§9.4).
 *  · Bỏ toàn bộ `bg-white`/`gray-*`/`white/5` — trang này trước đây vẽ chữ trắng trên nền
 *    sáng (`text-white` trên `bg-bg`) nên tiêu đề gần như vô hình; nay dùng token (§9.1).
 *  · Bỏ `max-w-6xl mx-auto`, dùng hết bề ngang (§9.2).
 */
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
import { Plus, Trash2, GripVertical, Edit3, Eye, EyeOff, Pencil } from 'lucide-react';
import { contentApi, type HomepageSection } from '../../api/content';
import { useConfirm } from '../../context/ConfirmContext';
import {
    Badge, Button, Card, EmptyState, IconButton, PageHeader, SaveButton, Skeleton,
    type SaveStatus,
} from '../../components/ui';
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

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className={`flex items-center gap-2 rounded-xl border bg-surface px-2.5 py-2 ${isDragging ? 'z-floating border-brand shadow-md' : 'border-line'}`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={`Kéo để đổi thứ tự: ${section.title}`}
                className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-sunken hover:text-fg active:cursor-grabbing"
            >
                <GripVertical size={18} aria-hidden />
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-13 font-semibold text-fg">{section.title}</h3>
                    <Badge variant="neutral">{SECTION_TYPE_LABELS[section.sectionType] ?? section.sectionType}</Badge>
                    {!section.isActive && <Badge variant="warning">Đã ẩn</Badge>}
                </div>
                <p className="mt-0.5 truncate text-2xs text-fg-subtle">
                    {section.cssClass || 'Không có class tuỳ chỉnh'}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <IconButton
                    aria-label={section.isActive ? 'Ẩn khối' : 'Hiện khối'}
                    title={section.isActive ? 'Ẩn khối' : 'Hiện khối'}
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggle(section.id)}
                >
                    {section.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </IconButton>
                <IconButton aria-label="Sửa cấu hình" title="Sửa cấu hình" variant="ghost" size="sm" onClick={() => onEdit(section)}>
                    <Edit3 size={16} />
                </IconButton>
                <IconButton
                    aria-label="Xoá khối"
                    title="Xoá khối"
                    variant="ghost"
                    size="sm"
                    loading={isDeleting}
                    onClick={() => onDelete(section.id)}
                >
                    <Trash2 size={16} />
                </IconButton>
            </div>
        </li>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const HomepageBuilder = () => {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    /* §9.4: trạng thái nút lưu do trang sở hữu — "Đã lưu" là dòng chữ, không phải nút. */
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
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
        setSaveStatus('saving');
        try {
            await contentApi.admin.reorderHomepageSections(
                sections.map((s, i) => ({ id: s.id, displayOrder: i + 1 }))
            );
            setHasOrderChanged(false);
            setSaveStatus('saved');
        } catch {
            setSaveStatus('error');
        }
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Trình dựng trang chủ"
                description="Thêm, ẩn và sắp xếp các khối của trang chủ. Kéo để đổi thứ tự rồi bấm Đăng."
                actions={
                    <>
                        <Button variant="outline" size="sm" icon={Eye} onClick={() => window.open('/', '_blank')}>
                            Xem trước
                        </Button>
                        {/* Hành động chính DUY NHẤT của màn hình (§9.1). */}
                        <SaveButton
                            size="sm"
                            status={saveStatus}
                            label="Đăng thứ tự"
                            savingLabel="Đang đăng…"
                            savedLabel="Đã đăng"
                            errorMessage="Không đăng được bố cục, thử lại."
                            disabled={!hasOrderChanged}
                            onClick={handlePublish}
                            onDone={() => setSaveStatus('idle')}
                        />
                    </>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
                <Card padded radius="xl" className="min-w-0">
                    <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">Thêm khối</h2>
                    <div className="space-y-1.5">
                        {SECTION_TYPES.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => addSection(type)}
                                disabled={isAdding}
                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-13 font-medium text-fg transition-colors hover:bg-sunken disabled:opacity-50"
                            >
                                <span className="truncate">{SECTION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}</span>
                                <Plus size={14} className="shrink-0 text-fg-subtle" aria-hidden />
                            </button>
                        ))}
                    </div>
                </Card>

                <Card padded radius="xl" className="min-w-0">
                    <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">Bố cục hiện tại</h2>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                        </div>
                    ) : sections.length === 0 ? (
                        <EmptyState
                            icon={Pencil}
                            title="Chưa có khối nào"
                            description="Thêm khối từ danh sách bên trái để bắt đầu dựng trang chủ."
                        />
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                <ul className="space-y-2">
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
                                </ul>
                            </SortableContext>
                        </DndContext>
                    )}
                </Card>
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
