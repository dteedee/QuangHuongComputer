import { useState, useEffect } from 'react';
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
  Calendar,
  Download,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  productsChange: number;
}

interface RecentOrder {
  id: string;
  customerName: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const statsResponse = await fetch(`/api/admin/dashboard/stats?range=${timeRange}`);
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data);
      }

      const ordersResponse = await fetch('/api/admin/orders/recent?limit=10');
      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        setRecentOrders(data.orders);
      }

      const productsResponse = await fetch('/api/admin/products/top?limit=5');
      if (productsResponse.ok) {
        const data = await productsResponse.json();
        setTopProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getStatusBadge = (status: RecentOrder['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const statusTranslations: Record<string, string> = {
    pending: 'Đang chờ',
    processing: 'Đang xử lý',
    shipped: 'Đang giao',
    delivered: 'Đã hoàn thành',
    cancelled: 'Đã hủy'
  };

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
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest italic outline-none focus:border-[#D70018] shadow-sm cursor-pointer"
          >
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm nay</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="p-4 bg-gray-950 text-white rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-900/40 active:scale-95 group"
            disabled={loading}
          >
            <RefreshCw size={24} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Doanh thu', value: stats?.totalRevenue || 0, change: stats?.revenueChange || 0, icon: <DollarSign size={28} />, color: 'bg-rose-600', isPrice: true },
          { label: 'Đơn hàng', value: stats?.totalOrders || 0, change: stats?.ordersChange || 0, icon: <ShoppingCart size={28} />, color: 'bg-blue-600' },
          { label: 'Khách hàng', value: stats?.totalCustomers || 0, change: stats?.customersChange || 0, icon: <Users size={28} />, color: 'bg-emerald-600' },
          { label: 'Sản phẩm', value: stats?.totalProducts || 0, change: stats?.productsChange || 0, icon: <Package size={28} />, color: 'bg-amber-500' },
        ].map((item, i) => (
          <div key={i} className="premium-card p-10 border-2 transition-all hover:border-gray-950/10 group active:scale-95">
            <div className="flex justify-between items-start mb-8">
              <div className={`p-5 ${item.color} text-white rounded-3xl shadow-2xl shadow-gray-200 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                {item.icon}
              </div>
              <div className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic shadow-sm border ${item.change >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                {item.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(item.change)}%
              </div>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 italic">{item.label}</p>
            <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic leading-none">
              {item.isPrice ? formatPrice(item.value) : item.value.toLocaleString()}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Revenue Chart Placeholder */}
        <div className="lg:col-span-2 premium-card p-12 border-2 bg-white flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-black text-gray-950 tracking-tighter uppercase italic leading-none">Xu hướng <span className="text-[#D70018]">Tăng trưởng</span></h2>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">Phân tích dòng tiền định kỳ nội bộ</p>
            </div>
            <button className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-950 hover:border-gray-900 transition-all shadow-sm">
              <Download size={16} /> Xuất PDF
            </button>
          </div>
          <div className="flex-1 flex items-end justify-between gap-4 px-4 h-full relative border-b-4 border-gray-50 pb-8 mt-10">
            {[40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 100].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group justify-end h-full">
                <div className="w-full relative">
                  <div
                    style={{ height: `${h}%` }}
                    className={`w-full rounded-t-2xl transition-all duration-700 relative ${i % 2 === 0 ? 'bg-gray-100 group-hover:bg-red-500 shadow-lg' : 'bg-gray-200 group-hover:bg-gray-950 shadow-lg'}`}
                  >
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-[10px] font-black px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-2xl border border-gray-700 z-10 font-mono">
                      {h}%
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase italic tracking-tighter ${i === 11 ? 'text-[#D70018] scale-125 underline decoration-4 underline-offset-4' : 'text-gray-300'}`}>T{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="premium-card p-10 border-2 bg-white flex flex-col">
          <div className="flex items-center justify-between mb-10 pb-8 border-b-2 border-gray-50">
            <h2 className="text-2xl font-black text-gray-950 tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <Sparkles size={24} className="text-amber-500" /> TOP <span className="text-[#D70018]">Sản phẩm</span>
            </h2>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-8 flex-1">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-6 group cursor-pointer transition-all hover:translate-x-2">
                  <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg italic shadow-xl ${index === 0 ? 'bg-amber-400 text-white shadow-amber-500/30' :
                      index === 1 ? 'bg-gray-300 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-50 text-gray-400 border-2 border-gray-100'
                    }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-950 text-sm italic uppercase tracking-tight truncate leading-none group-hover:text-[#D70018] transition-colors">{product.name}</h4>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">{product.sold} đơn vị đã xuất</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-950 text-sm italic tracking-tighter underline decoration-[#D70018] decoration-2 underline-offset-4">{formatPrice(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <Package className="w-20 h-20 text-gray-100 mb-6" />
              <p className="text-sm font-black text-gray-300 uppercase italic tracking-widest">Dữ liệu thị trường chưa đủ...</p>
            </div>
          )}
          <button className="w-full py-5 mt-10 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-[#D70018] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border-2 border-gray-100 flex items-center justify-center gap-3 group">
            Xem báo cáo tồn kho
            <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="premium-card overflow-hidden border-2 bg-white mt-12">
        <div className="p-10 border-b-2 border-gray-50 flex items-center justify-between bg-gray-50/20">
          <h2 className="text-3xl font-black text-gray-950 tracking-tighter uppercase italic leading-none">Giao dịch <span className="text-[#D70018]">Gần đây</span></h2>
          <Link
            to="/backoffice/orders"
            className="flex items-center gap-4 px-8 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-900/40 hover:bg-black transition-all active:scale-95 italic"
          >
            Tất cả đơn hàng
            <ArrowUpRight size={18} className="text-[#D70018]" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-white text-[11px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-10 py-6">Mã giao dịch</th>
                <th className="px-10 py-6">Đối tác khách hàng</th>
                <th className="px-10 py-6">Giá trị ròng</th>
                <th className="px-10 py-6">Trạng thái</th>
                <th className="px-10 py-6">Thời điểm</th>
                <th className="px-10 py-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-all group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full group-hover:animate-pulse" />
                        <span className="font-black text-gray-950 font-mono text-base tracking-tighter uppercase italic italic">#{order.id.substring(0, 10).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="font-black text-gray-950 uppercase italic tracking-tight">{order.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">Hội viên PLATINUM</p>
                    </td>
                    <td className="px-10 py-8">
                      <span className="font-black text-gray-950 text-lg tracking-tighter italic">{formatPrice(order.total)}</span>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic border shadow-sm ${getStatusBadge(order.status)}`}>
                        {statusTranslations[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-black uppercase tracking-tight">
                        <Clock size={16} className="text-gray-300" />
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <Link
                        to={`/backoffice/orders/${order.id}`}
                        className="px-6 py-3 bg-white border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-950 hover:border-[#D70018] hover:text-[#D70018] transition-all shadow-sm active:scale-95"
                      >
                        Hồ sơ chi tiết
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-10 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <ShoppingCart className="w-24 h-24 text-gray-100 mb-6" />
                      <p className="text-sm font-black text-gray-300 uppercase italic tracking-widest">Hệ thống chưa ghi nhận giao dịch nào...</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions Portal */}
      <div className="mt-16">
        <h2 className="text-2xl font-black text-gray-950 mb-8 uppercase italic tracking-tighter">Cổng tác vụ <span className="text-[#D70018]">Ưu tiên</span></h2>
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
