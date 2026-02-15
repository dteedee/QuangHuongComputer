import { useState } from 'react';
import { LoyaltyCard, LoyaltyHistory, RedeemPointsModal } from '../../components/loyalty';
import { salesApi } from '../../api/sales';
import type { LoyaltyAccount } from '../../api/sales';
import { useEffect } from 'react';
import { ArrowLeft, Coins, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    loadAccount(); // Refresh account after redemption
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-red-600 transition mb-4"
          >
            <ArrowLeft />
            Quay lại tài khoản
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Coins className="text-yellow-500" />
            Điểm thưởng của tôi
          </h1>
          <p className="text-gray-600 mt-1">
            Tích điểm khi mua sắm, đổi điểm lấy ưu đãi
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Loyalty Card */}
          <div className="lg:col-span-2">
            <LoyaltyCard onRedeemClick={() => setShowRedeemModal(true)} />
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Info className="text-blue-500" />
              Cách tích điểm
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                <span>Mua sắm để tích điểm: 10.000đ = 1 điểm</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                <span>Hạng càng cao, hệ số điểm càng lớn (lên đến 2x)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                <span>Đổi điểm: 1 điểm = 100đ giảm giá</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                <span>Điểm thưởng thêm vào sinh nhật, sự kiện đặc biệt</span>
              </li>
            </ul>

            {/* Tier Levels */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium text-gray-800 mb-3">Các hạng thành viên</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Bronze</span>
                  <span className="text-gray-500">0 - 4,999 điểm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Silver</span>
                  <span className="text-gray-500">5,000 - 19,999 điểm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Gold</span>
                  <span className="text-gray-500">20,000 - 49,999 điểm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">Platinum</span>
                  <span className="text-gray-500">50,000 - 99,999 điểm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-500">Diamond</span>
                  <span className="text-gray-500">100,000+ điểm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-6">
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
