import { useState, useEffect } from 'react';
import { salesApi } from '../../../api/sales';
import type { ReturnRequest, ReturnStatus } from '../../../api/sales';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  User,
  Calendar,
  FileText,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';

interface ReturnStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  refunded: number;
}

const ReturnDetailModal = ({
  returnRequest,
  onClose,
  onApprove,
  onReject,
  onRefund,
  processing
}: {
  returnRequest: ReturnRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRefund: () => void;
  processing: boolean;
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const getStatusBadge = (status: ReturnStatus) => {
    const badges: Record<ReturnStatus, { bg: string; text: string; icon: any; label: string }> = {
      Pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'Chờ duyệt' },
      Approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle, label: 'Đã duyệt' },
      Rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Từ chối' },
      Refunded: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: DollarSign, label: 'Đã hoàn tiền' },
      Completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Hoàn thành' },
      Cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle, label: 'Đã hủy' },
    };
    const badge = badges[status] || badges.Pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chi tiết yêu cầu đổi trả</h2>
              <p className="text-sm text-gray-500">Đơn hàng: #{returnRequest.orderId?.slice(0, 8)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Trạng thái</span>
            {getStatusBadge(returnRequest.status)}
          </div>

          {/* Request Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Lý do đổi trả</p>
                <p className="text-gray-900 font-medium">{returnRequest.reason}</p>
              </div>
            </div>

            {returnRequest.description && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Mô tả chi tiết</p>
                  <p className="text-gray-700">{returnRequest.description}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Ngày yêu cầu</p>
                <p className="text-gray-700">
                  {returnRequest.requestedAt ? new Date(returnRequest.requestedAt).toLocaleString('vi-VN') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Refund Info */}
          {returnRequest.refundAmount > 0 && (
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">Số tiền hoàn trả</span>
                </div>
                <span className="text-xl font-black text-emerald-700">{formatCurrency(returnRequest.refundAmount)}</span>
              </div>
              {returnRequest.refundMethod && (
                <p className="text-sm text-emerald-600 mt-2">Phương thức: {returnRequest.refundMethod}</p>
              )}
            </div>
          )}

          {/* Rejection Reason */}
          {returnRequest.status === 'Rejected' && returnRequest.rejectionReason && (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs font-bold text-red-500 uppercase mb-1">Lý do từ chối</p>
              <p className="text-red-700">{returnRequest.rejectionReason}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900">Lịch sử xử lý</h3>
            <div className="space-y-2">
              {returnRequest.requestedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-gray-500">{new Date(returnRequest.requestedAt).toLocaleString('vi-VN')}</span>
                  <span className="text-gray-700">Yêu cầu được tạo</span>
                </div>
              )}
              {returnRequest.approvedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-gray-500">{new Date(returnRequest.approvedAt).toLocaleString('vi-VN')}</span>
                  <span className="text-gray-700">Đã duyệt yêu cầu</span>
                </div>
              )}
              {returnRequest.rejectedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-gray-500">{new Date(returnRequest.rejectedAt).toLocaleString('vi-VN')}</span>
                  <span className="text-gray-700">Đã từ chối yêu cầu</span>
                </div>
              )}
              {returnRequest.refundedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-gray-500">{new Date(returnRequest.refundedAt).toLocaleString('vi-VN')}</span>
                  <span className="text-gray-700">Đã hoàn tiền</span>
                </div>
              )}
            </div>
          </div>

          {/* Reject Form */}
          {showRejectForm && (
            <div className="bg-red-50 rounded-xl p-4 space-y-3">
              <p className="font-bold text-red-700">Nhập lý do từ chối</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Vui lòng nhập lý do từ chối..."
                rows={3}
                className="w-full px-4 py-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (rejectReason.trim()) {
                      onReject(rejectReason);
                    } else {
                      toast.error('Vui lòng nhập lý do từ chối');
                    }
                  }}
                  disabled={!rejectReason.trim() || processing}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {returnRequest.status === 'Pending' && !showRejectForm && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectForm(true)}
                className="flex-1 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Từ chối
              </button>
              <button
                onClick={onApprove}
                disabled={processing}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Duyệt yêu cầu
              </button>
            </div>
          )}

          {returnRequest.status === 'Approved' && (
            <button
              onClick={onRefund}
              disabled={processing}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <DollarSign className="w-5 h-5" />
              )}
              Xác nhận hoàn tiền
            </button>
          )}

          {(returnRequest.status === 'Rejected' || returnRequest.status === 'Refunded' || returnRequest.status === 'Completed') && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ReturnsManagementPage = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [stats, setStats] = useState<ReturnStats>({ total: 0, pending: 0, approved: 0, rejected: 0, refunded: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReturns();
  }, [statusFilter]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const response = await salesApi.orders.returns.adminGetList(1, 50, statusFilter || undefined);
      setReturns(response.returns || []);

      // Calculate stats
      const allReturns = response.returns || [];
      setStats({
        total: allReturns.length,
        pending: allReturns.filter((r: ReturnRequest) => r.status === 'Pending').length,
        approved: allReturns.filter((r: ReturnRequest) => r.status === 'Approved').length,
        rejected: allReturns.filter((r: ReturnRequest) => r.status === 'Rejected').length,
        refunded: allReturns.filter((r: ReturnRequest) => r.status === 'Refunded' || r.status === 'Completed').length,
      });
    } catch (error) {
      console.error('Failed to load returns:', error);
      // Mock data for demo
      const mockReturns: ReturnRequest[] = [
        {
          id: '1',
          orderId: 'ORD-001',
          orderItemId: 'ITEM-001',
          reason: 'Sản phẩm bị lỗi/hỏng',
          description: 'Màn hình laptop bị vỡ góc, có vết nứt',
          status: 'Pending',
          refundAmount: 15000000,
          requestedAt: new Date().toISOString(),
        },
        {
          id: '2',
          orderId: 'ORD-002',
          orderItemId: 'ITEM-002',
          reason: 'Nhận sai sản phẩm',
          status: 'Approved',
          refundAmount: 8500000,
          requestedAt: new Date(Date.now() - 86400000).toISOString(),
          approvedAt: new Date().toISOString(),
        },
        {
          id: '3',
          orderId: 'ORD-003',
          orderItemId: 'ITEM-003',
          reason: 'Đổi ý không muốn mua',
          status: 'Rejected',
          refundAmount: 0,
          rejectionReason: 'Sản phẩm đã qua sử dụng, không đủ điều kiện đổi trả',
          requestedAt: new Date(Date.now() - 172800000).toISOString(),
          rejectedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setReturns(mockReturns);
      setStats({
        total: 3,
        pending: 1,
        approved: 1,
        rejected: 1,
        refunded: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (returnId: string) => {
    setProcessing(true);
    try {
      await salesApi.orders.returns.approve(returnId);
      toast.success('Đã duyệt yêu cầu đổi trả');
      setSelectedReturn(null);
      loadReturns();
    } catch (error) {
      toast.error('Không thể duyệt yêu cầu');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (returnId: string, reason: string) => {
    setProcessing(true);
    try {
      await salesApi.orders.returns.reject(returnId, reason);
      toast.success('Đã từ chối yêu cầu đổi trả');
      setSelectedReturn(null);
      loadReturns();
    } catch (error) {
      toast.error('Không thể từ chối yêu cầu');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefund = async (returnId: string) => {
    setProcessing(true);
    try {
      await salesApi.orders.returns.processRefund(returnId);
      toast.success('Đã xử lý hoàn tiền');
      setSelectedReturn(null);
      loadReturns();
    } catch (error) {
      toast.error('Không thể xử lý hoàn tiền');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: ReturnStatus) => {
    const badges: Record<ReturnStatus, { bg: string; text: string; label: string }> = {
      Pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Chờ duyệt' },
      Approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đã duyệt' },
      Rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Từ chối' },
      Refunded: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đã hoàn tiền' },
      Completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Hoàn thành' },
      Cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Đã hủy' },
    };
    const badge = badges[status] || badges.Pending;
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const filteredReturns = returns.filter(r => {
    if (searchQuery && !r.orderId.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.reason.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Quản lý đổi trả</h1>
          <p className="text-gray-500 text-sm">Xử lý yêu cầu đổi trả từ khách hàng</p>
        </div>
        <button
          onClick={loadReturns}
          disabled={loading}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Tổng yêu cầu</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
              <p className="text-xs text-gray-500">Chờ duyệt</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">{stats.approved}</p>
              <p className="text-xs text-gray-500">Đã duyệt</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-red-600">{stats.rejected}</p>
              <p className="text-xs text-gray-500">Từ chối</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600">{stats.refunded}</p>
              <p className="text-xs text-gray-500">Đã hoàn tiền</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã đơn hoặc lý do..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Chờ duyệt</option>
            <option value="Approved">Đã duyệt</option>
            <option value="Rejected">Từ chối</option>
            <option value="Refunded">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không có yêu cầu đổi trả nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReturns.map((returnReq) => (
              <div
                key={returnReq.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedReturn(returnReq)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="w-6 h-6 text-gray-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">Đơn #{returnReq.orderId?.slice(0, 8)}</span>
                      {getStatusBadge(returnReq.status)}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{returnReq.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {returnReq.requestedAt ? new Date(returnReq.requestedAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </p>
                  </div>

                  {returnReq.refundAmount > 0 && (
                    <div className="text-right">
                      <p className="font-bold text-[#D70018]">{formatCurrency(returnReq.refundAmount)}</p>
                      <p className="text-xs text-gray-500">Hoàn tiền</p>
                    </div>
                  )}

                  <button className="p-2 hover:bg-gray-200 rounded-lg">
                    <Eye className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <ReturnDetailModal
          returnRequest={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onApprove={() => handleApprove(selectedReturn.id)}
          onReject={(reason) => handleReject(selectedReturn.id, reason)}
          onRefund={() => handleRefund(selectedReturn.id)}
          processing={processing}
        />
      )}
    </div>
  );
};

export default ReturnsManagementPage;
