import type { Control, UseFormSetValue } from 'react-hook-form';
import { TextField } from '../form';
import AddressBookSelector from '../address-book-selector';
import AddressRegionFields from './address-region-fields';
import ShippingFeeCalculator from '../shipping-fee-calculator';
import type { ShippingSchemaValues } from './checkout-schemas';
import type { ShippingQuoteDto } from '../../api/sales/cart-checkout';

interface ShippingAddressFormProps {
    isAuthenticated: boolean;
    control: Control<ShippingSchemaValues>;
    setValue: UseFormSetValue<ShippingSchemaValues>;
    provinceCode: string;
    wardCode: string;
    /** Tạm tính sau giảm giá — server cần đúng con số này để báo phí ship. */
    netSubtotal: number;
    onQuote: (quote: ShippingQuoteDto) => void;
}

/** Form địa chỉ giao hàng — chỉ dùng khi deliveryMethod = "delivery". */
export function ShippingAddressForm({
    isAuthenticated, control, setValue, provinceCode, wardCode, netSubtotal, onQuote,
}: ShippingAddressFormProps) {
    return (
        <div className="space-y-5">
            {isAuthenticated && (
                <AddressBookSelector
                    onSelect={a => {
                        const set = (k: keyof ShippingSchemaValues, v: string) =>
                            setValue(k, v, { shouldValidate: true, shouldDirty: true });
                        if (a.fullName) set('fullName', a.fullName);
                        if (a.phone) set('phone', a.phone);
                        if (a.streetAddress) set('address', a.streetAddress);
                        if (a.ward) set('ward', a.ward);
                        if (a.province) set('province', a.province);
                        if (a.id) setValue('addressId', a.id);
                    }}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField name="fullName" control={control} label="Họ và tên người nhận" required
                    placeholder="Nguyễn Văn A" autoComplete="name" />
                <TextField name="phone" control={control} label="Số điện thoại" required
                    placeholder="0912345678" inputMode="tel" autoComplete="tel" />
                <div className="sm:col-span-2">
                    <TextField name="email" control={control} label="Email" required
                        placeholder="email@example.com" type="email" autoComplete="email"
                        hint="Chúng tôi gửi xác nhận đơn hàng và hóa đơn điện tử tới email này." />
                </div>
            </div>

            <div className="border-t border-line pt-5 space-y-4">
                <AddressRegionFields control={control} setValue={setValue}
                    provinceCode={provinceCode} wardCode={wardCode} />

                <TextField name="address" control={control} label="Địa chỉ chi tiết" required
                    placeholder="Số nhà, tên đường, thôn/xóm…" autoComplete="street-address" />

                {provinceCode && wardCode && (
                    <ShippingFeeCalculator
                        netSubtotal={netSubtotal}
                        provinceCode={provinceCode}
                        wardCode={wardCode}
                        onQuote={onQuote}
                    />
                )}
            </div>

            {/*
              * Đã GỠ hai công tắc "Lưu địa chỉ này vào sổ địa chỉ" và "Tạo tài khoản sau khi đặt
              * hàng": cả hai chỉ ghi vào state rồi bị bỏ đi — không có lời gọi API nào đọc chúng,
              * nên khách bật lên và không có gì xảy ra (lời hứa giả). Bật lại ngay khi backend
              * sẵn sàng, xem `reports/integration-requests-w3.md`:
              *   - `POST /api/sales/addresses` vẫn BẮT BUỘC `District` (dữ liệu 3 cấp đã bãi bỏ
              *     01/07/2025) nên không thể lưu địa chỉ 2 cấp mà không bịa quận/huyện;
              *   - chưa có endpoint tạo tài khoản từ đơn của khách vãng lai.
              */}
        </div>
    );
}

export default ShippingAddressForm;
