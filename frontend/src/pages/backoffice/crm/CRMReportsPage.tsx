import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Mail, Download, Target } from 'lucide-react';
import { crmReportsApi } from '../../../api/crm-reports';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  Sent: 'bg-green-100 text-green-700',
  Sending: 'bg-blue-100 text-blue-700',
  Scheduled: 'bg-yellow-100 text-yellow-700',
  Draft: 'bg-gray-100 text-gray-600',
  Paused: 'bg-orange-100 text-orange-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export function CRMReportsPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['crm-overview'],
    queryFn: () => crmReportsApi.getOverview(),
    staleTime: 60000,
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['crm-campaign-performance'],
    queryFn: () => crmReportsApi.getCampaignPerformance(),
    staleTime: 60000,
  });

  const { data: segments, isLoading: loadingSegments } = useQuery({
    queryKey: ['crm-customer-segments'],
    queryFn: () => crmReportsApi.getCustomerSegments(),
    staleTime: 60000,
  });

  const { data: funnel } = useQuery({
    queryKey: ['crm-lead-funnel'],
    queryFn: () => crmReportsApi.getLeadFunnel(),
    staleTime: 60000,
  });

  const isLoading = loadingOverview || loadingCampaigns || loadingSegments;

  const handleExport = () => {
    try {
      const rows = [
        ['Nguồn', 'Số lượng'],
        ...(overview?.leadsBySource ?? []).map(s => [s.source, s.count]),
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-2xl font-bold text-slate-900">Báo Cáo CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Leads, chiến dịch email và phân khúc khách hàng</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
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
                label: 'Tổng Leads',
                value: overview?.totalLeads ?? 0,
                sub: `+${overview?.newLeadsThisMonth ?? 0} tháng này`,
                icon: Users,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                format: 'number',
              },
              {
                label: 'Tỷ Lệ Chuyển Đổi',
                value: overview?.conversionRate ?? 0,
                sub: `${overview?.convertedLeads ?? 0} chuyển đổi`,
                icon: TrendingUp,
                color: 'text-green-600',
                bg: 'bg-green-50',
                format: 'percent',
              },
              {
                label: 'Giá Trị Pipeline',
                value: overview?.pipelineValue ?? 0,
                sub: 'Đang hoạt động',
                icon: DollarSign,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                format: 'currency',
              },
              {
                label: 'TB Giá Trị Deal',
                value: overview?.avgDealSize ?? 0,
                sub: 'Mỗi deal',
                icon: Target,
                color: 'text-yellow-600',
                bg: 'bg-yellow-50',
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
                    : kpi.value.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leads by Source */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <h2 className="text-base font-semibold text-gray-800 mb-4">Leads Theo Nguồn</h2>
              <div className="space-y-3">
                {(overview?.leadsBySource ?? []).map(item => {
                  const total = overview?.totalLeads ?? 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={item.source} className="flex items-center gap-3">
                      <span className="w-28 text-sm text-gray-600 shrink-0">{item.source}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Lead Funnel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <h2 className="text-base font-semibold text-gray-800 mb-4">Pipeline Funnel</h2>
              <div className="space-y-2">
                {(funnel ?? []).map(stage => (
                  <div key={stage.id} className="flex items-center gap-3 text-sm">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="w-28 text-gray-600 shrink-0 truncate">{stage.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(stage.winProbability, 100)}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                    <span className="text-gray-700 font-medium w-8 text-right">{stage.leadCount}</span>
                    <span className="text-gray-400 w-20 text-right text-xs">
                      {formatCurrency(stage.totalValue)}
                    </span>
                  </div>
                ))}
                {(funnel ?? []).length === 0 && (
                  <p className="text-center text-gray-400 py-6">Không có dữ liệu pipeline</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Campaign Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-blue-500" />
              <h2 className="text-base font-semibold text-gray-800">Hiệu Suất Chiến Dịch Email</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 pr-4">Tên chiến dịch</th>
                    <th className="pb-2 pr-4 text-right">Đã gửi</th>
                    <th className="pb-2 pr-4 text-right">Mở</th>
                    <th className="pb-2 pr-4 text-right">Click</th>
                    <th className="pb-2 pr-4 text-right">Bounce</th>
                    <th className="pb-2 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(campaigns ?? []).slice(0, 10).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-800 max-w-[200px] truncate">
                        {c.name}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-700">
                        {c.sentCount.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right text-blue-600">{c.openRate}%</td>
                      <td className="py-2 pr-4 text-right text-green-600">{c.clickRate}%</td>
                      <td className="py-2 pr-4 text-right text-red-500">{c.bounceRate}%</td>
                      <td className="py-2 text-right">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(campaigns ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Chưa có chiến dịch nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Customer Segments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <h2 className="text-base font-semibold text-gray-800 mb-4">Phân Khúc Khách Hàng</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(segments ?? []).map(seg => (
                <div
                  key={seg.id}
                  className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-sm font-semibold text-gray-800 truncate">{seg.name}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {seg.customerCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    TB: {formatCurrency(seg.avgLifetimeValue)}
                  </div>
                </div>
              ))}
              {(segments ?? []).length === 0 && (
                <p className="col-span-4 text-center text-gray-400 py-8">
                  Chưa có phân khúc nào
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
