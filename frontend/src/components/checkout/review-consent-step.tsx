import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardCheck, Pencil } from 'lucide-react';
import { Button, Card, CardBody, Checkbox, Price } from '../ui';
import { Form } from '../form';
import { CartTotals } from '../cart/cart-totals';
import InvoiceInfoBlock from './invoice-info-block';
import { reviewSchema, type ReviewSchemaValues } from './checkout-schemas';
import type { InvoiceFormState, PaymentFormState, ShippingFormState } from './checkout-types';
import type { CartItem } from '../../context/CartContext';
import type { VatBucketDto } from '../../api/sales/cart-checkout';
import { fadeUp } from '../../design-system/motion';

const PAYMENT_LABEL: Record<PaymentFormState['paymentMethod'], string> = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng',
    vnpay: 'Thẻ / VNPay',
    momo: 'Ví MoMo',
    zalopay: 'Ví ZaloPay',
    installment: 'Trả góp qua công ty tài chính',
};

/** Bốn trang chính sách bắt buộc phải dẫn tới trước khi đặt hàng (D08). */
const POLICIES = [
    { to: '/chinh-sach/return', label: 'Chính sách đổi trả' },
    { to: '/chinh-sach/warranty', label: 'Chính sách bảo hành' },
    { to: '/chinh-sach/shipping', label: 'Chính sách vận chuyển' },
    { to: '/bao-mat', label: 'Chính sách bảo mật thông tin' },
] as const;

interface ReviewConsentStepProps {
    items: CartItem[];
    shipping: ShippingFormState;
    payment: PaymentFormState;
    invoice: InvoiceFormState;
    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    total: number;
    tax: number;
    vatBreakdown?: VatBucketDto[];
    serverError: string | null;
    submitting: boolean;
    onEditStep: (step: 1 | 2 | 3) => void;
    onBack: () => void;
    onConfirm: (values: ReviewSchemaValues) => void;
}

/**
 * Bước 4 — **Xác nhận & đặt hàng** (D08, Luật Thương mại điện tử 2025).
 *
 * Trước khi đơn được tạo, khách phải thấy đủ: hàng hoá + số lượng, hình thức và thời gian giao,
 * khuyến mãi đang áp, TOÀN BỘ khối tiền gồm thuế và phí vận chuyển, phương thức thanh toán —
 * và phải sửa lại được từng phần (nút "Sửa" quay về đúng bước). Không có bước này, nút "Đặt hàng"
 * ở bước thanh toán tạo đơn ngay khi khách chưa từng nhìn thấy tổng tiền cuối cùng.
 */
export function ReviewConsentStep({
    items, shipping, payment, invoice, subtotal, discountAmount, shippingAmount, total, tax,
    vatBreakdown, serverError, submitting, onEditStep, onBack, onConfirm,
}: ReviewConsentStepProps) {
    const isPickup = shipping.deliveryMethod === 'pickup';

    const Section = ({ title, step, children }: { title: string; step: 1 | 2 | 3; children: React.ReactNode }) => (
        <section className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-fg">{title}</h3>
                <Button variant="ghost" size="sm" onClick={() => onEditStep(step)} type="button">
                    <Pencil size={13} /> Sửa
                </Button>
            </div>
            {children}
        </section>
    );

    return (
        <motion.div variants={fadeUp} initial="hidden" animate="show" exit="hidden">
            <Card>
                <CardBody className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand-text flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5" aria-hidden />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-fg">Xác nhận đơn hàng</h2>
                            <p className="text-13 text-fg-muted">Kiểm tra lại toàn bộ thông tin trước khi đặt hàng</p>
                        </div>
                    </div>

                    <Section title="Sản phẩm" step={1}>
                        <ul className="divide-y divide-line">
                            {items.map(item => (
                                <li key={`${item.id}-${item.variantId ?? ''}`} className="flex justify-between gap-3 py-2 text-13">
                                    <span className="text-fg">
                                        {item.name}
                                        {item.variantName && <span className="text-fg-subtle"> — {item.variantName}</span>}
                                        <span className="text-fg-subtle"> × {item.quantity}</span>
                                    </span>
                                    <Price value={item.lineTotal} className="text-13" showDiscount={false} />
                                </li>
                            ))}
                        </ul>
                    </Section>

                    <Section title={isPickup ? 'Nhận tại cửa hàng' : 'Giao hàng'} step={1}>
                        <div className="text-13 text-fg-muted space-y-0.5">
                            <p className="text-fg font-medium">{shipping.fullName} · {shipping.phone}</p>
                            {isPickup ? (
                                <>
                                    <p>{shipping.pickupStoreName}</p>
                                    <p>Cửa hàng gọi báo khi đơn sẵn sàng, thường trong vòng 2 giờ làm việc.</p>
                                </>
                            ) : (
                                <>
                                    <p>{[shipping.address, shipping.ward, shipping.province].filter(Boolean).join(', ')}</p>
                                    <p>Giao hàng tiêu chuẩn, dự kiến 2–5 ngày làm việc tuỳ khu vực.</p>
                                </>
                            )}
                            {shipping.notes && <p className="italic">Ghi chú: {shipping.notes}</p>}
                        </div>
                    </Section>

                    <Section title="Khuyến mãi & thanh toán" step={3}>
                        <div className="text-13 text-fg-muted space-y-0.5">
                            <p>Phương thức thanh toán: <span className="text-fg font-medium">{PAYMENT_LABEL[payment.paymentMethod]}</span></p>
                            {discountAmount > 0
                                ? <p>Đã áp khuyến mãi, giảm <span className="text-success font-medium">{discountAmount.toLocaleString('vi-VN')}₫</span></p>
                                : <p>Không có khuyến mãi nào được áp cho đơn này.</p>}
                        </div>
                    </Section>

                    <section className="rounded-xl border border-line bg-surface p-5">
                        <h3 className="text-sm font-semibold text-fg mb-3">Tổng tiền phải trả</h3>
                        <CartTotals subtotal={subtotal} discountAmount={discountAmount}
                            shippingAmount={shippingAmount} total={total} tax={tax} vatBreakdown={vatBreakdown} />
                    </section>

                    <Form<ReviewSchemaValues>
                        schema={reviewSchema}
                        defaultValues={{ ...invoice, termsAccepted: false }}
                        onSubmit={async (data) => { onConfirm(data); }}
                    >
                        {(form) => (
                            <div className="space-y-5">
                                <InvoiceInfoBlock control={form.control} watch={form.watch} />

                                <Controller
                                    name="termsAccepted"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Checkbox
                                            checked={field.value}
                                            onChange={(e) => field.onChange(e.target.checked)}
                                            error={fieldState.error?.message}
                                            label={<span className="text-13">
                                                Tôi đã đọc và đồng ý với{' '}
                                                {POLICIES.map((p, i) => (
                                                    <span key={p.to}>
                                                        <Link to={p.to} target="_blank" rel="noreferrer"
                                                            className="font-medium text-brand-text underline">{p.label}</Link>
                                                        {i < POLICIES.length - 1 ? (i === POLICIES.length - 2 ? ' và ' : ', ') : '.'}
                                                    </span>
                                                ))}
                                            </span>}
                                        />
                                    )}
                                />

                                {serverError && (
                                    <p role="alert" className="rounded-lg bg-danger-subtle px-3 py-2 text-13 text-danger">
                                        {serverError}
                                    </p>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
                                        <ArrowLeft className="w-4 h-4" /> Quay lại
                                    </Button>
                                    <Button type="submit" className="flex-1" size="lg" loading={submitting}>
                                        Đặt hàng
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                </CardBody>
            </Card>
        </motion.div>
    );
}

export default ReviewConsentStep;
