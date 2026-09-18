import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { crmApi, type PipelineStage, formatCurrency } from '../../../api/crm';
import { useConfirm } from '../../../context/ConfirmContext';
import { notify } from '../../../components/ui/toast';

/** Stage settings: name, order, win probability (Implementation step 4). */
export default function PipelineSettingsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; winProbability: number; sortOrder: number; color: string }>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await crmApi.pipelineStages.getList();
      setStages(data);
      const d: typeof drafts = {};
      data.forEach((s) => { d[s.id] = { name: s.name, winProbability: s.winProbability, sortOrder: s.sortOrder, color: s.color }; });
      setDrafts(d);
    } catch {
      notify.error('Không tải được cấu hình pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (stage: PipelineStage) => {
    const d = drafts[stage.id];
    if (!d) return;
    setSaving(stage.id);
    try {
      await crmApi.pipelineStages.update(stage.id, {
        name: d.name, color: d.color, sortOrder: d.sortOrder, winProbability: d.winProbability,
      });
      notify.success('Đã lưu stage');
      load();
    } catch (err: any) {
      notify.error(err?.response?.data?.error || 'Không thể lưu stage');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (stage: PipelineStage) => {
    if (stage.leadCount > 0) {
      notify.warning(`Stage "${stage.name}" còn ${stage.leadCount} lead, không thể xóa`);
      return;
    }
    const ok = await confirm({ message: `Xóa stage "${stage.name}"?`, variant: 'danger' });
    if (!ok) return;
    try {
      await crmApi.pipelineStages.delete(stage.id);
      notify.success('Đã xóa stage');
      load();
    } catch (err: any) {
      notify.error(err?.response?.data?.error || 'Không thể xóa stage');
    }
  };

  const handleCreate = async () => {
    try {
      await crmApi.pipelineStages.create({
        name: 'Stage mới', color: '#94a3b8', sortOrder: stages.length + 1, winProbability: 10,
      });
      notify.success('Đã tạo stage mới');
      load();
    } catch (err: any) {
      notify.error(err?.response?.data?.error || 'Không thể tạo stage');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/backoffice/crm/leads/pipeline')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Về Pipeline
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Cấu hình Pipeline</h1>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-hover text-sm">
          <Plus size={16} /> Thêm stage
        </button>
      </div>

      {stages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Chưa có stage nào — thêm stage đầu tiên để bắt đầu dùng pipeline.</div>
      ) : (
        <div className="space-y-3">
          {stages.map((s) => {
            const d = drafts[s.id];
            if (!d) return null;
            return (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                <GripVertical size={16} className="text-gray-300" />
                <input type="color" value={d.color} onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...d, color: e.target.value } })} className="w-8 h-8 rounded" />
                <input
                  value={d.name}
                  onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...d, name: e.target.value } })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium"
                />
                <input
                  type="number"
                  value={d.sortOrder}
                  onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...d, sortOrder: Number(e.target.value) } })}
                  title="Thứ tự"
                  className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center"
                />
                <div className="flex items-center gap-1 w-28">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={d.winProbability}
                    onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...d, winProbability: Number(e.target.value) } })}
                    className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center"
                  />
                  <span className="text-xs text-gray-400">% thắng</span>
                </div>
                <span className="text-xs text-gray-400 w-28 text-right">{s.leadCount} lead · {formatCurrency(s.totalEstimatedValue)}</span>
                <button onClick={() => handleSave(s)} disabled={saving === s.id} className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 disabled:opacity-50" title="Lưu">
                  <Save size={16} />
                </button>
                <button onClick={() => handleDelete(s)} className="p-2 hover:bg-red-100 rounded-lg text-red-400" title="Xóa">
                  <Trash2 size={16} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
