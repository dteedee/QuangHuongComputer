import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { crmApi, type LeadDetail } from '../../api/crm';
import { useConfirm } from '../../context/ConfirmContext';
import { notify } from '../ui/toast';

interface Props {
  lead: LeadDetail;
  onConverted: () => void;
}

/**
 * Convert-to-customer flow. Shows the provisioning result and surfaces the
 * real backend error (e.g. lead has neither email nor phone -> 400/404, or
 * `IUserDirectory` DI gap -> 500) instead of a generic "failed" toast.
 */
export function LeadDetailConvertPanel({ lead, onConverted }: Props) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [showLostForm, setShowLostForm] = useState(false);

  if (lead.isConverted) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-green-700">
          <CheckCircle2 size={20} />
          <div>
            <p className="font-medium">Đã chuyển đổi thành khách hàng</p>
            {lead.convertedAt && <p className="text-xs text-green-600">Ngày: {new Date(lead.convertedAt).toLocaleDateString('vi-VN')}</p>}
          </div>
        </div>
        {lead.convertedCustomerId && (
          <button
            onClick={() => navigate(`/backoffice/crm/customers/${lead.convertedCustomerId}`)}
            className="px-4 py-2 bg-white border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-100"
          >
            Xem Customer 360
          </button>
        )}
      </div>
    );
  }

  if (lead.status === 'Lost') {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-700">
        <XCircle size={20} />
        <div>
          <p className="font-medium">Lead đã đánh dấu thất bại</p>
          {lead.lossReason && <p className="text-xs text-red-600">Lý do: {lead.lossReason}</p>}
        </div>
      </div>
    );
  }

  const handleConvert = async () => {
    const ok = await confirm({
      message: 'Chuyển đổi lead này thành khách hàng? Hệ thống sẽ tạo tài khoản khách hàng thật.',
      variant: 'info',
    });
    if (!ok) return;
    setError('');
    setBusy(true);
    try {
      await crmApi.leads.convert(lead.id);
      notify.success('Đã chuyển đổi lead thành khách hàng');
      onConverted();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.title
        || (err?.response?.status === 404 ? 'Lead cần có email hoặc số điện thoại để chuyển đổi' : 'Không thể chuyển đổi lead (lỗi hệ thống, thử lại sau)');
      setError(msg);
      notify.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkLost = async () => {
    if (!lossReason.trim()) {
      setError('Cần nhập lý do thất bại');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await crmApi.leads.markLost(lead.id, lossReason.trim());
      notify.success('Đã đánh dấu lead thất bại');
      onConverted();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể lưu, thử lại sau');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <h3 className="font-semibold text-gray-800 text-sm">Chuyển đổi</h3>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleConvert}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          <ArrowRight size={16} />
          {busy ? 'Đang xử lý...' : 'Chuyển đổi thành khách hàng'}
        </button>
        <button
          onClick={() => setShowLostForm((v) => !v)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Đánh dấu thất bại
        </button>
      </div>
      {showLostForm && (
        <div className="flex gap-2">
          <input
            value={lossReason}
            onChange={(e) => setLossReason(e.target.value)}
            placeholder="Lý do thất bại"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button onClick={handleMarkLost} disabled={busy} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
            Xác nhận
          </button>
        </div>
      )}
    </motion.div>
  );
}
