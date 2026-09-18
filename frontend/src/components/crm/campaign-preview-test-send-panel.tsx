import { useState } from 'react';
import { Eye, Send } from 'lucide-react';
import { crmApi } from '../../api/crm';
import { notify } from '../ui/toast';

/** Campaign editor's "Xem trước" + "Gửi thử" panel. See `crmApi.campaigns.sendTest` for the honest note on backend gap. */
export function CampaignPreviewTestSendPanel({ campaignId }: { campaignId: string }) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const html = await crmApi.campaigns.preview(campaignId);
      setPreviewHtml(html);
    } catch {
      notify.error('Không thể tải xem trước');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      notify.warning('Nhập email để gửi thử');
      return;
    }
    setSendingTest(true);
    try {
      await crmApi.campaigns.sendTest(campaignId, testEmail.trim());
      notify.success(`Đã gửi thử tới ${testEmail}`);
    } catch (err: any) {
      const status = err?.response?.status;
      notify.error(status === 404
        ? 'Backend chưa hỗ trợ gửi thử email (đã báo integration request)'
        : 'Không thể gửi thử, thử lại sau');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm">Xem trước &amp; gửi thử</h3>
        <button onClick={handlePreview} disabled={loadingPreview} className="flex items-center gap-2 text-sm text-accent hover:underline disabled:opacity-50">
          <Eye size={14} /> {loadingPreview ? 'Đang tải...' : 'Xem trước'}
        </button>
      </div>

      {previewHtml !== null && (
        <iframe title="Xem trước email" srcDoc={previewHtml} className="w-full h-64 border border-gray-100 rounded-lg" />
      )}

      <div className="flex gap-2">
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="email-nhan-thu@..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <button onClick={handleSendTest} disabled={sendingTest} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
          <Send size={14} /> Gửi thử
        </button>
      </div>
      <p className="text-xs text-gray-400">Merge tags hỗ trợ: <code>{'{{CustomerName}}'}</code>, <code>{'{{LastPurchaseDate}}'}</code></p>
    </div>
  );
}
