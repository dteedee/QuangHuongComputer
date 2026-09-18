import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { ComboboxField, TextField } from '../form';
import { salesCartCheckoutApi } from '../../api/sales/cart-checkout';
import type { ShippingSchemaValues } from './checkout-schemas';

interface AddressRegionFieldsProps {
    control: Control<ShippingSchemaValues>;
    setValue: UseFormSetValue<ShippingSchemaValues>;
    provinceCode: string;
    wardCode: string;
}

/**
 * Tỉnh/thành → Phường/xã theo bộ dữ liệu hành chính **2 cấp 2025** do CHÍNH backend của chúng ta
 * phục vụ (`GET /api/sales/shipping/provinces`, hợp đồng W2-11 §2-3). Bản cũ gọi thẳng
 * `provinces.open-api.vn` (bên thứ ba, vẫn theo cấu trúc 3 cấp đã bị bãi bỏ từ 01/07/2025).
 *
 * Khi endpoint hỏng, form KHÔNG chết: hai ô chuyển thành ô nhập tay để khách vẫn đặt được hàng,
 * kèm một dòng giải thích. Không bịa danh sách tỉnh trong mã nguồn FE.
 */
export function AddressRegionFields({ control, setValue, provinceCode, wardCode }: AddressRegionFieldsProps) {
    const provincesQuery = useQuery({
        queryKey: ['shipping', 'provinces'],
        queryFn: () => salesCartCheckoutApi.shipping.provinces(),
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });

    const wardsQuery = useQuery({
        queryKey: ['shipping', 'wards', provinceCode],
        queryFn: () => salesCartCheckoutApi.shipping.wards(provinceCode),
        enabled: Boolean(provinceCode) && !provincesQuery.isError,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });

    const provinces = useMemo(() => provincesQuery.data?.provinces ?? [], [provincesQuery.data]);
    const wards = useMemo(() => wardsQuery.data?.wards ?? [], [wardsQuery.data]);

    // Giữ TÊN đồng bộ với MÃ: đơn hàng lưu địa chỉ dạng chữ, còn phí ship tra theo mã.
    useEffect(() => {
        const found = provinces.find(p => p.code === provinceCode);
        if (found) setValue('province', found.name, { shouldValidate: true });
    }, [provinceCode, provinces, setValue]);

    useEffect(() => {
        const found = wards.find(w => w.code === wardCode);
        if (found) setValue('ward', found.name, { shouldValidate: true });
    }, [wardCode, wards, setValue]);

    const unavailable = provincesQuery.isError;

    if (unavailable) {
        return (
            <div className="space-y-4">
                <p className="rounded-lg bg-warning-subtle px-3 py-2 text-13 text-warning">
                    Danh sách tỉnh/phường tạm thời không tải được. Bạn vui lòng nhập tay, đơn hàng vẫn được ghi nhận bình thường.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField name="province" control={control} label="Tỉnh/Thành phố" required
                        placeholder="VD: Thành phố Hải Phòng" />
                    <TextField name="ward" control={control} label="Phường/Xã" required
                        placeholder="VD: Phường Vĩnh Bảo" />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ComboboxField
                name="provinceCode" control={control} label="Tỉnh/Thành phố" required
                options={provinces.map(p => ({ value: p.code, label: p.name }))}
                placeholder={provincesQuery.isLoading ? 'Đang tải…' : 'Chọn tỉnh/thành phố'}
                searchPlaceholder="Tìm tỉnh/thành phố…"
                disabled={provincesQuery.isLoading}
            />
            <ComboboxField
                name="wardCode" control={control} label="Phường/Xã" required
                options={wards.map(w => ({ value: w.code, label: w.name }))}
                placeholder={!provinceCode ? 'Chọn tỉnh trước' : wardsQuery.isLoading ? 'Đang tải…' : 'Chọn phường/xã'}
                searchPlaceholder="Tìm phường/xã…"
                disabled={!provinceCode || wardsQuery.isLoading}
            />
        </div>
    );
}

export default AddressRegionFields;
