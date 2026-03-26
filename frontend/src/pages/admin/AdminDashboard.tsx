import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Download,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Wrench,
  Wallet,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { reportsApi, type SalesSummary, type BusinessOverview, type TopProduct, type InventoryValue, type TechPerformance } from '../../api/reports';
import toast from 'react-hot-toast';

// ========================================
// Helpers
// ========================================
const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const formatCompact = (val: number) => {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} tr`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return val.toLocaleString('vi-VN');
};

const MONTH_NAMES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#3b82f6',
  Shipped: '#8b5cf6',
  Delivered: '#10b981',
  Completed: '#10b981',
  Cancelled: '#ef4444',
};
const STATUS_VN: Record<string, string> = {
  Pending: 'Chờ xử lý',
  Confirmed: 'Đã xác nhận',
  Shipped: 'Đang giao',
  Delivered: 'Đã giao',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4', '#ec4899'];

// ========================================
// Custom Recharts Tooltip
// ========================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 text-xs font-black">
      <p className="text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color || '#fff' }}>
          {entry.name}: {typeof entry.value === 'number' ? formatPrice(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

// ========================================
// Component
// ========================================
export default function AdminDashboard() {
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryValue | null>(null);
  const [techData, setTechData] = useState<TechPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, salesRes, productsRes, inventoryRes, techRes] = await Promise.allSettled([
        reportsApi.getBusinessOverview(),
        reportsApi.getSalesSummary(),
        reportsApi.getTopProducts(5),
        reportsApi.getInventoryValue(),
        reportsApi.getTechPerformance(),
      ]);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (salesRes.status === 'fulfilled') setSalesSummary(salesRes.value);
      if (productsRes.status === 'fulfilled') setTopProducts(productsRes.value);
      if (inventoryRes.status === 'fulfilled') setInventoryData(inventoryRes.value);
      if (techRes.status === 'fulfilled') setTechData(techRes.value);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Không thể tải dữ liệu bảng điều khiển');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await reportsApi.exportSalesExcel();
      toast.success('Đã xuất báo cáo Excel thành công!');
    } catch {
      toast.error('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  // Chart data transforms
  const monthlyChartData = salesSummary?.monthlyData?.map((d) => ({
    name: MONTH_NAMES[d.month - 1],
    'Doanh thu': d.revenue,
    'Đơn hàng': d.orderCount,
  })) || [];

  const statusChartData = salesSummary?.statusDistribution?.map((d) => ({
    name: STATUS_VN[d.status] || d.status,
    value: d.count,
    fill: STATUS_COLORS[d.status] || '#94a3b8',
  })) || [];

  return (
    <div className="space-y-12 pb-24 animate-fade-in admin-area">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-gray-950 tracking-tighter uppercase italic leading-none mb-3">
            Trung tâm <span className="text-[#D70018]">Quản trị</span>
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
              Báo cáo hiệu suất kinh doanh Quang Hưởng Computer
            </p>
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest italic shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
            Xuất Excel
          </button>
          <button
            onClick={loadDashboardData}
            className="p-4 bg-gray-950 text-white rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-900/40 active:scale-95 group"
            disabled={loading}
          >
            <RefreshCw size={24} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      {/* ========== KPI Cards ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            label: 'Doanh thu tháng',
            value: overview?.sales.thisMonthRevenue || 0,
            change: overview?.sales.growthPercent || 0,
            icon: <DollarSign size={28} />,
            color: 'bg-rose-600',
            isPrice: true,
          },
          {
            label: 'Đơn hàng chờ',
            value: overview?.sales.pendingOrders || 0,
            change: 0,
            icon: <ShoppingCart size={28} />,
            color: 'bg-blue-600',
          },
          {
            label: 'Giá trị kho',
            value: overview?.inventory.totalValue || 0,
            change: 0,
            icon: <Package size={28} />,
            color: 'bg-emerald-600',
            isPrice: true,
          },
          {
            label: 'Sửa chữa đang chờ',
            value: overview?.repairs.pendingCount || 0,
            change: 0,
            icon: <Wrench size={28} />,
            color: 'bg-amber-500',
          },
        ].map((item, i) => (
          <div key={i} className="premium-card p-10 border-2 transition-all hover:border-gray-950/10 group active:scale-95">
            <div className="flex justify-between items-start mb-8">
              <div className={`p-5 ${item.color} text-white rounded-3xl shadow-2xl shadow-gray-200 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                {item.icon}
              </div>
              {item.change !== 0 && (
                <div className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic shadow-sm border ${item.change >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                  {item.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(item.change)}%
                </div>
              )}
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 italic">{item.label}</p>
            <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic leading-none">
              {loading ? '—' : item.isPrice ? formatCompact(item.value) : item.value.toLocaleString()}
            </h3>
          </div>
        ))}
      </div>

      {/* ========== Second Row KPIs ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="premium-card p-8 border-2 flex items-center gap-6 group hover:border-amber-200 transition-all">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sản phẩm sắp hết hàng</p>
            <p className="text-3xl font-black text-gray-950 tracking-tighter italic">
              {loading ? '—' : overview?.inventory.lowStockCount || 0}
            </p>
          </div>
        </div>
        <div className="premium-card p-8 border-2 flex items-center gap-6 group hover:border-blue-200 transition-all">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <Wrench size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Doanh thu sửa chữa tháng</p>
            <p className="text-3xl font-black text-gray-950 tracking-tighter italic">
              {loading ? '—' : formatCompact(overview?.repairs.thisMonthRevenue || 0)}
            </p>
          </div>
        </div>
        <div className="premium-card p-8 border-2 flex items-center gap-6 group hover:border-purple-200 transition-all">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Công nợ phải thu</p>
            <p className="text-3xl font-black text-gray-950 tracking-tighter italic">
              {loading ? '—' : formatCompact(overview?.accounting.totalReceivables || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* ========== Charts Row ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 premium-card p-12 border-2 bg-white flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-950 tracking-tighter uppercase italic leading-none">
                Xu hướng <span className="text-[#D70018]">Tăng trưởng</span>
              </h2>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">
                Doanh thu 12 tháng gần nhất
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-950 hover:border-gray-900 transition-all shadow-sm"
            >
              <Download size={16} /> Xuất Excel
            </button>
          </div>
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-gray-300" />
              </div>
            ) : monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D70018" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D70018" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Doanh thu"
                    stroke="#D70018"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300">
                <BarChart3 size={48} />
                <p className="ml-4 font-black uppercase text-sm">Chưa có dữ liệu</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Pie */}
        <div className="premium-card p-10 border-2 bg-white flex flex-col">
          <h2 className="text-2xl font-black text-gray-950 tracking-tighter uppercase italic leading-none mb-6">
            Phân bổ <span className="text-[#D70018]">Đơn hàng</span>
          </h2>
          <div className="flex-1 min-h-[250px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-300" />
              </div>
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <ShoppingCart size={40} />
                <p className="mt-2 font-black uppercase text-xs">Chưa có đơn hàng</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t-2 border-gray-50">
            <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Tổng: {salesSummary?.totalOrders?.toLocaleString() || 0} đơn hàng
            </p>
          </div>
        </div>
      </div>

      {/* ========== Products & Inventory Row ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Top Products Bar Chart */}
        <div className="premium-card p-10 border-2 bg-white flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gray-50">
            <h2 className="text-2xl font-black text-gray-950 tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <Sparkles size={24} className="text-amber-500" /> TOP <span className="text-[#D70018]">Sản phẩm</span>
            </h2>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[250px]">
              <Loader2 size={32} className="animate-spin text-gray-300" />
            </div>
          ) : topProducts.length > 0 ? (
            <div className="min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts.map((p) => ({
                  name: p.productName.length > 20 ? p.productName.substring(0, 20) + '…' : p.productName,
                  'Doanh thu': p.totalRevenue,
                  'Số lượng': p.totalQuantity,
                }))} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10, fontWeight: 900, fill: '#1f2937' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Doanh thu" fill="#D70018" radius={[0, 8, 8, 0]} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Package className="w-20 h-20 text-gray-100 mb-6" />
              <p className="text-sm font-black text-gray-300 uppercase italic tracking-widest">Chưa có dữ liệu sản phẩm</p>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="premium-card p-10 border-2 bg-white flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gray-50">
            <h2 className="text-2xl font-black text-gray-950 tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <AlertTriangle size={24} className="text-amber-500" /> Cảnh báo <span className="text-[#D70018]">Tồn kho</span>
            </h2>
            <Link
              to="/backoffice/inventory"
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] transition-colors flex items-center gap-1"
            >
              Xem tất cả <ChevronRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[250px]">
              <Loader2 size={32} className="animate-spin text-gray-300" />
            </div>
          ) : inventoryData?.lowStockItems && inventoryData.lowStockItems.length > 0 ? (
            <div className="space-y-5 flex-1 overflow-y-auto max-h-[320px]">
              {inventoryData.lowStockItems.map((item, index) => (
                <div key={item.productId} className="flex items-center gap-5 group cursor-pointer transition-all hover:translate-x-2 p-3 rounded-xl hover:bg-red-50/50">
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm italic ${item.quantityOnHand === 0
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-amber-100 text-amber-700'
                    }`}>
                    {item.quantityOnHand}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-950 text-sm italic uppercase tracking-tight truncate leading-none group-hover:text-[#D70018] transition-colors">
                      {item.productName}
                    </h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                      Ngưỡng: {item.lowStockThreshold} • Giá vốn: {formatPrice(item.averageCost)}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${item.quantityOnHand === 0
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                    {item.quantityOnHand === 0 ? 'Hết hàng' : 'Sắp hết'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-emerald-200 mb-4" />
              <p className="text-sm font-black text-emerald-400 uppercase italic tracking-widest">Tồn kho ổn định 👍</p>
            </div>
          )}
          <div className="mt-6 pt-4 border-t-2 border-gray-50 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng SKU</p>
              <p className="text-xl font-black text-gray-950 tracking-tighter italic">{inventoryData?.itemCount?.toLocaleString() || '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng tồn</p>
              <p className="text-xl font-black text-gray-950 tracking-tighter italic">{inventoryData?.totalQuantity?.toLocaleString() || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Tech Performance Row ========== */}
      {techData && (
        <div className="premium-card p-10 border-2 bg-white">
          <h2 className="text-2xl font-black text-gray-950 tracking-tighter uppercase italic leading-none mb-8 flex items-center gap-3">
            <Wrench size={24} className="text-blue-600" /> Hiệu suất <span className="text-[#D70018]">Kỹ thuật</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl bg-gray-50 border-2 border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tổng đơn sửa</p>
              <p className="text-3xl font-black text-gray-950 tracking-tighter italic">{techData.totalJobs}</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Đã hoàn thành</p>
              <p className="text-3xl font-black text-emerald-700 tracking-tighter italic">{techData.completedJobs}</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-blue-50 border-2 border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Tỉ lệ thành công</p>
              <p className="text-3xl font-black text-blue-700 tracking-tighter italic">{techData.successRate.toFixed(1)}%</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-amber-50 border-2 border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Chi phí TB</p>
              <p className="text-3xl font-black text-amber-700 tracking-tighter italic">{formatCompact(techData.averageRepairCost)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========== Quick Actions Portal ========== */}
      <div className="mt-16">
        <h2 className="text-2xl font-black text-gray-950 mb-8 uppercase italic tracking-tighter">
          Cổng tác vụ <span className="text-[#D70018]">Ưu tiên</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { to: '/backoffice/products', icon: <Package size={32} />, title: 'Xuất bản Sản phẩm', desc: 'Thiết lập danh mục mới', color: 'text-blue-600', hover: 'hover:border-blue-200 hover:shadow-blue-500/10' },
            { to: '/backoffice/orders', icon: <ShoppingCart size={32} />, title: 'Kiểm soát Đơn hàng', desc: 'Xử lý luồng vận hành', color: 'text-emerald-600', hover: 'hover:border-emerald-200 hover:shadow-emerald-500/10' },
            { to: '/backoffice/users', icon: <Users size={32} />, title: 'Quản trị Hội viên', desc: 'Phát triển tệp khách hàng', color: 'text-purple-600', hover: 'hover:border-purple-200 hover:shadow-purple-500/10' },
            { to: '/backoffice/reports', icon: <BarChart3 size={32} />, title: 'Trích xuất Dữ liệu', desc: 'Tổng kết doanh thu', color: 'text-[#D70018]', hover: 'hover:border-red-200 hover:shadow-red-500/10' },
          ].map((action, i) => (
            <Link
              key={i}
              to={action.to}
              className={`bg-white p-10 rounded-[2rem] border-2 border-gray-100 transition-all group flex flex-col shadow-sm ${action.hover}`}
            >
              <div className={`${action.color} mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 drop-shadow-sm`}>
                {action.icon}
              </div>
              <h3 className="font-black text-gray-950 uppercase italic tracking-tight text-lg leading-none">{action.title}</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 flex items-center gap-2">
                {action.desc} <ChevronRight size={14} className="text-[#D70018]" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
