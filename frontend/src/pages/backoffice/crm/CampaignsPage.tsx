import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Plus, Search, Filter, ChevronLeft, ChevronRight,
  Play, Pause, Eye, Edit, Trash2, Send, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  crmApi, type Campaign, type CampaignStatus,
  formatDate, getCampaignStatusColor
} from '../../../api/crm';

export default function CampaignsPage() {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CampaignStatus | ''>('');

  useEffect(() => {
    loadData();
  }, [page, status]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await crmApi.campaigns.getList({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
      });
      setCampaigns(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleSend = async (id: string) => {
    if (!confirm('Gửi campaign này ngay bây giờ?')) return;
    try {
      await crmApi.campaigns.send(id);
      loadData();
    } catch (error) {
      console.error('Failed to send campaign:', error);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await crmApi.campaigns.pause(id);
      loadData();
    } catch (error) {
      console.error('Failed to pause campaign:', error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await crmApi.campaigns.resume(id);
      loadData();
    } catch (error) {
      console.error('Failed to resume campaign:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa campaign này?')) return;
    try {
      await crmApi.campaigns.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chiến dịch Email</h1>
          <p className="text-gray-500">{total} chiến dịch</p>
        </div>
        <button
          onClick={() => navigate('/backoffice/crm/campaigns/new')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
        >
          <Plus size={18} />
          <span>Tạo Chiến dịch</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm chiến dịch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as CampaignStatus | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Draft">Bản nháp</option>
            <option value="Scheduled">Đã lên lịch</option>
            <option value="Sending">Đang gửi</option>
            <option value="Sent">Đã gửi</option>
            <option value="Paused">Tạm dừng</option>
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
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Mail size={48} className="mx-auto mb-4 opacity-50" />
            <p>Chưa có chiến dịch nào</p>
            <button
              onClick={() => navigate('/backoffice/crm/campaigns/new')}
              className="mt-4 text-red-600 hover:underline"
            >
              Tạo chiến dịch đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Chiến dịch</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Phân nhóm</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Người nhận</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Tỷ lệ mở</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Tỷ lệ click</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Ngày gửi</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((campaign, index) => (
                  <motion.tr
                    key={campaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{campaign.name}</p>
                        <p className="text-sm text-gray-500">{campaign.subject}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`text-xs px-3 py-1 rounded-full ${getCampaignStatusColor(campaign.status)}`}>
                          {campaign.statusName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {campaign.targetSegmentName || '--'}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {campaign.totalRecipients}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-medium ${campaign.openRate > 20 ? 'text-green-600' : 'text-gray-600'}`}>
                        {campaign.openRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-medium ${campaign.clickRate > 5 ? 'text-green-600' : 'text-gray-600'}`}>
                        {campaign.clickRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      {campaign.sentAt
                        ? formatDate(campaign.sentAt)
                        : campaign.scheduledAt
                        ? <span className="flex items-center justify-center gap-1 text-blue-600">
                            <Calendar size={14} />
                            {formatDate(campaign.scheduledAt)}
                          </span>
                        : '--'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/backoffice/crm/campaigns/${campaign.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Xem"
                        >
                          <Eye size={16} className="text-gray-400" />
                        </button>

                        {campaign.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => navigate(`/backoffice/crm/campaigns/${campaign.id}/edit`)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                              title="Sửa"
                            >
                              <Edit size={16} className="text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleSend(campaign.id)}
                              className="p-2 hover:bg-green-100 rounded-lg"
                              title="Gửi ngay"
                            >
                              <Send size={16} className="text-green-600" />
                            </button>
                          </>
                        )}

                        {campaign.status === 'Sending' && (
                          <button
                            onClick={() => handlePause(campaign.id)}
                            className="p-2 hover:bg-orange-100 rounded-lg"
                            title="Tạm dừng"
                          >
                            <Pause size={16} className="text-orange-600" />
                          </button>
                        )}

                        {campaign.status === 'Paused' && (
                          <button
                            onClick={() => handleResume(campaign.id)}
                            className="p-2 hover:bg-green-100 rounded-lg"
                            title="Tiếp tục"
                          >
                            <Play size={16} className="text-green-600" />
                          </button>
                        )}

                        {(campaign.status === 'Draft' || campaign.status === 'Scheduled') && (
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="p-2 hover:bg-red-100 rounded-lg"
                            title="Xóa"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        )}
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
    </div>
  );
}
