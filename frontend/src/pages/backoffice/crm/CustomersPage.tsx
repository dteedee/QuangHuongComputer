import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Filter, Download, ChevronLeft, ChevronRight,
  Eye, Mail, Phone
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  crmApi, type CustomerAnalytics, type Segment, type LifecycleStage,
  formatCurrency, formatDate
} from '../../../api/crm';
import { RfmScoreBadge, LifecycleStageBadge } from '../../../components/crm';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState<CustomerAnalytics[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage | ''>('');
  const [segmentId, setSegmentId] = useState('');

  useEffect(() => {
    const stage = searchParams.get('stage') as LifecycleStage | null;
    if (stage) {
      setLifecycleStage(stage);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [page, lifecycleStage, segmentId]);

  useEffect(() => {
    crmApi.segments.getList().then(setSegments).catch(console.error);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await crmApi.customers.getList({
        page,
        pageSize,
        search: search || undefined,
        lifecycleStage: lifecycleStage || undefined,
        segmentId: segmentId || undefined,
      });
      setCustomers(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khach hang</h1>
          <p className="text-gray-500">{total} khach hang</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <Download size={18} />
          <span>Xuat Excel</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tim kiem khach hang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <select
            value={lifecycleStage}
            onChange={(e) => {
              setLifecycleStage(e.target.value as LifecycleStage | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tat ca Lifecycle</option>
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="VIP">VIP</option>
            <option value="Champion">Champion</option>
            <option value="AtRisk">At Risk</option>
            <option value="Churned">Churned</option>
          </select>

          <select
            value={segmentId}
            onChange={(e) => {
              setSegmentId(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tat ca Segment</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
          >
            <Filter size={18} />
            <span>Loc</span>
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Khong tim thay khach hang nao</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Khach hang</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">RFM</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Lifecycle</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Tong chi tieu</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Don hang</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Mua gan nhat</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Segments</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/backoffice/crm/customers/${customer.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {customer.userName || `User ${customer.userId.slice(0, 8)}`}
                        </p>
                        <p className="text-sm text-gray-500">{customer.email || '--'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <RfmScoreBadge
                          recency={customer.recencyScore}
                          frequency={customer.frequencyScore}
                          monetary={customer.monetaryScore}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <LifecycleStageBadge stage={customer.lifecycleStage} size="sm" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(customer.totalSpent)}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {customer.totalOrderCount}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      {customer.lastPurchaseDate
                        ? formatDate(customer.lastPurchaseDate)
                        : '--'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {customer.segments.slice(0, 2).map((seg, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {seg}
                          </span>
                        ))}
                        {customer.segments.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{customer.segments.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/backoffice/crm/customers/${customer.id}`);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Xem chi tiet"
                        >
                          <Eye size={16} className="text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Hien thi {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} / {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
