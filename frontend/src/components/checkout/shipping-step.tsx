import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Truck, User } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { Button, Card, CardBody } from '../ui';
import { Form, TextField } from '../form';
import StorePickupSelector from './store-pickup-selector';
import ShippingAddressForm from './shipping-address-form';
import { shippingSchema, type ShippingSchemaValues } from './checkout-schemas';
import type { ShippingFormState } from './checkout-types';
import type { ShippingQuoteDto } from '../../api/sales/cart-checkout';
import { fadeUp } from '../../design-system/motion';

interface ShippingStepProps {
    isAuthenticated: boolean;
    value: ShippingFormState;
    netSubtotal: number;
    onChange: (patch: Partial<ShippingFormState>) => void;
    onNext: (values: ShippingFormState) => void;
    onLogin: () => void;
    onQuote: (quote: ShippingQuoteDto) => void;
}

const toValues = (v: ShippingFormState): ShippingSchemaValues => ({
    deliveryMethod: v.deliveryMethod,
    fullName: v.fullName, phone: v.phone, email: v.email,
    provinceCode: v.provinceCode, province: v.province,
    wardCode: v.wardCode, ward: v.ward,
    address: v.address,
    pickupStoreId: v.pickupStoreId, pickupStoreName: v.pickupStoreName,
    notes: v.notes ?? '',
    createAccount: v.createAccount, saveAddress: v.saveAddress,
    addressId: v.addressId,
});

/** Bước 1 — thông tin nhận hàng. Toàn bộ chạy trên RHF + zod của bộ form kit (W1-9). */
export function ShippingStep({
    isAuthenticated, value, netSubtotal, onChange, onNext, onLogin, onQuote,
}: ShippingStepProps) {
    return (
        <motion.div variants={fadeUp} initial="hidden" animate="show" exit="hidden">
            <Card>
                <CardBody className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand-text flex items-center justify-center">
                            <User className="w-5 h-5" aria-hidden />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-fg">Thông tin nhận hàng</h2>
                            <p className="text-13 text-fg-muted">Nhập chính xác để đơn hàng đến đúng tay bạn</p>
                        </div>
                    </div>

                    {!isAuthenticated && (
                        <div className="flex items-start gap-3 rounded-xl bg-info-subtle px-4 py-3 text-13 text-info">
                            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
                            <p>
                                Bạn đang đặt hàng với tư cách khách.{' '}
                                <button type="button" onClick={onLogin} className="font-semibold underline">Đăng nhập</button>{' '}
                                để tích điểm và theo dõi đơn hàng.
                            </p>
                        </div>
                    )}

                    <Form<ShippingSchemaValues>
                        schema={shippingSchema}
                        defaultValues={toValues(value)}
                        onSubmit={async (data) => { onNext({ ...value, ...data, notes: data.notes ?? '' }); }}
                    >
                        {(form) => (
                            <div className="space-y-5">
                                <div role="radiogroup" aria-label="Hình thức nhận hàng" className="flex gap-1 rounded-xl bg-sunken p-1">
                                    {([
                                        { v: 'delivery', label: 'Giao hàng tận nơi', icon: Truck },
                                        { v: 'pickup', label: 'Nhận tại cửa hàng', icon: MapPin },
                                    ] as const).map(({ v, label, icon: Icon }) => (
                                        <button key={v} type="button" role="radio" aria-checked={form.watch('deliveryMethod') === v}
                                            onClick={() => { form.setValue('deliveryMethod', v, { shouldValidate: false }); onChange({ deliveryMethod: v }); }}
                                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-140 ${
                                                form.watch('deliveryMethod') === v
                                                    ? 'bg-surface text-brand-text shadow-xs'
                                                    : 'text-fg-muted hover:text-fg'
                                            }`}>
                                            <Icon className="w-4 h-4" aria-hidden />{label}
                                        </button>
                                    ))}
                                </div>

                                {form.watch('deliveryMethod') === 'pickup' ? (
                                    <>
                                        <StorePickupSelector
                                            selectedId={form.watch('pickupStoreId')}
                                            onSelect={(id, name) => {
                                                form.setValue('pickupStoreId', id, { shouldValidate: true });
                                                form.setValue('pickupStoreName', name);
                                                onChange({ pickupStoreId: id, pickupStoreName: name });
                                            }}
                                        />
                                        {form.formState.errors.pickupStoreId && (
                                            <p role="alert" className="text-xs font-medium text-danger">
                                                {form.formState.errors.pickupStoreId.message}
                                            </p>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <TextField name="fullName" control={form.control} label="Họ và tên người nhận" required />
                                            <TextField name="phone" control={form.control} label="Số điện thoại" required inputMode="tel" />
                                            <div className="sm:col-span-2">
                                                <TextField name="email" control={form.control} label="Email" type="email"
                                                    hint="Không bắt buộc khi nhận tại cửa hàng." />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <ShippingAddressForm
                                        isAuthenticated={isAuthenticated}
                                        control={form.control}
                                        setValue={form.setValue}
                                        provinceCode={form.watch('provinceCode')}
                                        wardCode={form.watch('wardCode')}
                                        netSubtotal={netSubtotal}
                                        onQuote={onQuote}
                                    />
                                )}

                                <TextField name="notes" control={form.control} label="Ghi chú cho đơn hàng"
                                    placeholder="VD: giao trong giờ hành chính, gọi trước khi giao…" />

                                <Button type="submit" className="w-full" size="lg">
                                    Tiếp tục — chọn khuyến mãi <ArrowRight className="w-[18px] h-[18px]" />
                                </Button>
                            </div>
                        )}
                    </Form>
                </CardBody>
            </Card>
        </motion.div>
    );
}

export default ShippingStep;
