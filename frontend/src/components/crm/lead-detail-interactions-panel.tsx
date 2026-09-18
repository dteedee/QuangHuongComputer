import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { crmApi, type Interaction, type InteractionType } from '../../api/crm';
import { notify } from '../ui/toast';
import CustomerTimeline from './CustomerTimeline';

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: 'Note', label: 'Ghi chú' },
  { value: 'Call', label: 'Gọi điện' },
  { value: 'Email', label: 'Email' },
  { value: 'Meeting', label: 'Gặp mặt' },
  { value: 'SMS', label: 'SMS' },
];

interface Props {
  leadId: string;
  interactions: Interaction[];
  onAdded: () => void;
}

/** Lead-detail "hoạt động" tab: timeline (reuses Customer 360's component) + quick-add form. */
export function LeadDetailInteractionsPanel({ leadId, interactions, onAdded }: Props) {
  const [type, setType] = useState<InteractionType>('Note');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Cần nhập tiêu đề hoạt động');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await crmApi.leads.addInteraction(leadId, { type, subject: subject.trim(), content: content.trim() || undefined });
      setSubject('');
      setContent('');
      notify.success('Đã ghi nhận hoạt động');
      onAdded();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể lưu hoạt động, thử lại sau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-100 p-4 space-y-3"
      >
        <h3 className="font-semibold text-gray-800 text-sm">Thêm hoạt động</h3>
        <div className="flex flex-wrap gap-2">
          {INTERACTION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`px-3 py-1.5 text-xs rounded-lg border ${type === t.value ? 'bg-accent text-white border-accent' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Tiêu đề (ví dụ: Gọi tư vấn cấu hình PC)"
          className={`w-full px-3 py-2 border rounded-lg text-sm ${error ? 'border-red-400' : 'border-gray-200'}`}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          placeholder="Nội dung chi tiết (không bắt buộc)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50"
        >
          <Send size={14} />
          {saving ? 'Đang lưu...' : 'Ghi nhận'}
        </button>
      </motion.form>

      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Lịch sử hoạt động</h3>
        <CustomerTimeline interactions={interactions} maxItems={20} />
      </div>
    </div>
  );
}
