/**
 * Một hàng liên kết trong Quản lý menu (kéo–thả được).
 *
 * Sửa đúng bốn lỗi chủ dự án chỉ ra trên màn hình `/backoffice/menus`:
 *  1. Ô đường dẫn bị cắt cụt (`/policy/huong-dan-thanh-toa`) → đường dẫn CHIẾM TRỌN một
 *     hàng riêng, không còn chen ba ô trên cùng một dòng (§9.6).
 *  2. Ô "Icon (tên Lucide)" bắt thuộc tên icon → `MenuIconPicker` có tìm kiếm + xem trước.
 *  3. Nhãn "Tab mới" vỡ hai dòng, dính mép → ô chọn cao 36px, nhãn `whitespace-nowrap`.
 *  4. Chỉ có tay kéo, không có nút xoá rõ ràng → nút "Xoá" có chữ, không phải icon trần.
 */
import type { FC } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button, Checkbox, Input } from '../../components/ui';
import type { MenuItem } from '../../api/content';
import { MenuIconPicker } from './menu-icon-picker';

interface MenuItemRowProps {
    id: string;
    item: MenuItem;
    isDeleting: boolean;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<MenuItem>) => void;
}

/** Chiều cao của `labelClass` (20px dòng + 6px margin) — dùng để canh các điều khiển
 *  không có nhãn thẳng hàng với đáy ô nhập có nhãn. */
const LABEL_OFFSET = 'md:mt-[26px]';

export const MenuItemRow: FC<MenuItemRowProps> = ({ id, item, isDeleting, onDelete, onUpdate }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className={`relative rounded-xl border bg-surface p-3 ${isDragging ? 'z-floating border-brand shadow-md' : 'border-line'}`}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    aria-label={`Kéo để đổi thứ tự: ${item.label || 'liên kết chưa đặt tên'}`}
                    className={`flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-sunken hover:text-fg active:cursor-grabbing ${LABEL_OFFSET}`}
                >
                    <GripVertical size={18} aria-hidden />
                </button>

                <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto]">
                    <Input
                        label="Nhãn hiển thị"
                        value={item.label}
                        placeholder="Ví dụ: Hướng dẫn thanh toán"
                        onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                    />

                    <MenuIconPicker
                        value={item.icon}
                        onChange={(icon) => onUpdate(item.id, { icon })}
                    />

                    <div className={`flex h-9 items-center ${LABEL_OFFSET}`}>
                        <Checkbox
                            checked={item.openInNewTab}
                            onChange={(e) => onUpdate(item.id, { openInNewTab: e.target.checked })}
                            label={<span className="whitespace-nowrap text-13">Mở tab mới</span>}
                        />
                    </div>

                    {/* §9.6: đường dẫn dùng ô rộng HẾT hàng — không bao giờ cắt cụt.
                        `className` của `Input` rơi vào chính thẻ <input>, nên `col-span`
                        phải đặt trên thẻ bọc. */}
                    <div className="min-w-0 md:col-span-3">
                        <Input
                            label="Đường dẫn"
                            value={item.url}
                            placeholder="/danh-muc/laptop hoặc https://…"
                            onChange={(e) => onUpdate(item.id, { url: e.target.value })}
                        />
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    icon={Trash2}
                    loading={isDeleting}
                    onClick={() => onDelete(item.id)}
                    className={`shrink-0 ${LABEL_OFFSET}`}
                >
                    Xoá
                </Button>
            </div>
        </li>
    );
};
