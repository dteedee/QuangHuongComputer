import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { crmApi, type Segment, type CreateCampaignDto } from '../../../api/crm';
import { CampaignPreviewTestSendPanel } from '../../../components/crm/campaign-preview-test-send-panel';
import { notify } from '../../../components/ui/toast';

const empty: CreateCampaignDto = { name: '', subject: '', previewText: '', htmlContent: '', targetSegmentId: undefined };

/** Campaign create/edit — routes `crm/campaigns/new` and `crm/campaigns/:id/edit`. */
export default function CampaignEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [form, setForm] = useState<CreateCampaignDto>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    crmApi.segments.getList().then(setSegments).catch(() => setSegments([]));
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const c = await crmApi.campaigns.getById(id);
      setForm({
        name: c.name, subject: c.subject, previewText: c.previewText || '', htmlContent: c.htmlContent,
        plainTextContent: c.plainTextContent, targetSegmentId: c.targetSegmentId,
      });
      setSavedId(c.id);
      if (c.scheduledAt) setScheduleAt(c.scheduledAt.slice(0, 16));
    } catch {
      notify.error('Không tải được chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Cần nhập tên chiến dịch';
    if (!form.subject.trim()) e.subject = 'Cần nhập tiêu đề email';
    if (!form.htmlContent.trim()) e.htmlContent = 'Cần nhập nội dung email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && id) {
        await crmApi.campaigns.update(id, form);
        notify.success('Đã lưu chiến dịch');
      } else {
        const created = await crmApi.campaigns.create(form);
        setSavedId(created.id);
        notify.success('Đã tạo chiến dịch, đang ở dạng nháp');
        navigate(`/backoffice/crm/campaigns/${created.id}/edit`, { replace: true });
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.error || 'Không thể lưu chiến dịch');
    } finally {
      setSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!savedId) { notify.warning('Lưu chiến dịch trước khi lên lịch'); return; }
    if (!scheduleAt) { notify.warning('Chọn thời gian gửi'); return; }
    try {
      // Input is Asia/Ho_Chi_Minh local time from the <input type="datetime-local">; sent as ISO local.
      await crmApi.campaigns.schedule(savedId, new Date(scheduleAt).toISOString());
      notify.success('Đã lên lịch gửi chiến dịch');
    } catch (err: any) {
      notify.error(err?.response?.data?.error || 'Không thể lên lịch');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/backoffice/crm/campaigns')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Danh sách chiến dịch
      </button>

      <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Sửa chiến dịch' : 'Tạo chiến dịch mới'}</h1>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
        <Field label="Tên chiến dịch" error={errors.name}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls(errors.name)} />
        </Field>
        <Field label="Tiêu đề email" error={errors.subject}>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls(errors.subject)} />
        </Field>
        <Field label="Preview text">
          <input value={form.previewText || ''} onChange={(e) => setForm({ ...form, previewText: e.target.value })} className={inputCls()} />
        </Field>
        <Field label="Phân nhóm mục tiêu">
          <SearchableSelect
            value={form.targetSegmentId || ''}
            onChange={(v) => setForm({ ...form, targetSegmentId: v || undefined })}
            placeholder="Tất cả khách hàng"
            options={[{ value: '', label: 'Tất cả khách hàng' }, ...segments.map((s) => ({ value: s.id, label: `${s.name} (${s.customerCount})` }))]}
          />
        </Field>
        <Field label="Nội dung email (HTML)" error={errors.htmlContent} hint="Dùng {{CustomerName}}, {{LastPurchaseDate}} để chèn cá nhân hóa">
          <textarea rows={8} value={form.htmlContent} onChange={(e) => setForm({ ...form, htmlContent: e.target.value })} className={`${inputCls(errors.htmlContent)} font-mono text-xs`} />
        </Field>

        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50">
          <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu chiến dịch'}
        </button>
      </motion.div>

      {savedId && (
        <>
          <CampaignPreviewTestSendPanel campaignId={savedId} />

          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <Calendar size={16} className="text-gray-400" />
            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <button onClick={handleSchedule} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-800">Lên lịch gửi (giờ VN)</button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(error?: string) {
  return `w-full px-3 py-2 border rounded-lg text-sm ${error ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`;
}
