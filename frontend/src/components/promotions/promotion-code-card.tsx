/**
 * A running coupon code: discount rule, name/description (the conditions the owner typed),
 * end date + live countdown, remaining uses, and the one action that matters — copy the code
 * to paste at checkout. Clipboard can be blocked (http, permission); the code is then selected
 * so the customer can copy it by hand, same fallback as the VietQR panel.
 */
import { useRef, useState } from 'react';
import { Check, Copy, TicketPercent } from 'lucide-react';
import { Button, notify } from '../ui';
import type { AvailablePromotionCode } from '../../api/promotions/public';
import { formatCountdown, useCountdown } from './use-countdown';
import { promotionDiscountLabel, promotionEndLabel } from './promotion-code-helpers';

export const PromotionCodeCard = ({ promo }: { promo: AvailablePromotionCode }) => {
    const { parts, ended } = useCountdown(promo.endAt);
    const [copied, setCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);
    const endLabel = promotionEndLabel(promo.endAt);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(promo.code);
            setCopied(true);
            notify.success(`Đã sao chép mã ${promo.code}`, { description: 'Dán mã ở bước thanh toán để được giảm giá.' });
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            const node = codeRef.current;
            if (node) window.getSelection()?.selectAllChildren(node);
            notify.info('Hãy bôi đen và sao chép mã thủ công');
        }
    };

    return (
        <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand-text">
                    <TicketPercent size={20} aria-hidden />
                </span>
                <div className="min-w-0">
                    <p className="font-display text-base font-bold text-brand-text">{promotionDiscountLabel(promo)}</p>
                    <h3 className="text-sm font-medium text-fg">{promo.name}</h3>
                </div>
            </div>

            {promo.description && <p className="mt-2 text-sm leading-5 text-fg-muted">{promo.description}</p>}

            <div className="mt-3 space-y-0.5 text-xs text-fg-subtle">
                {endLabel && <p className="num">{endLabel}</p>}
                {parts && <p className="num text-fg-muted" role="timer">Còn {formatCountdown(parts)}</p>}
                {!promo.endAt && <p>Không giới hạn thời gian</p>}
                {promo.usageRemaining !== null && <p className="num">Còn {Math.max(0, promo.usageRemaining)} lượt dùng</p>}
            </div>

            <div className="mt-auto flex items-center gap-2 pt-4">
                <code
                    ref={codeRef}
                    className="num flex h-9 flex-1 items-center justify-center rounded-md border border-dashed border-brand-line bg-brand-subtle px-3 text-sm font-bold tracking-wide text-brand-text"
                >
                    {promo.code}
                </code>
                <Button size="sm" variant="primary" icon={copied ? Check : Copy} onClick={copy} disabled={ended}>
                    {ended ? 'Hết hạn' : copied ? 'Đã chép' : 'Sao chép'}
                </Button>
            </div>
        </article>
    );
};

export default PromotionCodeCard;
