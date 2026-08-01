import { useState, useEffect, useMemo } from 'react';
import { salesApi } from '../../../api/sales';
import type { ReturnRequest, ReturnStatus, ReturnType } from '../../../api/sales';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  Eye,
  X,
  ClipboardCheck,
  MessageSquare,
  ArrowRight,
  Calendar,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';
import ReturnInspectionForm from '../../../components/return/return-inspection-form';

interface ReturnStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  refunded: number;
}

const STATUS_META: Record<ReturnStatus, { bg: string; text: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  Pending:   { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Chờ duyệt',    icon: Clock },
  Approved:  { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Đã duyệt',     icon: CheckCircle },
  Rejected:  { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Từ chối',      icon: XCircle },
  Refunded:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đã hoàn',  icon: DollarSign },
  Completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Hoàn thành',   icon: CheckCircle },
  Cancelled: { bg: 'bg-gray-100',  text: 'text-gray-700',  label: 'Đã hủy',       icon: XCircle },
};

const TYPE_META: Record<ReturnType, { cls: string; label: string }> = {
  Refund:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Hoàn tiền' },
  Exchange: { cls: 'bg-blue-100 text-blue-700',       label: 'Đổi SP khác' },
  Replace:  { cls: 'bg-purple-100 text-purple-700',   label: 'Đổi 1-1' },
};

function StatusBadge({ status }: { status: ReturnStatus }) {
  const meta = STATUS_META[status] || STATUS_META.Pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${meta.bg} ${meta.text}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function TypeBadge({ type }: { type: ReturnType }) {
  const meta = TYPE_META[type] || TYPE_META.Refund;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${meta.cls}`}>{meta.label}</span>
  );
}

// -------------------- Drawer chi tiết Return --------------------

interface DrawerProps {
  returnRequest: ReturnRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRefund: () => void;
  onComplete: () => void;
  onInspect: () => void;
  processing: boolean;
}

const ReturnDetailDrawer = ({
  returnRequest, onClose, onApprove, onReject, onRefund, onComplete, onInspect, processing
}: DrawerProps) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const canInspect = returnRequest.status === 'Approved';
  const canComplete = returnRequest.status === 'Refunded';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chi tiết yêu cầu đổi trả</h2>
              <p className="text-sm text-gray-500">
                Đơn #{returnRequest.orderNumber || returnRequest.orderId?.slice(0, 8)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status + Type */}
          <div className="flex items-center gap-3">
            <StatusBadge status={returnRequest.status} />
            <TypeBadge type={returnRequest.type} />
            {returnRequest.priceDifference != null && returnRequest.priceDifference !== 0 && (
              <span className="text-xs text-gray-500">
                Chênh lệch: <b className={returnRequest.priceDifference > 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {formatCurrency(returnRequest.priceDifference)}
                </b>
              </span>
            )}
          </div>

          {/* Product info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Sản phẩm trả</p>
                <p className="font-semibold text-gray-900">{returnRequest.productName || 'Sản phẩm'}</p>
                {returnRequest.productSku && (
                  <p className="text-xs text-gray-500 font-mono">SKU: {returnRequest.productSku}</p>
                )}
                <p className="text-xs text-gray-500">
                  SL: {returnRequest.quantity ?? 1} · Đơn giá: {formatCurrency(returnRequest.unitPrice ?? 0)}
                </p>
              </div>
            </div>

            {returnRequest.type === 'Exchange' && returnRequest.exchangeProductName && (
              <div className="flex items-start gap-3 border-t border-gray-200 pt-2 mt-2">
                <ArrowRight className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase mb-1">Sản phẩm thay thế</p>
                  <p className="font-semibold text-gray-900">{returnRequest.exchangeProductName}</p>
                  {returnRequest.exchangeOrderId && (
                    <a
                      href={`/backoffice/orders?highlight=${returnRequest.exchangeOrderId}`}
                      className="text-xs text-blue-600 underline"
                    >
                      Đơn mới #{returnRequest.exchangeOrderId.slice(0, 8)}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Lý do</p>
                <p className="font-medium">{returnRequest.reason}</p>
              </div>
            </div>
            {returnRequest.description && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Mô tả chi tiết</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{returnRequest.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          {returnRequest.attachmentUrls && returnRequest.attachmentUrls.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                Ảnh minh chứng
              </p>
              <div className="flex flex-wrap gap-2">
                {returnRequest.attachmentUrls.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt={`att-${i}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-zoom-in"
                    onClick={() => setLightbox(u)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Refund info */}
          {returnRequest.refundAmount > 0 && (
            <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-emerald-700">Số tiền hoàn</span>
              </div>
              <span className="text-lg font-semibold text-emerald-700">{formatCurrency(returnRequest.refundAmount)}</span>
            </div>
          )}

          {/* Reject reason */}
          {returnRequest.status === 'Rejected' && returnRequest.rejectionReason && (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs font-bold text-red-500 uppercase mb-1">Lý do từ chối</p>
              <p className="text-red-700">{returnRequest.rejectionReason}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm">Lịch sử xử lý</h3>
            {returnRequest.requestedAt && (
              <TimelineRow color="amber" at={returnRequest.requestedAt} label="Yêu cầu được tạo" />
            )}
            {returnRequest.approvedAt && (
              <TimelineRow color="blue" at={returnRequest.approvedAt} label="Đã duyệt" />
            )}
            {returnRequest.rejectedAt && (
              <TimelineRow color="red" at={returnRequest.rejectedAt} label="Đã từ chối" />
            )}
            {returnRequest.refundedAt && (
              <TimelineRow color="emerald" at={returnRequest.refundedAt} label="Đã hoàn tiền" />
            )}
          </div>

          {/* Reject form */}
          {showRejectForm && (
            <div className="bg-red-50 rounded-xl p-4 space-y-3">
              <p className="font-bold text-red-700">Nhập lý do từ chối</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-red-200 rounded-xl outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl font-bold text-gray-700"
                >
                  Hủy
                </button>
                <button
                  onClick={() => rejectReason.trim() ? onReject(rejectReason) : toast.error('Vui lòng nhập lý do từ chối')}
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
        <div className="p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0 flex flex-wrap gap-2">
          {returnRequest.status === 'Pending' && !showRejectForm && (
            <>
              <button
                onClick={() => setShowRejectForm(true)}
                className="flex-1 min-w-[120px] py-2.5 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Từ chối
              </button>
              <button
                onClick={onApprove}
                disabled={processing}
                className="flex-1 min-w-[120px] py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Duyệt
              </button>
            </>
          )}

          {canInspect && (
            <button
              onClick={onInspect}
              disabled={processing}
              className="flex-1 min-w-[140px] py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              Kiểm hàng nhập kho
            </button>
          )}

          {returnRequest.status === 'Approved' && returnRequest.type === 'Refund' && (
            <button
              onClick={onRefund}
              disabled={processing}
              className="flex-1 min-w-[140px] py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Xác nhận hoàn tiền
            </button>
          )}

          {canComplete && (
            <button
              onClick={onComplete}
              disabled={processing}
              className="flex-1 min-w-[140px] py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Hoàn tất
            </button>
          )}

          {(['Rejected', 'Completed', 'Cancelled'].includes(returnRequest.status)) && (
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300">
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="preview" className="max-w-[90vw] max-h-[90vh] rounded-xl" />
        </div>
      )}
    </div>
  );
};

function TimelineRow({ color, at, label }: { color: string; at: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`w-2 h-2 bg-${color}-500 rounded-full`} />
      <span className="text-gray-500 min-w-[140px]">{new Date(at).toLocaleString('vi-VN')}</span>
      <span className="text-gray-700">{label}</span>
    </div>
  );
}

// -------------------- Main Page --------------------

export const ReturnsManagementPage = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [stats, setStats] = useState<ReturnStats>({ total: 0, pending: 0, approved: 0, rejected: 0, refunded: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [inspecting, setInspecting] = useState<ReturnRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { void loadReturns(); }, [statusFilter]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const response = await salesApi.orders.returns.adminGetList(1, 100, statusFilter || undefined);
      const list = response.returns || [];
      setReturns(list);
      setStats({
        total: list.length,
        pending: list.filter(r => r.status === 'Pending').length,
        approved: list.filter(r => r.status === 'Approved').length,
        rejected: list.filter(r => r.status === 'Rejected').length,
        refunded: list.filter(r => r.status === 'Refunded' || r.status === 'Completed').length,
      });
    } catch {
      toast.error('Không thể tải danh sách đổi trả');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(true);
    try {
      await salesApi.orders.returns.approve(id);
      toast.success('Đã duyệt yêu cầu đổi trả');
      setSelectedReturn(null);
      void loadReturns();
    } catch { toast.error('Không thể duyệt'); }
    finally { setProcessing(false); }
  };

  const handleReject = async (id: string, reason: string) => {
    setProcessing(true);
    try {
      await salesApi.orders.returns.reject(id, reason);
      toast.success('Đã từ chối yêu cầu');
      setSelectedReturn(null);
      void loadReturns();
    } catch { toast.error('Không thể từ chối'); }
    finally { setProcessing(false); }
  };

  const handleRefund = async (id: string) => {
    setProcessing(true);
    try {
      await salesApi.orders.returns.processRefund(id);
      toast.success('Đã xử lý hoàn tiền');
      setSelectedReturn(null);
      void loadReturns();
    } catch { toast.error('Không thể hoàn tiền'); }
    finally { setProcessing(false); }
  };

  const handleComplete = async (id: string) => {
    setProcessing(true);
    try {
      await salesApi.orders.returns.complete(id);
      toast.success('Đã hoàn tất');
      setSelectedReturn(null);
      void loadReturns();
    } catch { toast.error('Không thể hoàn tất'); }
    finally { setProcessing(false); }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !(r.orderNumber?.toLowerCase().includes(q)) &&
          !(r.orderId?.toLowerCase().includes(q)) &&
          !(r.reason?.toLowerCase().includes(q)) &&
          !(r.productName?.toLowerCase().includes(q))
        ) return false;
      }
      if (startDate && r.requestedAt) {
        if (new Date(r.requestedAt) < new Date(startDate)) return false;
      }
      if (endDate && r.requestedAt) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        if (new Date(r.requestedAt) > end) return false;
      }
      return true;
    });
  }, [returns, typeFilter, searchQuery, startDate, endDate]);

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản lý đổi trả</h1>
          <p className="text-gray-500 text-sm">Duyệt, kiểm hàng, hoàn tiền và đóng yêu cầu đổi trả.</p>
        </div>
        <button onClick={() => void loadReturns()} disabled={loading} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Package} label="Tổng" value={stats.total} color="gray" />
        <StatCard icon={Clock} label="Chờ duyệt" value={stats.pending} color="amber" />
        <StatCard icon={CheckCircle} label="Đã duyệt" value={stats.approved} color="blue" />
        <StatCard icon={XCircle} label="Từ chối" value={stats.rejected} color="red" />
        <StatCard icon={DollarSign} label="Đã hoàn" value={stats.refunded} color="emerald" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn / SP / lý do..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
            <option value="">Tất cả loại</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không có yêu cầu đổi trả nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                  <th className="px-4 py-3 font-semibold">Mã</th>
                  <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Hoàn</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map(r => (
                  <tr key={r.id} onClick={() => setSelectedReturn(r)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs">
                      #{r.orderNumber || r.orderId?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.productName || '—'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[220px]">{r.reason}</div>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs">{r.refundAmount > 0 ? formatCurrency(r.refundAmount) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedReturn(r); }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedReturn && !inspecting && (
        <ReturnDetailDrawer
          returnRequest={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onApprove={() => void handleApprove(selectedReturn.id)}
          onReject={(reason) => void handleReject(selectedReturn.id, reason)}
          onRefund={() => void handleRefund(selectedReturn.id)}
          onComplete={() => void handleComplete(selectedReturn.id)}
          onInspect={() => setInspecting(selectedReturn)}
          processing={processing}
        />
      )}

      {/* Inspection Modal (nested) */}
      {inspecting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Kiểm hàng nhận về</h2>
                <p className="text-xs text-gray-500">Return #{inspecting.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setInspecting(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ReturnInspectionForm
                returnId={inspecting.id}
                onSuccess={() => {
                  setInspecting(null);
                  setSelectedReturn(null);
                  void loadReturns();
                }}
                onCancel={() => setInspecting(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Small stat card
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'gray' | 'amber' | 'blue' | 'red' | 'emerald';
}) {
  const colorMap = {
    gray:    { bg: 'bg-gray-100',    text: 'text-gray-600' },
    amber:   { bg: 'bg-amber-100',   text: 'text-amber-600' },
    blue:    { bg: 'bg-blue-100',    text: 'text-blue-600' },
    red:     { bg: 'bg-red-100',     text: 'text-red-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  }[color];
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${colorMap.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorMap.text}`} />
        </div>
        <div>
          <p className={`text-2xl font-semibold ${colorMap.text}`}>{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default ReturnsManagementPage;
