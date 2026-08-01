import type { ReturnPolicy, ReturnType } from '../../../api/sales';
import { ReturnTypeSelector } from '../../../components/return/return-type-selector';

interface StepPickTypeProps {
    policy: ReturnPolicy | null;
    daysSinceDelivered: number | null;
    type: ReturnType | null;
    setType: (t: ReturnType) => void;
    options: { value: ReturnType; disabled?: boolean; disabledReason?: string }[];
}

export const StepPickType = ({ policy, daysSinceDelivered, type, setType, options }: StepPickTypeProps) => (
    <div>
        <h2 className="text-base font-bold text-gray-900 mb-2">Loại yêu cầu</h2>
        {policy && daysSinceDelivered != null && (
            <p className="text-xs text-gray-500 mb-4">
                Đã nhận hàng {daysSinceDelivered} ngày · Hoàn: {policy.daysForReturn}d · Đổi: {policy.daysForExchange}d · Đổi 1-1 lỗi: {policy.daysForDefectReplace}d
            </p>
        )}
        <ReturnTypeSelector value={type} onChange={setType} options={options} />
    </div>
);

export default StepPickType;
