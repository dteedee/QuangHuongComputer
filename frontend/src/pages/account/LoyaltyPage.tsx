import { useState, useEffect } from 'react';
import { LoyaltyCard, LoyaltyHistory, RedeemPointsModal } from '../../components/loyalty';
import { salesApi } from '../../api/sales';
import type { LoyaltyAccount } from '../../api/sales';
import { ArrowLeft, Coins, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const tierLevels = [
  { name: 'Bronze',   color: 'text-amber-700',  range: '0 - 4,999 điểm' },
  { name: 'Silver',   color: 'text-gray-500',   range: '5,000 - 19,999 điểm' },
  { name: 'Gold',     color: 'text-yellow-600', range: '20,000 - 49,999 điểm' },
  { name: 'Platinum', color: 'text-blue-400',   range: '50,000 - 99,999 điểm' },
  { name: 'Diamond',  color: 'text-purple-500', range: '100,000+ điểm' },
];

const earnSteps = [
  'Mua sắm để tích điểm: 10.000đ = 1 điểm',
  'Hạng càng cao, hệ số điểm càng lớn (lên đến 2x)',
  'Đổi điểm: 1 điểm = 100đ giảm giá',
  'Điểm thưởng thêm vào sinh nhật, sự kiện đặc biệt',
];

export function LoyaltyPage() {
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(false);
      const data = await salesApi.loyalty.getAccount();
      setAccount(data);
    } catch {
      // Account might not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemSuccess = () => {
    loadAccount();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-accent transition-colors mb-4 text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          Quay lại tài khoản
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-yellow-50 rounded-xl text-yellow-500">
            <Coins size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Điểm thưởng của tôi</h1>
            <p className="text-gray-500 text-sm">Tích điểm khi mua sắm, đổi điểm lấy ưu đãi</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Loyalty Card */}
          <div className="lg:col-span-2">
            <LoyaltyCard onRedeemClick={() => setShowRedeemModal(true)} />
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <Info size={16} className="text-blue-500" />
              Cách tích điểm
            </h3>
            <ul className="space-y-3">
              {earnSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="w-5 h-5 bg-red-50 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            {/* Tier Levels */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Các hạng thành viên</h4>
              <div className="space-y-2 text-sm">
                {tierLevels.map((tier) => (
                  <div key={tier.name} className="flex justify-between items-center">
                    <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
                    <span className="text-gray-500 text-xs">{tier.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-5">
          <LoyaltyHistory />
        </div>

        {/* Redeem Modal */}
        {account && (
          <RedeemPointsModal
            isOpen={showRedeemModal}
            onClose={() => setShowRedeemModal(false)}
            availablePoints={account.availablePoints}
            onSuccess={handleRedeemSuccess}
          />
        )}
      </div>
    </div>
  );
}

export default LoyaltyPage;
