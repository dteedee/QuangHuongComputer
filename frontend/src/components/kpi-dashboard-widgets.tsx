import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getDashboardKPIs } from '../api/reporting';

interface KPIData {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthGrowth: number;
  pendingOrders: number;
  lowStockAlerts: number;
}

export default function KpiDashboardWidgets() {
  const { data: kpi, isLoading, isError } = useQuery<KPIData>({
    queryKey: ['dashboard-kpis'],
    queryFn: getDashboardKPIs,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-400 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Đang tải KPI...</span>
      </div>
    );
  }

  if (isError || !kpi) {
    return (
      <div className="flex items-center justify-center gap-2 text-red-500 text-sm py-8">
        <AlertTriangle className="w-4 h-4" />
        <span>Không tải được KPI. Thử tải lại trang.</span>
      </div>
    );
  }

  const cards = [
    {
      label: 'Doanh thu hôm nay',
      value: `${(kpi.todayRevenue / 1_000_000).toFixed(1)}M`,
      color: 'bg-green-50 text-green-700',
      icon: '💰'
    },
    {
      label: 'Đơn hàng hôm nay',
      value: kpi.todayOrders,
      color: 'bg-blue-50 text-blue-700',
      icon: '📦'
    },
    {
      label: 'Doanh thu tháng',
      value: `${(kpi.monthRevenue / 1_000_000).toFixed(1)}M`,
      sub: `${kpi.monthGrowth > 0 ? '+' : ''}${kpi.monthGrowth}%`,
      color: 'bg-purple-50 text-purple-700',
      icon: '📈'
    },
    {
      label: 'Đơn chờ xử lý',
      value: kpi.pendingOrders,
      color: 'bg-orange-50 text-orange-700',
      icon: '⏳'
    },
    {
      label: 'Cảnh báo tồn kho',
      value: kpi.lowStockAlerts,
      color: kpi.lowStockAlerts > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700',
      icon: '⚠️'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`${c.color} rounded-lg p-4`}>
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="text-xs opacity-75">{c.label}</div>
          {'sub' in c && c.sub && <div className="text-sm font-medium mt-1">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
