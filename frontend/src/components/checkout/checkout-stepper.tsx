import { User, Tag, CreditCard, ClipboardCheck, Check, ChevronRight } from 'lucide-react';
import type { CheckoutStep } from './checkout-types';

interface CheckoutStepperProps {
    current: CheckoutStep;
}

const STEPS: { key: CheckoutStep; title: string; icon: typeof User }[] = [
    { key: 1, title: 'Giao hàng', icon: User },
    { key: 2, title: 'Khuyến mãi', icon: Tag },
    { key: 3, title: 'Thanh toán', icon: CreditCard },
    { key: 4, title: 'Xác nhận', icon: ClipboardCheck },
];

export function CheckoutStepper({ current }: CheckoutStepperProps) {
    return (
        <div className="flex items-center gap-1 bg-surface px-3 py-2 rounded-xl border border-line shadow-xs overflow-x-auto">
            {STEPS.map((s, idx) => {
                const isActive = current === s.key;
                const isDone = current > s.key;
                return (
                    <div key={s.key} className="flex items-center flex-shrink-0">
                        <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-140 ${
                                isActive
                                    ? 'bg-brand text-white'
                                    : isDone
                                        ? 'text-success'
                                        : 'text-fg-subtle'
                            }`}
                        >
                            <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border-2 ${
                                    isActive ? 'border-white/40' : 'border-current'
                                }`}
                            >
                                {isDone ? <Check className="w-3 h-3" /> : s.key}
                            </div>
                            <span className="hidden sm:block">{s.title}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <ChevronRight className="w-4 h-4 mx-0.5 text-line" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default CheckoutStepper;
