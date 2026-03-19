import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Search, Filter, Plus, ChevronLeft, ChevronRight,
  Phone, Mail, Building2, Calendar, DollarSign, MoreVertical,
  Edit, Trash2, ArrowRight, X
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  crmApi, type Lead, type LeadSource, type LeadStatus,
  formatCurrency, formatDate, getLeadStatusColor
} from '../../../api/crm';

export default function LeadsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [source, setSource] = useState<LeadSource | ''>('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const statusParam = searchParams.get('status') as LeadStatus | null;
    if (statusParam) {
      setStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [page, status, source]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await crmApi.leads.getList({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        source: source || undefined,
      });
      setLeads(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa lead này?')) return;
    try {
      await crmApi.leads.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const handleConvert = async (lead: Lead) => {
    if (!confirm('Chuyển đổi lead này thành khách hàng?')) return;
    try {
      await crmApi.leads.convert(lead.id);
      loadData();
    } catch (error) {
      console.error('Failed to convert lead:', error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500">{total} leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/backoffice/crm/leads/pipeline')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <span>Xem Pipeline</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
          >
            <Plus size={18} />
            <span>Thêm Lead</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as LeadStatus | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="New">Mới</option>
            <option value="Contacted">Đã liên hệ</option>
            <option value="Qualified">Đủ điều kiện</option>
            <option value="Proposal">Đề xuất</option>
            <option value="Negotiation">Đàm phán</option>
            <option value="Won">Thành công</option>
            <option value="Lost">Thất bại</option>
          </select>

          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as LeadSource | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tất cả nguồn</option>
            <option value="Website">Website</option>
            <option value="Referral">Giới thiệu</option>
            <option value="Advertisement">Quảng cáo</option>
            <option value="SocialMedia">Mạng xã hội</option>
            <option value="Event">Sự kiện</option>
            <option value="ColdCall">Cold Call</option>
            <option value="Email">Email</option>
          </select>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
          >
            <Filter size={18} />
            <span>Lọc</span>
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
            <p>Không tìm thấy lead nào</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-red-600 hover:underline"
            >
              Thêm lead mới
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Lead</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Công ty</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Nguồn</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Giá trị</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Follow-up</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Phân công</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead, index) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{lead.fullName}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.company && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 size={14} />
                          <span>{lead.company}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{lead.sourceName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`text-xs px-3 py-1 rounded-full ${getLeadStatusColor(lead.status)}`}>
                          {lead.statusName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lead.estimatedValue ? (
                        <span className="font-medium text-green-600">
                          {formatCurrency(lead.estimatedValue)}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {lead.nextFollowUpAt ? (
                        <span className="flex items-center justify-center gap-1 text-sm text-orange-600">
                          <Calendar size={14} />
                          {formatDate(lead.nextFollowUpAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {lead.assignedToUserName || '--'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/backoffice/crm/leads/${lead.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Chi tiết"
                        >
                          <Edit size={16} className="text-gray-400" />
                        </button>
                        {!lead.isConverted && lead.status !== 'Lost' && (
                          <button
                            onClick={() => handleConvert(lead)}
                            className="p-2 hover:bg-green-100 rounded-lg"
                            title="Chuyển đổi"
                          >
                            <ArrowRight size={16} className="text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                          title="Xóa"
                        >
                          <Trash2 size={16} className="text-red-400" />
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
              Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} / {total}
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

      {/* Create Modal - Simple version */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Simple Create Lead Modal
function CreateLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    source: 'Website' as LeadSource,
    estimatedValue: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) return;

    try {
      setLoading(true);
      await crmApi.leads.create({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        source: form.source,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch (error) {
      console.error('Failed to create lead:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Thêm Lead Mới</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ tên *
            </label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Công ty
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nguồn
            </label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            >
              <option value="Website">Website</option>
              <option value="Referral">Giới thiệu</option>
              <option value="Advertisement">Quảng cáo</option>
              <option value="SocialMedia">Mạng xã hội</option>
              <option value="Event">Sự kiện</option>
              <option value="ColdCall">Cold Call</option>
              <option value="Email">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá trị ước tính (VND)
            </label>
            <input
              type="number"
              value={form.estimatedValue}
              onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo Lead'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
