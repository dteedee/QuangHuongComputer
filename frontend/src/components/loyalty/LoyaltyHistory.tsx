import { useState, useEffect } from 'react';
import { salesApi } from '../../api/sales';
import type { LoyaltyTransaction, LoyaltyTransactionType } from '../../api/sales';
import { Plus, Minus, Clock, Gift, Undo2, UserPlus, Wrench } from 'lucide-react';

interface LoyaltyHistoryProps {
  limit?: number;
  showPagination?: boolean;
}

const typeConfig: Record<LoyaltyTransactionType, {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
}> = {
  Earn: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: <Plus className="w-4 h-4" />,
    label: 'Tích điểm',
  },
  Redeem: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <Minus className="w-4 h-4" />,
    label: 'Đổi điểm',
  },
  Expired: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: <Clock className="w-4 h-4" />,
    label: 'Hết hạn',
  },
  Adjustment: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: <Wrench className="w-4 h-4" />,
    label: 'Điều chỉnh',
  },
  Refund: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: <Undo2 className="w-4 h-4" />,
    label: 'Hoàn điểm',
  },
  Bonus: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: <Gift className="w-4 h-4" />,
    label: 'Thưởng',
  },
  Referral: {
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    icon: <UserPlus className="w-4 h-4" />,
    label: 'Giới thiệu',
  },
};

export function LoyaltyHistory({ limit = 10, showPagination = true }: LoyaltyHistoryProps) {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [page, limit]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await salesApi.loyalty.getTransactions(page, limit);
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err) {
      setError('Không thể tải lịch sử giao dịch');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Chưa có giao dịch điểm nào</p>
        <p className="text-sm mt-1">Mua sắm để bắt đầu tích điểm!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-800">Lịch sử điểm thưởng</h3>
      </div>

      <div className="divide-y">
        {transactions.map((tx) => {
          const config = typeConfig[tx.type as LoyaltyTransactionType] || typeConfig.Earn;
          const isPositive = tx.points > 0;

          return (
            <div key={tx.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full ${config.bgColor} ${config.color} flex items-center justify-center`}>
                  {config.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`px-2 py-0.5 rounded text-xs ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                    <span>{new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{tx.points.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Số dư: {tx.balanceAfter.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Trang {page} / {totalPages} ({total} giao dịch)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoyaltyHistory;
