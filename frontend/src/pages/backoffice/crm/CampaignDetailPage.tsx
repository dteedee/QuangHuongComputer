import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Eye, MousePointerClick, Ban, MailX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { crmApi, type CampaignDetail, formatDate, getCampaignStatusColor } from '../../../api/crm';
import { CampaignPreviewTestSendPanel } from '../../../components/crm/campaign-preview-test-send-panel';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setCampaign(await crmApi.campaigns.getById(id));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" /></div>;
  }

  if (notFound || !campaign) {
    return (
      <div className="p-6 text-center py-20 text-gray-500">
        <p>Không tìm thấy chiến dịch này.</p>
        <button onClick={() => navigate('/backoffice/crm/campaigns')} className="mt-4 text-accent hover:underline">Về danh sách</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/backoffice/crm/campaigns')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Danh sách chiến dịch
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <p className="text-gray-500 mt-1">{campaign.subject}</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${getCampaignStatusColor(campaign.status)}`}>{campaign.statusName}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm text-gray-500">
          {campaign.targetSegmentName && <span>Phân nhóm: <b className="text-gray-800">{campaign.targetSegmentName}</b></span>}
          {campaign.scheduledAt && <span>Lên lịch: <b className="text-gray-800">{formatDate(campaign.scheduledAt)}</b></span>}
          {campaign.sentAt && <span>Đã gửi: <b className="text-gray-800">{formatDate(campaign.sentAt)}</b></span>}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatTile icon={Send} label="Người nhận" value={campaign.totalRecipients} />
        <StatTile icon={Eye} label="Đã mở" value={`${campaign.openedCount} (${campaign.openRate.toFixed(1)}%)`} />
        <StatTile icon={MousePointerClick} label="Đã click" value={`${campaign.clickedCount} (${campaign.clickRate.toFixed(1)}%)`} />
        <StatTile icon={MailX} label="Unsubscribe" value={campaign.unsubscribedCount} />
        <StatTile icon={Ban} label="Bounce" value={`${campaign.bouncedCount} (${campaign.bounceRate.toFixed(1)}%)`} />
      </div>

      <CampaignPreviewTestSendPanel campaignId={campaign.id} />
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Send; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <Icon size={18} className="mx-auto text-gray-400 mb-2" />
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
