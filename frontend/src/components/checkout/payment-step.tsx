import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, PhoneCall, ShieldCheck } from 'lucide-react';
import { Button } from '../ui';
import { pageTransition } from '../../design-system/motion';
import { useCompanyInfo } from '../../hooks/use-company-info';
import type { PaymentFormState, PaymentMethod } from './checkout-types';
import { PaymentMethodList, usePaymentMethodChoice } from './payment-method-list';

/**
 * Bước "Thanh toán" của checkout.
 *
 * D04 mục 3 (binding): danh sách phương thức đến từ `GET /api/payments/methods`, không có bảng
 * cứng, không có ô mờ "sắp ra mắt", không nhắc tên nhà cung cấp xác nhận tự động ("SePay") với
 * khách. Trên dữ liệu ra mắt chỉ còn MỘT thẻ COD đã chọn sẵn, kèm một dòng hotline cho khách cần
 * chuyển khoản / xuất hoá đơn công ty.
 *
 * D04 R6: nút "Đặt hàng" bị chặn khi phương thức đang chọn không nằm trong danh sách server cho
 * phép — không tạo ra đơn kẹt với một cổng đã tắt.
 */

interface PaymentStepProps {
    value: PaymentFormState;
    onChange: (patch: Partial<PaymentFormState>) => void;
    onBack: () => void;
    onSubmit: () => void;
    submitting: boolean;
    totalAmount: number;
}

export function PaymentStep({ value, onChange, onBack, onSubmit, submitting }: PaymentStepProps) {
    const { companyInfo } = useCompanyInfo();
    const choice = usePaymentMethodChoice(value.paymentMethod, (code) =>
        onChange({ paymentMethod: code as PaymentMethod }),
    );

    const codOnly = choice.methods.length === 1 && choice.methods[0].code === 'cod';
    const blocked = submitting || choice.isPending || !choice.isSelectedAvailable;

    return (
        <motion.div
            key="pay"
            variants={pageTransition}
            initial="hidden"
            animate="show"
            exit="exit"
            className="rounded-2xl border border-line bg-surface p-6 shadow-xs md:p-8"
        >
            <div className="mb-6 flex items-center gap-3">
                <span
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand"
                >
                    <CreditCard className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-lg font-bold text-fg">Thanh toán</h2>
                    <p className="text-xs text-fg-muted">Chọn phương thức tiện lợi nhất cho bạn</p>
                </div>
            </div>

            <PaymentMethodList choice={choice} value={value.paymentMethod} onChange={(code) => onChange({ paymentMethod: code as PaymentMethod })} />

            {codOnly && (
                <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-sunken p-3 text-xs text-fg-muted">
                    <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                    <span>
                        Cần chuyển khoản hoặc xuất hoá đơn công ty? Gọi{' '}
                        <a href={`tel:${companyInfo.hotline.replace(/[^0-9+]/g, '')}`} className="font-semibold text-brand-text underline-offset-2 hover:underline">
                            {companyInfo.hotline}
                        </a>
                        , nhân viên sẽ hỗ trợ trực tiếp.
                    </span>
                </p>
            )}

            {!choice.isPending && !choice.isSelectedAvailable && choice.methods.length > 0 && (
                <p className="mt-4 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-xs text-fg">
                    Phương thức bạn chọn trước đó hiện không còn khả dụng. Vui lòng chọn lại ở danh sách trên.
                </p>
            )}

            <div className="mt-6 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" icon={ArrowLeft} onClick={onBack} disabled={submitting}>
                    Quay lại
                </Button>
                <Button type="button" className="flex-[2]" icon={ShieldCheck} onClick={onSubmit} loading={submitting} disabled={blocked}>
                    Đặt hàng
                </Button>
            </div>
        </motion.div>
    );
}

export default PaymentStep;
