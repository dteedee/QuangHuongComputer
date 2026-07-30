import { useEffect, useState } from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import AddressBookSelector from '../address-book-selector';
import ShippingFeeCalculator from '../shipping-fee-calculator';
import type { ShippingFormState } from './checkout-types';

interface ProvinceApi {
    name: string; code: number;
    districts: { name: string; code: number; wards: { name: string; code: number }[] }[];
}

interface ShippingAddressFormProps {
    isAuthenticated: boolean;
    value: ShippingFormState;
    errors: Partial<Record<keyof ShippingFormState, string>>;
    onChange: (patch: Partial<ShippingFormState>) => void;
    onShippingFee: (fee: number) => void;
    ghnDistrictId: number;
    ghnWardCode: string;
    onGhnChange: (districtId: number, wardCode: string) => void;
}

const input = (err?: string) =>
    `w-full px-4 py-3 border ${err ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[var(--accent-primary,#dc2626)] outline-none text-gray-900 font-medium transition-all`;
const label = 'block text-sm font-semibold text-gray-600 mb-1';

/**
 * Form địa chỉ giao hàng — chỉ dùng khi deliveryMethod = "delivery".
 * Tách khỏi ShippingStep để giữ file cha < 200 dòng.
 */
export function ShippingAddressForm({
    isAuthenticated, value, errors, onChange, onShippingFee,
    ghnDistrictId, ghnWardCode, onGhnChange,
}: ShippingAddressFormProps) {
    const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
    const [districts, setDistricts] = useState<ProvinceApi['districts']>([]);
    const [wards, setWards] = useState<{ name: string; code: number }[]>([]);

    useEffect(() => {
        fetch('https://provinces.open-api.vn/api/?depth=3')
            .then(r => r.json())
            .then((data: ProvinceApi[]) => setProvinces(data))
            .catch(() => setProvinces([]));
    }, []);

    useEffect(() => {
        if (!value.province || provinces.length === 0) return;
        const p = provinces.find(x => x.name === value.province);
        setDistricts(p?.districts ?? []);
        if (value.district) {
            const d = p?.districts.find(x => x.name === value.district);
            setWards(d?.wards ?? []);
        }
    }, [value.province, value.district, provinces]);

    const handleProvince = (name: string) => {
        onChange({ province: name, district: '', ward: '' });
        const p = provinces.find(x => x.name === name);
        setDistricts(p?.districts ?? []); setWards([]);
        onGhnChange(0, '');
    };
    const handleDistrict = (name: string) => {
        onChange({ district: name, ward: '' });
        const d = districts.find(x => x.name === name);
        setWards(d?.wards ?? []);
        onGhnChange(d?.code ? Number(d.code) : 0, '');
    };
    const handleWard = (name: string) => {
        onChange({ ward: name });
        const w = wards.find(x => x.name === name);
        onGhnChange(ghnDistrictId, w?.code ? String(w.code) : '');
    };

    return (
        <div className="space-y-5">
            {isAuthenticated && (
                <AddressBookSelector
                    onSelect={a => onChange({
                        fullName: a.fullName ?? value.fullName,
                        phone: a.phone ?? value.phone,
                        address: a.streetAddress ?? value.address,
                        ward: a.ward ?? value.ward,
                        district: a.district ?? value.district,
                        province: a.province ?? value.province,
                        addressId: a.id,
                    })}
                />
            )}
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
                <div className="col-span-2">
                    <label className={label}>Email *</label>
                    <input type="email" value={value.email} onChange={e => onChange({ email: e.target.value })}
                        placeholder="email@example.com" className={input(errors.email)} />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
            </div>
            <div className="border-t border-gray-100 pt-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className={label}>Tỉnh/TP *</label>
                        <SearchableSelect value={value.province} onChange={handleProvince}
                            options={provinces.map(p => ({ value: p.name, label: p.name }))}
                            placeholder="Chọn tỉnh" error={!!errors.province} searchPlaceholder="Tìm tỉnh..." />
                    </div>
                    <div>
                        <label className={label}>Quận/Huyện *</label>
                        <SearchableSelect value={value.district} onChange={handleDistrict} disabled={!value.province}
                            options={districts.map(d => ({ value: d.name, label: d.name }))}
                            placeholder="Chọn quận" error={!!errors.district} searchPlaceholder="Tìm quận..." />
                    </div>
                    <div>
                        <label className={label}>Phường/Xã *</label>
                        <SearchableSelect value={value.ward} onChange={handleWard} disabled={!value.district}
                            options={wards.map(w => ({ value: w.name, label: w.name }))}
                            placeholder="Chọn phường" error={!!errors.ward} searchPlaceholder="Tìm phường..." />
                    </div>
                </div>
                <div>
                    <label className={label}>Địa chỉ chi tiết *</label>
                    <textarea value={value.address} onChange={e => onChange({ address: e.target.value })} rows={2}
                        placeholder="Số nhà, tên đường..."
                        className={`w-full px-4 py-3 border ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[var(--accent-primary,#dc2626)] outline-none resize-none text-gray-900 font-medium`} />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
                {ghnDistrictId > 0 && ghnWardCode && (
                    <ShippingFeeCalculator districtId={ghnDistrictId} wardCode={ghnWardCode} onFeeCalculated={onShippingFee} />
                )}
            </div>
            {!isAuthenticated && (
                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                    <input type="checkbox" checked={value.createAccount}
                        onChange={e => onChange({ createAccount: e.target.checked })}
                        className="mt-1 accent-[var(--accent-primary,#dc2626)]" />
                    <span className="text-sm text-gray-700">
                        Tạo tài khoản sau khi đặt hàng để theo dõi đơn dễ hơn
                        (link đặt mật khẩu sẽ gửi qua email).
                    </span>
                </label>
            )}
        </div>
    );
}

export default ShippingAddressForm;
