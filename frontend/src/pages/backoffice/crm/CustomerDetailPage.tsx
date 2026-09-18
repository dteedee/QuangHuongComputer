import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, MapPin, RefreshCcw, Wrench } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { crmApi, type CustomerDetail, formatCurrency, formatDate } from '../../../api/crm';
import { RfmScoreBadge, LifecycleStageBadge, CustomerTimeline } from '../../../components/crm';
import { Customer360OrdersCard } from '../../../components/crm/customer-360-orders-card';
import { Customer360TasksCard } from '../../../components/crm/customer-360-tasks-card';
import { Customer360SegmentsCard } from '../../../components/crm/customer-360-segments-card';
import { Customer360ConsentCard } from '../../../components/crm/customer-360-consent-card';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { notify } from '../../../components/ui/toast';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await crmApi.customers.getById(id);
      setCustomer(data);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await crmApi.customers.recalculateAnalytics();
      notify.success('Đã tính lại RFM');
      load();
    } catch {
      notify.error('Không thể tính lại RFM (hệ thống có thể chưa sẵn sàng)');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="p-6 text-center py-20 text-gray-500">
        <p>Không tìm thấy khách hàng này.</p>
        <button onClick={() => navigate('/backoffice/crm/customers')} className="mt-4 text-accent hover:underline">
          Về danh sách khách hàng
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/backoffice/crm/customers')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} />
        Danh sách khách hàng
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{customer.userName || `Khách hàng #${customer.userId.slice(0, 8)}`}</h1>
              <LifecycleStageBadge stage={customer.lifecycleStage} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {customer.email && <span className="flex items-center gap-1"><Mail size={14} />{customer.email}</span>}
              {customer.phone && <span className="flex items-center gap-1"><Phone size={14} />{customer.phone}</span>}
              {customer.address && <span className="flex items-center gap-1"><MapPin size={14} />{customer.address}</span>}
            </div>
          </div>
          <Can permission={PERMISSIONS.CRM_MANAGE_CUSTOMERS}>
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCcw size={14} className={recalculating ? 'animate-spin' : ''} />
              Tính lại RFM
            </button>
          </Can>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <Stat label="Điểm RFM" value={<RfmScoreBadge recency={customer.recencyScore} frequency={customer.frequencyScore} monetary={customer.monetaryScore} />} />
          <Stat label="Tổng chi tiêu" value={formatCurrency(customer.totalSpent)} />
          <Stat label="Số đơn hàng" value={customer.totalOrderCount} />
          <Stat label="Mua gần nhất" value={customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate) : '—'} />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Customer360OrdersCard userId={customer.userId} />
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Lịch sử tương tác</h3>
            <CustomerTimeline interactions={customer.recentInteractions} maxItems={10} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2"><Wrench size={14} /> Sửa chữa / Bảo hành</h3>
            <p className="text-sm text-gray-400 py-2">
              Chưa có API tra cứu sửa chữa/bảo hành theo khách hàng (`repair`/`warranty` admin list chưa nhận
              `customerId`) — xem mục Unresolved trong báo cáo. Không hiển thị dữ liệu giả.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <Customer360SegmentsCard customerId={customer.id} currentSegments={customer.segments.map((s) => s.name)} onChanged={load} />
          <Customer360TasksCard customerId={customer.id} tasks={customer.pendingTasks} onChanged={load} />
          <Customer360ConsentCard customer={customer} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase mb-1">{label}</p>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}
