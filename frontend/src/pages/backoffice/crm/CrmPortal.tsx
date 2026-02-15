import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Target, Mail, TrendingUp, AlertTriangle,
  Crown, Star, ArrowRight, Calendar, CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { crmApi, type CrmDashboard, type RfmDistribution, formatCurrency } from '../../../api/crm';
import { CustomerStatsCard } from '../../../components/crm';

export default function CrmPortal() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  const [rfmData, setRfmData] = useState<RfmDistribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardData, rfmDistribution] = await Promise.all([
        crmApi.dashboard.getOverview(),
        crmApi.dashboard.getRfmDistribution(),
      ]);
      setDashboard(dashboardData);
      setRfmData(rfmDistribution);
    } catch (error) {
      console.error('Failed to load CRM dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan CRM</h1>
          <p className="text-gray-500">Quản lý khách hàng và Leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/backoffice/crm/leads')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <UserPlus size={18} />
            <span>Thêm Lead</span>
          </button>
          <button
            onClick={() => navigate('/backoffice/crm/campaigns/new')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
          >
            <Mail size={18} />
            <span>Tạo Campaign</span>
          </button>
        </div>
      </div>

      {/* Customer Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Khách hàng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomerStatsCard
            title="Tổng khách hàng"
            value={dashboard?.totalCustomers || 0}
            subtitle={`+${dashboard?.newCustomersThisMonth || 0} tháng này`}
            icon={Users}
            color="blue"
            onClick={() => navigate('/backoffice/crm/customers')}
          />
          <CustomerStatsCard
            title="Khách VIP"
            value={dashboard?.vipCustomers || 0}
            icon={Star}
            color="purple"
            onClick={() => navigate('/backoffice/crm/customers?stage=VIP')}
          />
          <CustomerStatsCard
            title="Champion"
            value={dashboard?.championCustomers || 0}
            icon={Crown}
            color="green"
            onClick={() => navigate('/backoffice/crm/customers?stage=Champion')}
          />
          <CustomerStatsCard
            title="Cần chăm sóc"
            value={dashboard?.atRiskCustomers || 0}
            subtitle={`${dashboard?.churnedCustomers || 0} đã rời bỏ`}
            icon={AlertTriangle}
            color="orange"
            onClick={() => navigate('/backoffice/crm/customers?stage=AtRisk')}
          />
        </div>
      </div>

      {/* Revenue & Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Tổng doanh thu</h3>
            <TrendingUp size={24} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mb-2">
            {formatCurrency(dashboard?.totalRevenue || 0)}
          </p>
          <p className="text-sm opacity-80">
            Trung bình {formatCurrency(dashboard?.averageOrderValue || 0)} / đơn
          </p>
        </motion.div>

        {/* Pipeline Value */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Giá trị Pipeline</h3>
            <Target size={24} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mb-2">
            {formatCurrency(dashboard?.totalPipelineValue || 0)}
          </p>
          <p className="text-sm opacity-80">
            {dashboard?.totalLeads || 0} leads đang theo dõi
          </p>
        </motion.div>
      </div>

      {/* Leads Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Leads</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomerStatsCard
            title="Tổng Leads"
            value={dashboard?.totalLeads || 0}
            subtitle={`+${dashboard?.newLeadsThisMonth || 0} tháng này`}
            icon={UserPlus}
            color="blue"
            onClick={() => navigate('/backoffice/crm/leads')}
          />
          <CustomerStatsCard
            title="Đủ điều kiện"
            value={dashboard?.qualifiedLeads || 0}
            icon={Target}
            color="green"
            onClick={() => navigate('/backoffice/crm/leads?status=Qualified')}
          />
          <CustomerStatsCard
            title="Chuyển đổi"
            value={dashboard?.convertedLeadsThisMonth || 0}
            subtitle={`${(dashboard?.leadConversionRate || 0).toFixed(1)}% tỷ lệ`}
            icon={ArrowRight}
            color="purple"
          />
          <CustomerStatsCard
            title="Pipeline"
            value="Xem"
            icon={TrendingUp}
            color="orange"
            onClick={() => navigate('/backoffice/crm/leads/pipeline')}
          />
        </div>
      </div>

      {/* Lifecycle Distribution & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifecycle Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-gray-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Phân bổ Lifecycle</h3>
          <div className="space-y-3">
            {rfmData?.lifecycleDistribution.map((item) => (
              <div key={item.stage} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600">{item.stageName}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.count / (dashboard?.totalCustomers || 1)) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={`h-full rounded-full ${
                      item.stage === 'Champion' ? 'bg-purple-500' :
                      item.stage === 'VIP' ? 'bg-blue-500' :
                      item.stage === 'Active' ? 'bg-green-500' :
                      item.stage === 'AtRisk' ? 'bg-yellow-500' :
                      item.stage === 'Churned' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-gray-700 text-right">
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tasks Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Công việc</h3>
            <button
              onClick={() => navigate('/backoffice/crm/tasks')}
              className="text-sm text-blue-600 hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-orange-500" size={20} />
                <span className="text-sm text-gray-600">Cần làm</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">
                {dashboard?.pendingTasks || 0}
              </p>
            </div>

            <div className="bg-red-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-red-500" size={20} />
                <span className="text-sm text-gray-600">Quá hạn</span>
              </div>
              <p className="text-2xl font-bold text-red-700">
                {dashboard?.overdueTasks || 0}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => navigate('/backoffice/crm/leads/upcoming-followups')}
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <CheckSquare size={16} />
              <span>Xem follow-ups sắp tới</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Khách hàng', icon: Users, path: '/backoffice/crm/customers' },
          { label: 'Leads', icon: UserPlus, path: '/backoffice/crm/leads' },
          { label: 'Pipeline', icon: Target, path: '/backoffice/crm/leads/pipeline' },
          { label: 'Phân nhóm', icon: Target, path: '/backoffice/crm/segments' },
          { label: 'Chiến dịch', icon: Mail, path: '/backoffice/crm/campaigns' },
        ].map((item) => (
          <motion.button
            key={item.path}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all"
          >
            <item.icon size={20} className="text-gray-400" />
            <span className="text-gray-700 font-medium">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
