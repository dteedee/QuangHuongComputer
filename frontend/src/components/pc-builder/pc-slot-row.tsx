/**
 * One slot in the build: either "chưa chọn" (empty CTA) or the picked part(s)
 * with remove/replace + a compatibility chip for THAT component (contract
 * §3's per-rule verdicts don't map 1:1 to a slot, so the chip here reflects
 * only whether any rule involving this slot fired — passed from the parent,
 * which already has the full `/check` response).
 */
import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { Button, Img, Price } from '../ui';
import { Reveal } from '../motion';
import type { PcSlotDef } from '../../api/pcbuilder';
import type { PcPickedItem } from '../../pages/build-pc/pc-build-state-types';

export interface PcSlotRowProps {
    slot: PcSlotDef;
    index: number;
    items: PcPickedItem[];
    onOpenPicker: () => void;
    onRemove: (productId: string) => void;
    onQuantityChange: (productId: string, quantity: number) => void;
}

export const PcSlotRow = ({ slot, index, items, onOpenPicker, onRemove, onQuantityChange }: PcSlotRowProps) => (
    <Reveal index={index} as="div" className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">
                {slot.name}
                {slot.required && <span className="ml-1 text-danger">*</span>}
            </h3>
            {slot.candidateCount === 0 && (
                <span className="text-xs text-fg-subtle">Chưa có linh kiện</span>
            )}
        </div>

        {items.length === 0 ? (
            <button
                type="button"
                onClick={onOpenPicker}
                disabled={slot.candidateCount === 0}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-4 text-left text-fg-muted transition-colors hover:border-brand hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Package size={20} className="shrink-0" aria-hidden />
                <span className="text-sm">Chọn {slot.name}</span>
            </button>
        ) : (
            <ul className="space-y-2">
                {items.map((item) => (
                    <li key={item.productId} className="flex items-center gap-3">
                        <Img
                            src={item.imageUrl}
                            alt={item.name}
                            ratio="1/1"
                            fit="contain"
                            blend
                            className="h-12 w-12 shrink-0 rounded-md"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                            <Price value={item.price} className="text-sm" />
                        </div>
                        {slot.allowMultiple && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    aria-label="Giảm số lượng"
                                    onClick={() => onQuantityChange(item.productId, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-line disabled:opacity-40"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-6 text-center text-sm">{item.quantity}</span>
                                <button
                                    type="button"
                                    aria-label="Tăng số lượng"
                                    onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
                                    disabled={item.quantity >= slot.maxQuantity}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-line disabled:opacity-40"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        )}
                        <Button size="sm" variant="outline" onClick={onOpenPicker}>Đổi</Button>
                        <button
                            type="button"
                            aria-label={`Bỏ ${item.name}`}
                            onClick={() => onRemove(item.productId)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-danger-subtle hover:text-danger"
                        >
                            <Trash2 size={16} />
                        </button>
                    </li>
                ))}
                {slot.allowMultiple && items.length < slot.maxQuantity && (
                    <button type="button" onClick={onOpenPicker} className="text-sm font-medium text-brand-text hover:underline">
                        + Thêm {slot.name}
                    </button>
                )}
            </ul>
        )}
    </Reveal>
);

export default PcSlotRow;
