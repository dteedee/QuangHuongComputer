import { useEffect, useRef, useState } from 'react';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Upload, Youtube, Star, StarOff, Trash2, GripVertical, Image as ImageIcon, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi, type ProductMedia } from '../../api/catalog';
import { catalogAdminApi } from '../../api/catalog/admin';
import {
    Badge, Button, EmptyState, ErrorState, IconButton, Img, Input, RowActions, SkeletonText,
} from '../ui';

interface ProductMediaManagerProps {
    productId: string;
    /** Gọi sau mỗi lần thêm/xoá/đổi ảnh chính — để trang cha làm mới trạng thái "đã có ảnh". */
    onChanged?: () => void;
}

const YOUTUBE_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/;

function extractYoutubeId(url: string): string | null {
    const m = url.match(YOUTUBE_REGEX);
    return m ? m[3] : null;
}

/** Quản trị media của 1 sản phẩm: kéo thả sắp xếp, tải nhiều ảnh, nhúng YouTube, đặt ảnh chính. */
export default function ProductMediaManager({ productId, onChanged }: ProductMediaManagerProps) {
    const [items, setItems] = useState<ProductMedia[]>([]);
    const [loading, setLoading] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [error, setError] = useState<unknown>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const load = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            // `include=media` — đúng chính tả hợp đồng (catalog.md §2); `medias` bị bỏ qua.
            const bundle = await catalogAdminApi.getProductForEdit(productId);
            const list = bundle.medias || [];
            list.sort((a, b) => a.sortOrder - b.sortOrder);
            setItems(list);
            setError(null);
        } catch (e) {
            setItems([]);
            setError(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, [productId]);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const loadingToast = toast.loading(`Đang tải ${files.length} tệp lên...`);
        try {
            let nextOrder = items.length;
            const created: ProductMedia[] = [];
            for (const file of Array.from(files)) {
                const isImage = file.type.startsWith('image/');
                const uploaded = await catalogApi.uploadMedia(file, productId, isImage ? 'image' : 'video');
                const m = await catalogApi.addProductMedia(productId, {
                    type: isImage ? 'Image' : 'Video',
                    url: uploaded.url,
                    thumbnailUrl: uploaded.thumbnailUrl,
                    altText: file.name,
                    sortOrder: nextOrder++,
                    isPrimary: items.length === 0 && created.length === 0,
                    fileSize: file.size,
                });
                created.push(m);
            }
            setItems((prev) => [...prev, ...created]);
            toast.success(`Đã tải ${created.length} tệp!`, { id: loadingToast });
            onChanged?.();
        } catch {
            toast.error('Tải lên thất bại!', { id: loadingToast });
        }
    };

    const handleAddYoutube = async () => {
        const id = extractYoutubeId(youtubeUrl);
        if (!id) { toast.error('URL YouTube không hợp lệ.'); return; }
        try {
            const m = await catalogApi.addProductMedia(productId, {
                type: 'YoutubeEmbed',
                url: `https://www.youtube.com/embed/${id}`,
                thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                altText: 'YouTube video',
                sortOrder: items.length,
                isPrimary: false,
            });
            setItems((prev) => [...prev, m]);
            setYoutubeUrl('');
            toast.success('Đã thêm video YouTube.');
            onChanged?.();
        } catch {
            toast.error('Không thể thêm video.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await catalogApi.deleteProductMedia(productId, id);
            setItems((prev) => prev.filter((x) => x.id !== id));
            toast.success('Đã xoá media.');
            onChanged?.();
        } catch {
            toast.error('Xoá thất bại.');
        }
    };

    const handleSetPrimary = async (id: string) => {
        try {
            await catalogApi.updateProductMedia(productId, id, { isPrimary: true });
            setItems((prev) => prev.map((x) => ({ ...x, isPrimary: x.id === id })));
            toast.success('Đã đặt ảnh chính.');
            onChanged?.();
        } catch {
            toast.error('Không đặt được ảnh chính.');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex((x) => x.id === active.id);
        const newIndex = items.findIndex((x) => x.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const next = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({ ...it, sortOrder: idx }));
        setItems(next);
        try {
            await catalogApi.reorderProductMedia(productId, next.map((x) => x.id));
        } catch {
            toast.error('Không lưu được thứ tự.');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <Button type="button" variant="ink" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={15} /> Tải nhiều ảnh / video
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="sr-only"
                    aria-label="Chọn ảnh hoặc video để tải lên"
                    onChange={(e) => void handleUpload(e.target.files)}
                />
                <Input
                    label="Nhúng video YouTube"
                    icon={Youtube}
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="youtu.be/… hoặc youtube.com/watch?v=…"
                    className="min-w-[18rem] flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddYoutube} disabled={!youtubeUrl}>
                    Thêm YouTube
                </Button>
            </div>

            {loading ? (
                <SkeletonText lines={4} />
            ) : error ? (
                <ErrorState inline title="Không tải được thư viện ảnh" error={error} onRetry={() => void load()} />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={ImageIcon}
                    title="Chưa có ảnh nào"
                    description="Sản phẩm cần ít nhất một ảnh trước khi được hiện trên web."
                    action={{ label: 'Tải ảnh lên', onClick: () => fileInputRef.current?.click() }}
                />
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-2">
                            {items.map((m) => (
                                <SortableRow
                                    key={m.id}
                                    media={m}
                                    onDelete={handleDelete}
                                    onSetPrimary={handleSetPrimary}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}

// ============ Sortable row ============

interface SortableRowProps {
    media: ProductMedia;
    onDelete: (id: string) => void;
    onSetPrimary: (id: string) => void;
}

function SortableRow({ media, onDelete, onSetPrimary }: SortableRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: media.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    const thumb = media.thumbnailUrl || (media.type === 'Image' ? media.url : undefined);
    const isVideo = media.type === 'Video' || media.type === 'YoutubeEmbed';

    return (
        <li
            ref={setNodeRef}
            style={style}
            className="group/row flex items-center gap-3 rounded-xl border border-line bg-surface p-2"
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab rounded-md p-1 text-fg-subtle hover:text-fg active:cursor-grabbing"
                aria-label="Kéo để sắp xếp"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <div className="relative w-14 shrink-0">
                {thumb ? (
                    <Img src={thumb} alt={media.altText || ''} ratio="1/1" fit="cover" wrapperClassName="rounded-lg" />
                ) : (
                    <div className="flex aspect-square items-center justify-center rounded-lg bg-sunken">
                        <Play className="h-4 w-4 text-fg-subtle" />
                    </div>
                )}
                {isVideo && (
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-fg/80 px-1 text-2xs font-semibold text-bg">
                        {media.type === 'Video' ? 'MP4' : 'YT'}
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-13 font-medium text-fg">{media.altText || media.url}</p>
                <p className="num truncate text-xs text-fg-subtle">Thứ tự: {media.sortOrder}</p>
            </div>

            {media.isPrimary && <Badge variant="warning">Ảnh chính</Badge>}

            <RowActions>
                <IconButton
                    aria-label={media.isPrimary ? 'Đang là ảnh chính' : 'Đặt làm ảnh chính'}
                    size="sm"
                    variant="ghost"
                    disabled={media.isPrimary}
                    onClick={() => onSetPrimary(media.id)}
                >
                    {media.isPrimary ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                </IconButton>
                <IconButton aria-label="Xoá media" size="sm" variant="ghost" onClick={() => onDelete(media.id)}>
                    <Trash2 className="h-4 w-4" />
                </IconButton>
            </RowActions>
        </li>
    );
}
