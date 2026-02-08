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
  RefreshCw
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
      // Load stats
      const statsResponse = await fetch(`/api/admin/dashboard/stats?range=${timeRange}`);
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data);
      }

      // Load recent orders
      const ordersResponse = await fetch('/api/admin/orders/recent?limit=10');
      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        setRecentOrders(data.orders);
      }

      // Load top products
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

  const getStatusColor = (status: RecentOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: RecentOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'Chờ xử lý';
      case 'processing':
        return 'Đang xử lý';
      case 'shipped':
        return 'Đang giao';
      case 'delivered':
        return 'Đã giao';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Chào mừng trở lại! Đây là tổng quan hoạt động của bạn.</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="today">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
              </select>
              <button
                onClick={loadDashboardData}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Revenue Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.revenueChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(stats.revenueChange)}%
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">Doanh thu</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(stats.totalRevenue)}</p>
            </div>

            {/* Orders Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stats.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.ordersChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(stats.ordersChange)}%
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">Đơn hàng</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders.toLocaleString()}</p>
            </div>

            {/* Customers Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stats.customersChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.customersChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(stats.customersChange)}%
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">Khách hàng</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCustomers.toLocaleString()}</p>
            </div>

            {/* Products Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stats.productsChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.productsChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(stats.productsChange)}%
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">Sản phẩm</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Charts and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Biểu đồ doanh thu</h2>
              <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </button>
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>Biểu đồ sẽ được hiển thị ở đây</p>
                <p className="text-sm">(Cần tích hợp thư viện chart)</p>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Sản phẩm bán chạy</h2>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{product.name}</h4>
                      <p className="text-sm text-gray-500">{product.sold} đã bán</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatPrice(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Package className="w-12 h-12 mx-auto mb-2" />
                <p>Chưa có dữ liệu</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Đơn hàng gần đây</h2>
              <Link
                to="/admin/orders"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Xem tất cả
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã đơn hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2" />
                      <p>Chưa có đơn hàng nào</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tác vụ nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/products/new"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <Package className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-gray-900">Thêm sản phẩm</h3>
              <p className="text-sm text-gray-500 mt-1">Tạo sản phẩm mới</p>
            </Link>

            <Link
              to="/admin/orders"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all group"
            >
              <ShoppingCart className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-gray-900">Quản lý đơn hàng</h3>
              <p className="text-sm text-gray-500 mt-1">Xem và xử lý đơn</p>
            </Link>

            <Link
              to="/admin/customers"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <Users className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-gray-900">Quản lý khách hàng</h3>
              <p className="text-sm text-gray-500 mt-1">Danh sách khách hàng</p>
            </Link>

            <Link
              to="/admin/reports"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all group"
            >
              <BarChart3 className="w-8 h-8 text-orange-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-gray-900">Xem báo cáo</h3>
              <p className="text-sm text-gray-500 mt-1">Phân tích dữ liệu</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
