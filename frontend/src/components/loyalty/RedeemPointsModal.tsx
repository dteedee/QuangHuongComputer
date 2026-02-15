import { useState } from 'react';
import { salesApi } from '../../api/sales';
import { Coins, X, Gift } from 'lucide-react';
import toast from 'react-hot-toast';

interface RedeemPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePoints: number;
  onSuccess?: (pointsRedeemed: number, redemptionValue: number) => void;
}

const REDEEM_PRESETS = [100, 500, 1000, 2000, 5000];

export function RedeemPointsModal({ isOpen, onClose, availablePoints, onSuccess }: RedeemPointsModalProps) {
  const [points, setPoints] = useState(100);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const redemptionValue = points * 100; // 1 point = 100 VND
  const isValid = points > 0 && points <= availablePoints;

  const handleRedeem = async () => {
    if (!isValid) return;

    try {
      setLoading(true);
      const result = await salesApi.loyalty.redeemPoints(points);
      toast.success(`Đổi ${result.pointsRedeemed} điểm thành công! Nhận ${result.redemptionValue.toLocaleString()}đ giảm giá`);
      onSuccess?.(result.pointsRedeemed, result.redemptionValue);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể đổi điểm';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Đổi điểm thưởng</h2>
                <p className="text-sm opacity-90">1 điểm = 100đ giảm giá</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Available Points */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
            <span className="text-gray-600">Điểm khả dụng:</span>
            <span className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Coins className="text-yellow-500" />
              {availablePoints.toLocaleString()}
            </span>
          </div>

          {/* Preset Amounts */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn số điểm muốn đổi:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {REDEEM_PRESETS.filter(p => p <= availablePoints).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setPoints(preset)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    points === preset
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}k` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hoặc nhập số điểm:
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={availablePoints}
                value={points}
                onChange={(e) => setPoints(Math.min(availablePoints, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                onClick={() => setPoints(availablePoints)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* Redemption Preview */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="text-green-700">Giá trị quy đổi:</span>
              <span className="text-2xl font-bold text-green-600">
                {redemptionValue.toLocaleString()}đ
              </span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Sẽ được trừ vào đơn hàng tiếp theo của bạn
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleRedeem}
              disabled={!isValid || loading}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Xác nhận đổi điểm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RedeemPointsModal;
