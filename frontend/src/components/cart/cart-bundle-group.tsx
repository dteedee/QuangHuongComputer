import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Minus, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, IconButton, Img, Price, formatDong } from '../ui';
import type { CartBundleGroup, CartItem } from '../../context/CartContext';

interface CartBundleGroupCardProps {
    group: CartBundleGroup;
    lines: CartItem[];
    disabled?: boolean;
    onUpdateItem: (bundleId: string, productId: string, quantity: number) => void;
    onRemoveItem: (bundleId: string, productId: string) => void;
    onRemoveGroup: (bundleId: string) => void;
}

type PendingChange = { productId: string; name: string; quantity: number } | null;

/**
 * Một combo trong giỏ: thẻ gộp các món của cùng một combo. Đổi số lượng hay bỏ một món sẽ làm
 * combo VỠ (server trả giá các món về giá lẻ) — nên luôn hỏi lại trước khi làm.
 */
export function CartBundleGroupCard({
    group, lines, disabled, onUpdateItem, onRemoveItem, onRemoveGroup,
}: CartBundleGroupCardProps) {
    const [pending, setPending] = useState<PendingChange>(null);
    const [confirmRemoveGroup, setConfirmRemoveGroup] = useState(false);

    const confirmChange = () => {
        if (!pending) return;
        if (pending.quantity <= 0) onRemoveItem(group.bundleId, pending.productId);
        else onUpdateItem(group.bundleId, pending.productId, pending.quantity);
        setPending(null);
    };

    return (
        <section aria-label={`Combo ${group.name}`} className="rounded-xl border border-line bg-surface shadow-xs">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Boxes size={18} className="shrink-0 text-brand-text" aria-hidden />
                    <h3 className="truncate text-sm font-semibold text-fg">{group.name}</h3>
                    {group.sets > 1 && <Badge variant="neutral"><span className="num">× {group.sets} bộ</span></Badge>}
                </div>
                <div className="flex items-center gap-3">
                    <ComboStatus group={group} />
                    <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setConfirmRemoveGroup(true)}>
                        <Trash2 size={14} /> Gỡ combo
                    </Button>
                </div>
            </header>

            <ul className="divide-y divide-line">
                {lines.map((line) => (
                    <li key={line.id} className="flex flex-wrap items-center gap-3 p-4">
                        <Link to={`/san-pham/${line.id}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stage">
                            <Img src={line.imageUrl} alt={line.name} ratio="1/1" fit="contain" blend className="h-full w-full" />
                        </Link>
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium text-fg">{line.name}</p>
                            <p className="mt-0.5 text-2xs text-fg-subtle">
                                <Price value={line.price} className="text-2xs" showDiscount={false} /> / cái
                            </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-lg border border-line bg-sunken p-1">
                            <IconButton aria-label={`Giảm số lượng ${line.name}`} size="sm" variant="ghost" disabled={disabled}
                                onClick={() => setPending({ productId: line.id, name: line.name, quantity: line.quantity - 1 })}>
                                <Minus size={14} />
                            </IconButton>
                            <span className="num w-8 text-center text-sm font-semibold text-fg">{line.quantity}</span>
                            <IconButton aria-label={`Tăng số lượng ${line.name}`} size="sm" variant="ghost" disabled={disabled}
                                onClick={() => setPending({ productId: line.id, name: line.name, quantity: line.quantity + 1 })}>
                                <Plus size={14} />
                            </IconButton>
                        </div>
                        <IconButton aria-label={`Bỏ ${line.name} khỏi combo`} size="sm" variant="ghost" disabled={disabled}
                            onClick={() => setPending({ productId: line.id, name: line.name, quantity: 0 })}>
                            <Trash2 size={14} />
                        </IconButton>
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => { if (!open) setPending(null); }}
                title="Tách combo?"
                description={pending
                    ? `${pending.quantity <= 0 ? `Bỏ ${pending.name}` : `Đổi số lượng ${pending.name}`} sẽ tách combo "${group.name}". Các món còn lại trở về giá lẻ và không còn giá combo.`
                    : ''}
                confirmLabel="Tách combo"
                tone="danger"
                onConfirm={confirmChange}
            />
            <ConfirmDialog
                open={confirmRemoveGroup}
                onOpenChange={setConfirmRemoveGroup}
                title="Gỡ combo khỏi giỏ?"
                description={`Toàn bộ món của combo "${group.name}" sẽ bị gỡ khỏi giỏ hàng.`}
                confirmLabel="Gỡ combo"
                tone="danger"
                onConfirm={() => { setConfirmRemoveGroup(false); onRemoveGroup(group.bundleId); }}
            />
        </section>
    );
}

/** Dòng trạng thái của combo: tiết kiệm bao nhiêu, hay vì sao không còn giá combo. */
function ComboStatus({ group }: { group: CartBundleGroup }) {
    if (!group.isApplied) {
        return <Badge variant="warning">{group.reason ?? 'Combo không còn áp dụng'} — tính giá lẻ</Badge>;
    }
    if (group.pendingCheckout) {
        return (
            <span className="text-13 text-savings">
                Tiết kiệm <span className="num">{formatDong(group.discount)}₫</span> — áp dụng khi thanh toán
            </span>
        );
    }
    return <span className="text-13 font-semibold text-savings">Tiết kiệm <span className="num">{formatDong(group.discount)}₫</span></span>;
}

export default CartBundleGroupCard;
