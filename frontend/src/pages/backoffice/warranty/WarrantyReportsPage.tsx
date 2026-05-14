import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, Clock, TrendingUp, DollarSign, Download, AlertTriangle } from 'lucide-react';
import { warrantyReportsApi } from '../../../api/warranty-reports';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';

const TREND_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
};

export function WarrantyReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['warranty-summary', dateRange],
    queryFn: () => warrantyReportsApi.getSummary(dateRange.startDate, dateRange.endDate),
    staleTime: 60000,
  });

  const { data: byBrand, isLoading: loadingBrand } = useQuery({
    queryKey: ['warranty-by-brand', dateRange],
    queryFn: () => warrantyReportsApi.getByBrand(dateRange.startDate, dateRange.endDate),
    staleTime: 60000,
  });

  const { data: costs, isLoading: loadingCosts } = useQuery({
    queryKey: ['warranty-costs', dateRange],
    queryFn: () => warrantyReportsApi.getCosts(dateRange.startDate, dateRange.endDate),
    staleTime: 60000,
  });

  const { data: trending } = useQuery({
    queryKey: ['warranty-trending'],
    queryFn: () => warrantyReportsApi.getTrending(10, 30),
    staleTime: 60000,
  });

  const isLoading = loadingSummary || loadingBrand || loadingCosts;

  const handleExport = () => {
    try {
      const rows = [
        ['Sản phẩm', 'Tổng yêu cầu', 'Đã giải quyết', 'TB ngày xử lý'],
        ...(byBrand ?? []).map(b => [
          b.productName, b.totalClaims, b.resolvedClaims, b.avgResolutionDays,
        ]),
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `warranty-report-${dateRange.startDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Xuất báo cáo thành công');
    } catch {
      toast.error('Có lỗi khi xuất báo cáo');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo Cáo Bảo Hành</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan khiếu nại và chi phí bảo hành</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Tổng Khiếu Nại',
                value: summary?.totalClaims ?? 0,
                icon: Shield,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                format: 'number',
              },
              {
                label: 'Tỷ Lệ Giải Quyết',
                value: summary?.resolutionRate ?? 0,
                icon: TrendingUp,
                color: 'text-green-600',
                bg: 'bg-green-50',
                format: 'percent',
              },
              {
                label: 'TB Ngày Xử Lý',
                value: summary?.avgResolutionDays ?? 0,
                icon: Clock,
                color: 'text-yellow-600',
                bg: 'bg-yellow-50',
                format: 'days',
              },
              {
                label: 'Tổng Chi Phí Ước Tính',
                value: costs?.totalWarrantyCost ?? 0,
                icon: DollarSign,
                color: 'text-red-600',
                bg: 'bg-red-50',
                format: 'currency',
              },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">{kpi.label}</span>
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {kpi.format === 'currency'
                    ? formatCurrency(kpi.value)
                    : kpi.format === 'percent'
                    ? `${kpi.value}%`
                    : kpi.format === 'days'
                    ? `${kpi.value} ngày`
                    : kpi.value.toLocaleString()}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Claims by Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <h2 className="text-base font-semibold text-gray-800 mb-4">Khiếu Nại Theo Sản Phẩm</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 pr-3">Sản phẩm</th>
                      <th className="pb-2 pr-3 text-right">Tổng</th>
                      <th className="pb-2 pr-3 text-right">Giải quyết</th>
                      <th className="pb-2 text-right">TB ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(byBrand ?? []).slice(0, 10).map(row => (
                      <tr key={row.productName} className="hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800 truncate max-w-[140px]">
                          {row.productName}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-700">{row.totalClaims}</td>
                        <td className="py-2 pr-3 text-right text-green-600">{row.resolvedClaims}</td>
                        <td className="py-2 text-right text-gray-500">{row.avgResolutionDays}d</td>
                      </tr>
                    ))}
                    {(byBrand ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Monthly Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <h2 className="text-base font-semibold text-gray-800 mb-4">Xu Hướng Hàng Tháng</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(summary?.monthlyTrend ?? []).map(row => {
                  const maxVal = Math.max(...(summary?.monthlyTrend ?? []).map(r => r.filed), 1);
                  return (
                    <div key={row.month} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-gray-500 shrink-0">{row.month}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 bg-blue-400 rounded-full"
                            style={{ width: `${(row.filed / maxVal) * 100}%` }}
                          />
                          <span className="text-gray-600 text-xs">{row.filed} nộp</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 bg-green-400 rounded-full"
                            style={{ width: `${(row.resolved / maxVal) * 100}%` }}
                          />
                          <span className="text-gray-600 text-xs">{row.resolved} giải quyết</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(summary?.monthlyTrend ?? []).length === 0 && (
                  <p className="text-center text-gray-400 py-8">Không có dữ liệu</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Trending Issues */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <h2 className="text-base font-semibold text-gray-800">Sản Phẩm Có Nhiều Khiếu Nại (30 ngày)</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {(trending ?? []).map(item => (
                <div
                  key={item.serialPrefix}
                  className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
                >
                  <span className="font-mono text-sm font-medium text-gray-700">{item.serialPrefix}…</span>
                  <span className="text-sm text-gray-500">{item.claimCount} lần</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TREND_COLORS[item.trend]}`}>
                    {item.trend}
                  </span>
                </div>
              ))}
              {(trending ?? []).length === 0 && (
                <p className="text-gray-400 text-sm">Không có dữ liệu trong 30 ngày qua</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
