import { useState, useEffect } from 'react';
import { calculateShippingFee } from '../api/sales';
import { Truck } from 'lucide-react';

interface ShippingFeeCalculatorProps {
  districtId: number;
  wardCode: string;
  weight?: number;
  onFeeCalculated?: (fee: number) => void;
}

export default function ShippingFeeCalculator({
  districtId,
  wardCode,
  weight = 500,
  onFeeCalculated,
}: ShippingFeeCalculatorProps) {
  const [fee, setFee] = useState<number | null>(null);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!districtId || !wardCode) return;
    setLoading(true);
    setError(false);
    calculateShippingFee(districtId, wardCode, weight)
      .then((result) => {
        setFee(result.fee);
        setDeliveryTime(result.expectedDeliveryDays);
        onFeeCalculated?.(result.fee);
      })
      .catch(() => {
        setFee(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [districtId, wardCode, weight]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        Đang tính phí vận chuyển...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
        Không thể tính phí vận chuyển. Vui lòng liên hệ cửa hàng.
      </div>
    );
  }

  if (fee === null) return null;

  return (
    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <Truck className="w-4 h-4 text-blue-500" />
          Phí vận chuyển (GHN):
        </span>
        <span className="font-bold text-blue-600">
          {fee === 0 ? 'Miễn phí' : `${fee.toLocaleString('vi-VN')}đ`}
        </span>
      </div>
      {deliveryTime && (
        <div className="text-xs text-gray-500 mt-1 pl-6">
          Dự kiến giao: {deliveryTime}
        </div>
      )}
    </div>
  );
}
