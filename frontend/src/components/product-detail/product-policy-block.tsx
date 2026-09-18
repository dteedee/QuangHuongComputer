/**
 * D08 policy strip: "BH {n} tháng {chính hãng|tại Quang Hưởng} · 1 đổi 1 {n}
 * ngày · đổi trả {n} ngày". Every number comes from the two public
 * effective-policy endpoints (`/warranty/policies/effective`,
 * `/sales/return-policies/effective`) — nothing is typed in here.
 *
 * D04: the instalment line appears ONLY when a partner is really configured,
 * which is exactly when `GET /api/payments/methods` carries `installment`.
 */
import { BadgeCheck, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';

import { usePaymentMethods } from '../../api/payments/methods';
import { Skeleton } from '../ui';
import { useProductPolicy } from './use-product-detail-data';

interface ProductPolicyBlockProps {
    productId: string;
    /** `Products.IsReturnExcluded` — excluded from exchange/buy-back, never from warranty. */
    isReturnExcluded?: boolean;
}

export default function ProductPolicyBlock({ productId, isReturnExcluded }: ProductPolicyBlockProps) {
    const { data, isPending } = useProductPolicy(productId);
    const { data: methods } = usePaymentMethods();

    if (isPending) {
        return <Skeleton className="h-24 w-full rounded-xl" />;
    }

    const warranty = data?.warranty;
    const returns = data?.returns;
    // The store policy wins when it is longer — that is what the customer gets.
    const manufacturerMonths = warranty?.manufacturer?.months ?? 0;
    const storeMonths = warranty?.store?.months ?? 0;
    const months = Math.max(manufacturerMonths, storeMonths);
    const atStore = storeMonths > manufacturerMonths;

    const excluded = isReturnExcluded || returns?.isReturnExcluded;
    const replaceDays = returns?.daysForDefectReplace ?? 0;
    const returnDays = returns?.daysForReturn ?? 0;

    const hasInstalment = (methods?.methods ?? []).some((m) => m.code === 'installment');

    const lines: Array<{ icon: typeof ShieldCheck; text: string }> = [];
    if (months > 0) {
        lines.push({
            icon: ShieldCheck,
            text: `Bảo hành ${months} tháng ${atStore ? 'tại Quang Hưởng' : 'chính hãng'}`,
        });
    }
    if (!excluded && replaceDays > 0) {
        lines.push({ icon: RefreshCw, text: `1 đổi 1 trong ${replaceDays} ngày nếu lỗi nhà sản xuất` });
    }
    if (!excluded && returnDays > 0) {
        lines.push({ icon: BadgeCheck, text: `Đổi trả trong ${returnDays} ngày theo chính sách` });
    }
    if (hasInstalment) {
        lines.push({ icon: CreditCard, text: 'Hỗ trợ trả góp qua đối tác tài chính' });
    }

    if (lines.length === 0) {
        return (
            <p className="rounded-xl border border-line bg-sunken px-4 py-3 text-sm text-fg-muted">
                Chính sách bảo hành đang được cập nhật — vui lòng gọi hotline để được xác nhận.
            </p>
        );
    }

    return (
        <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden">
            {lines.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2 px-4 py-2.5 text-sm text-fg">
                    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                    <span>{text}</span>
                </li>
            ))}
        </ul>
    );
}
