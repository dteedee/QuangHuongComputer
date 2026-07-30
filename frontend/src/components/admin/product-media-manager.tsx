import { useEffect, useState } from 'react';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Upload, Youtube, Star, StarOff, Trash2, GripVertical, Image as ImageIcon, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi, type ProductMedia } from '../../api/catalog';

interface ProductMediaManagerProps {
    productId: string;
}

const YOUTUBE_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/;

function extractYoutubeId(url: string): string | null {
    const m = url.match(YOUTUBE_REGEX);
    return m ? m[3] : null;
}

/** Quản trị media của 1 sản phẩm: kéo thả sắp xếp, tải nhiều ảnh, nhúng YouTube, đặt ảnh chính. */
export default function ProductMediaManager({ productId }: ProductMediaManagerProps) {
    const [items, setItems] = useState<ProductMedia[]>([]);
    const [loading, setLoading] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const load = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const bundle = await catalogApi.getProductWithDetails(productId);
            const list = bundle.medias || [];
            list.sort((a, b) => a.sortOrder - b.sortOrder);
            setItems(list);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId]);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const loadingToast = toast.loading(`Đang tải ${files.length} tệp lên...`);
        try {
            let nextOrder = items.length;
            const created: ProductMedia[] = [];
            for (const file of Array.from(files)) {
                const uploaded = await catalogApi.uploadMedia(file);
                const isImage = file.type.startsWith('image/');
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
        } catch {
            toast.error('Không thể thêm video.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await catalogApi.deleteProductMedia(productId, id);
            setItems((prev) => prev.filter((x) => x.id !== id));
            toast.success('Đã xoá media.');
        } catch {
            toast.error('Xoá thất bại.');
        }
    };

    const handleSetPrimary = async (id: string) => {
        try {
            await catalogApi.updateProductMedia(productId, id, { isPrimary: true });
            setItems((prev) => prev.map((x) => ({ ...x, isPrimary: x.id === id })));
            toast.success('Đã đặt ảnh chính.');
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
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl cursor-pointer hover:bg-black transition-all text-sm font-semibold">
                    <Upload size={16} />
                    Tải nhiều ảnh / video
                    <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => void handleUpload(e.target.files)}
                    />
                </label>
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                    <div className="relative flex-1">
                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 w-4 h-4" />
                        <input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="Dán URL YouTube (youtu.be/... hoặc youtube.com/watch?v=...)"
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--accent-primary)]"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddYoutube}
                        className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer"
                    >
                        Thêm YouTube
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500 py-6 text-center">Đang tải...</p>
            ) : items.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2">
                    <ImageIcon size={36} />
                    <p className="text-sm">Chưa có media. Bấm "Tải nhiều ảnh / video" để bắt đầu.</p>
                </div>
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

    return (
        <li
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-white"
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing"
                aria-label="Kéo để sắp xếp"
            >
                <GripVertical className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Play className="w-4 h-4 text-gray-400" />
                )}
                {(media.type === 'Video' || media.type === 'YoutubeEmbed') && (
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded">
                        {media.type === 'Video' ? 'MP4' : 'YT'}
                    </span>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{media.altText || media.url}</p>
                <p className="text-[11px] text-gray-500 truncate">Thứ tự: {media.sortOrder}</p>
            </div>

            <button
                type="button"
                onClick={() => onSetPrimary(media.id)}
                disabled={media.isPrimary}
                title={media.isPrimary ? 'Đang là ảnh chính' : 'Đặt làm ảnh chính'}
                className={`p-2 rounded-lg transition-colors ${
                    media.isPrimary
                        ? 'text-amber-500 bg-amber-50'
                        : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 cursor-pointer'
                }`}
            >
                {media.isPrimary ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </button>

            <button
                type="button"
                onClick={() => onDelete(media.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Xoá"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </li>
    );
}
