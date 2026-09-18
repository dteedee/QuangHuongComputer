/**
 * Running total + primary actions. Desktop: sticky column alongside the slot
 * list. Mobile: fixed bottom bar (Implementation Steps #3: "mobile: stacked +
 * bottom summary bar"). Same component, `sticky` vs `fixed` by breakpoint.
 */
import { Printer, Save, ShoppingCart } from 'lucide-react';
import { Button, IconButton, Price } from '../ui';
import type { PcCheckResponse } from '../../api/pcbuilder';

export interface PcSummaryBarProps {
    check: PcCheckResponse | undefined;
    pickedCount: number;
    onAddAllToCart: () => void;
    addAllRunning: boolean;
    onSave: () => void;
    onPrint: () => void;
}

export const PcSummaryBar = ({
    check, pickedCount, onAddAllToCart, addAllRunning, onSave, onPrint,
}: PcSummaryBarProps) => {
    const hasIncompatible = check?.overallVerdict === 'Incompatible';
    const disabled = pickedCount === 0;

    return (
        <div
            className={[
                'print:hidden',
                'lg:sticky lg:top-20 lg:rounded-xl lg:border lg:border-line lg:bg-surface lg:p-5',
                'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 shadow-lg lg:static lg:shadow-none',
            ].join(' ')}
        >
            <div className="flex items-center justify-between gap-3 lg:mb-4 lg:flex-col lg:items-stretch">
                <div className="lg:mb-1">
                    <p className="text-xs text-fg-muted">Tổng tiền ({pickedCount} linh kiện)</p>
                    <Price value={check?.totalPrice ?? 0} className="text-xl font-bold" />
                </div>
                <div className="flex items-center gap-2 lg:hidden">
                    <IconButton aria-label="Lưu & chia sẻ" variant="outline" disabled={disabled} onClick={onSave}>
                        <Save size={16} />
                    </IconButton>
                    <IconButton aria-label="In cấu hình" variant="ghost" disabled={disabled} onClick={onPrint}>
                        <Printer size={16} />
                    </IconButton>
                    <Button
                        variant="primary"
                        icon={ShoppingCart}
                        disabled={disabled || addAllRunning}
                        loading={addAllRunning}
                        onClick={onAddAllToCart}
                    >
                        Thêm vào giỏ
                    </Button>
                </div>
            </div>

            <div className="hidden flex-col gap-2 lg:flex">
                <Button variant="primary" icon={ShoppingCart} disabled={disabled || addAllRunning} loading={addAllRunning} onClick={onAddAllToCart}>
                    Thêm tất cả vào giỏ
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" icon={Save} disabled={disabled} onClick={onSave} block>
                        Lưu &amp; chia sẻ
                    </Button>
                    <Button variant="ghost" icon={Printer} disabled={disabled} onClick={onPrint} block>
                        In
                    </Button>
                </div>
                {hasIncompatible && (
                    <p className="text-xs text-danger">Cấu hình đang có xung đột — kiểm tra bảng tương thích trước khi đặt hàng.</p>
                )}
            </div>
        </div>
    );
};

export default PcSummaryBar;
