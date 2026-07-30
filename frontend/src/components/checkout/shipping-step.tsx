import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Truck, MapPin, ArrowRight } from 'lucide-react';
import StorePickupSelector from './store-pickup-selector';
import ShippingAddressForm from './shipping-address-form';
import type { ShippingFormState } from './checkout-types';

interface ShippingStepProps {
    isAuthenticated: boolean;
    value: ShippingFormState;
    onChange: (patch: Partial<ShippingFormState>) => void;
    onNext: () => void;
    onLogin: () => void;
    onShippingFee: (fee: number) => void;
    ghnDistrictId: number;
    ghnWardCode: string;
    onGhnChange: (districtId: number, wardCode: string) => void;
}

const input = (err?: string) =>
    `w-full px-4 py-3 border ${err ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[var(--accent-primary,#dc2626)] outline-none text-gray-900 font-medium transition-all`;
const label = 'block text-sm font-semibold text-gray-600 mb-1';

export function ShippingStep({
    isAuthenticated, value, onChange, onNext, onLogin, onShippingFee,
    ghnDistrictId, ghnWardCode, onGhnChange,
}: ShippingStepProps) {
    const [errors, setErrors] = useState<Partial<Record<keyof ShippingFormState, string>>>({});

    const validate = (): boolean => {
        const e: Partial<Record<keyof ShippingFormState, string>> = {};
        if (!value.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';
        if (!/^[0-9]{10,11}$/.test(value.phone)) e.phone = 'SĐT 10-11 số';
        if (value.deliveryMethod === 'delivery') {
            if (!/.+@.+\..+/.test(value.email)) e.email = 'Email không hợp lệ';
            if (!value.province) e.province = 'Chọn tỉnh';
            if (!value.district) e.district = 'Chọn quận/huyện';
            if (!value.ward) e.ward = 'Chọn phường/xã';
            if (!value.address.trim()) e.address = 'Nhập địa chỉ chi tiết';
        } else if (!value.pickupStoreId) {
            e.pickupStoreId = 'Chọn cửa hàng nhận';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    return (
        <motion.div key="ship" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[var(--accent-primary,#dc2626)]">
                    <User className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Thông tin nhận hàng</h2>
                    <p className="text-gray-500 text-xs">Nhập chính xác để chúng tôi phục vụ tốt nhất</p>
                </div>
            </div>

            {!isAuthenticated && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <User className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-700 text-sm">
                        Bạn đang thanh toán với tư cách khách.{' '}
                        <button type="button" onClick={onLogin} className="font-bold underline hover:text-amber-900">
                            Đăng nhập
                        </button>{' '}để tích điểm & theo dõi đơn.
                    </p>
                </div>
            )}

            {/* Delivery method toggle */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6 gap-1">
                {([
                    { v: 'delivery', label: 'Giao hàng tận nơi', icon: Truck },
                    { v: 'pickup', label: 'Nhận tại cửa hàng', icon: MapPin },
                ] as const).map(({ v, label: L, icon: Icon }) => (
                    <button key={v} type="button" onClick={() => onChange({ deliveryMethod: v })}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                            value.deliveryMethod === v ? 'bg-white text-[var(--accent-primary,#dc2626)] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        <Icon className="w-4 h-4" />{L}
                    </button>
                ))}
            </div>

            {value.deliveryMethod === 'pickup' ? (
                <div className="space-y-5">
                    <StorePickupSelector
                        selectedId={value.pickupStoreId}
                        onSelect={(id, name) => onChange({ pickupStoreId: id, pickupStoreName: name })}
                    />
                    {errors.pickupStoreId && <p className="text-red-500 text-xs">{errors.pickupStoreId}</p>}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={label}>Họ và tên *</label>
                            <input value={value.fullName} onChange={e => onChange({ fullName: e.target.value })}
                                placeholder="Nguyễn Văn A" className={input(errors.fullName)} />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label className={label}>SĐT *</label>
                            <input type="tel" value={value.phone} onChange={e => onChange({ phone: e.target.value })}
                                placeholder="09xx xxx xxx" className={input(errors.phone)} />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <ShippingAddressForm isAuthenticated={isAuthenticated} value={value} errors={errors}
                    onChange={onChange} onShippingFee={onShippingFee}
                    ghnDistrictId={ghnDistrictId} ghnWardCode={ghnWardCode} onGhnChange={onGhnChange} />
            )}

            <button type="button" onClick={() => validate() && onNext()}
                className="mt-6 w-full py-3.5 bg-[var(--accent-primary,#dc2626)] hover:brightness-95 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
                Tiếp tục — chọn khuyến mãi <ArrowRight className="w-5 h-5" />
            </button>
        </motion.div>
    );
}

export default ShippingStep;
