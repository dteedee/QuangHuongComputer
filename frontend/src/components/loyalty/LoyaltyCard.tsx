import { useState, useEffect } from 'react';
import { salesApi } from '../../api/sales';
import type { LoyaltyAccount, LoyaltyTier } from '../../api/sales';
import { Crown, Medal, Gem, Star, Coins } from 'lucide-react';

interface LoyaltyCardProps {
  compact?: boolean;
  onRedeemClick?: () => void;
}

const tierConfig: Record<LoyaltyTier, {
  color: string;
  bgGradient: string;
  icon: React.ReactNode;
  benefits: string[];
}> = {
  Bronze: {
    color: 'text-amber-700',
    bgGradient: 'from-amber-100 to-amber-200',
    icon: <Medal className="w-6 h-6 text-amber-700" />,
    benefits: ['1x points multiplier', 'Birthday bonus'],
  },
  Silver: {
    color: 'text-gray-500',
    bgGradient: 'from-gray-200 to-gray-300',
    icon: <Medal className="w-6 h-6 text-gray-500" />,
    benefits: ['1.25x points multiplier', 'Birthday bonus', 'Early access to sales'],
  },
  Gold: {
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-200 to-yellow-400',
    icon: <Crown className="w-6 h-6 text-yellow-600" />,
    benefits: ['1.5x points multiplier', 'Birthday bonus', 'Free shipping', 'Priority support'],
  },
  Platinum: {
    color: 'text-blue-400',
    bgGradient: 'from-blue-200 to-blue-400',
    icon: <Gem className="w-6 h-6 text-blue-400" />,
    benefits: ['1.75x points multiplier', 'Birthday bonus', 'Free shipping', 'VIP support', 'Exclusive deals'],
  },
  Diamond: {
    color: 'text-purple-500',
    bgGradient: 'from-purple-300 to-pink-400',
    icon: <Gem className="w-6 h-6 text-purple-500" />,
    benefits: ['2x points multiplier', 'Birthday bonus', 'Free express shipping', 'Dedicated support', 'Exclusive events'],
  },
};

export function LoyaltyCard({ compact = false, onRedeemClick }: LoyaltyCardProps) {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      const data = await salesApi.loyalty.getAccount();
      setAccount(data);
    } catch (err) {
      setError('Chưa có tài khoản tích điểm');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 animate-pulse ${compact ? '' : 'p-6'}`}>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className={`bg-white rounded-lg shadow ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center gap-3 text-gray-500">
          <Coins className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="font-medium">Chương trình tích điểm</p>
            <p className="text-sm">Mua sắm để tích điểm và nhận ưu đãi!</p>
          </div>
        </div>
      </div>
    );
  }

  const tier = account.tier as LoyaltyTier;
  const config = tierConfig[tier];
  const progressPercent = account.nextTier
    ? Math.min(100, ((account.lifetimePoints) / (account.lifetimePoints + account.nextTier.pointsNeeded)) * 100)
    : 100;

  if (compact) {
    return (
      <div className={`bg-gradient-to-r ${config.bgGradient} rounded-lg p-4 shadow`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <p className={`font-bold ${config.color}`}>{tier}</p>
              <p className="text-sm text-gray-600">{account.availablePoints.toLocaleString()} điểm</p>
            </div>
          </div>
          {onRedeemClick && account.availablePoints >= 100 && (
            <button
              onClick={onRedeemClick}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
            >
              Đổi điểm
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${config.bgGradient} rounded-xl shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <h3 className={`text-xl font-bold ${config.color}`}>Thành viên {tier}</h3>
              <p className="text-sm text-gray-600">Hệ số điểm: x{account.pointsMultiplier}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-800">{account.availablePoints.toLocaleString()}</p>
            <p className="text-sm text-gray-600">điểm khả dụng</p>
          </div>
        </div>

        {/* Points Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Tổng điểm tích lũy</p>
            <p className="text-lg font-semibold text-gray-800">{account.lifetimePoints.toLocaleString()}</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Giá trị quy đổi</p>
            <p className="text-lg font-semibold text-red-600">
              {(account.availablePoints * 100).toLocaleString()}đ
            </p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {account.nextTier && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Tiến độ lên {account.nextTier.nextTier}</span>
              <span>{account.nextTier.pointsNeeded.toLocaleString()} điểm nữa</span>
            </div>
            <div className="h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Redeem Button */}
        {onRedeemClick && account.availablePoints >= 100 && (
          <button
            onClick={onRedeemClick}
            className="w-full py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" />
            Đổi điểm lấy ưu đãi
          </button>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-white/70 p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Quyền lợi của bạn:</p>
        <ul className="grid grid-cols-2 gap-2">
          {config.benefits.map((benefit, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* Tier Expiry */}
      {account.tierExpiresAt && (
        <div className="px-4 py-2 bg-white/50 text-center text-xs text-gray-500">
          Hạng thành viên có hiệu lực đến: {new Date(account.tierExpiresAt).toLocaleDateString('vi-VN')}
        </div>
      )}
    </div>
  );
}

export default LoyaltyCard;
