import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { repairServiceTypesApi, type PublicRepairServiceType } from '../../api/repair/service-types';
import { queryKeys } from '../../lib/query-keys';
import { Money } from '../../components/ui';

interface Props {
    value: string | null;
    onChange: (service: PublicRepairServiceType) => void;
}

const minutes = (m: number) => (m >= 60 ? `~${Math.round((m / 60) * 10) / 10} giờ` : `~${m} phút`);

/**
 * Dịch vụ khách chọn khi đặt lịch — lấy từ danh mục cửa hàng tự sửa (`/repair/service-types`).
 * Giá gốc chỉ để tham khảo; giá thật là báo giá sau chẩn đoán. Dịch vụ tận nơi mới hỏi địa chỉ.
 */
export const BookingServicePicker: React.FC<Props> = ({ value, onChange }) => {
    const services = useQuery({ queryKey: [...queryKeys.repair.all, 'service-types', 'active'], queryFn: repairServiceTypesApi.listActive });

    return (
        <div className="bg-white p-5 sm:p-6 rounded-lg shadow">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Chọn dịch vụ</h2>
            {services.isPending && <p className="text-sm text-gray-500">Đang tải danh sách dịch vụ…</p>}
            {services.isError && (
                <p className="text-sm text-red-600">
                    Không tải được danh sách dịch vụ.{' '}
                    <button type="button" className="underline" onClick={() => void services.refetch()}>Thử lại</button>
                </p>
            )}
            <div role="radiogroup" aria-label="Dịch vụ sửa chữa" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(services.data ?? []).map((s) => {
                    const active = s.id === value;
                    return (
                        <button key={s.id} type="button" role="radio" aria-checked={active} onClick={() => onChange(s)}
                            className={`p-4 border-2 rounded-lg text-left transition ${active ? 'border-accent bg-red-50' : 'border-gray-300 hover:border-red-300'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-base font-semibold">{s.name}</span>
                                {s.isOnSite && <span className="text-xs font-semibold text-accent">Tận nơi</span>}
                            </div>
                            {s.description && <div className="text-sm text-gray-600 mt-1">{s.description}</div>}
                            <div className="text-sm mt-2 text-gray-700">
                                {s.basePrice > 0 ? <>Giá tham khảo từ <Money value={s.basePrice} /></> : 'Báo giá sau khi kiểm tra'}
                                {s.estimatedMinutes > 0 && <span className="text-gray-500"> · {minutes(s.estimatedMinutes)}</span>}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
