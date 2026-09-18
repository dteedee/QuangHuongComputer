import { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { crmApi, type Task, formatDateTime, getTaskPriorityColor } from '../../api/crm';
import { notify } from '../ui/toast';
import { Can } from '../Can';
import { PERMISSIONS } from '../../constants/permissions';

interface Props {
  customerId: string;
  tasks: Task[];
  onChanged: () => void;
}

/** Customer 360 "Công việc" card — pending tasks + quick create + complete. */
export function Customer360TasksCard({ customerId, tasks, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await crmApi.tasks.create({ title: title.trim(), priority: 'Medium', customerId });
      setTitle('');
      setAdding(false);
      notify.success('Đã tạo công việc');
      onChanged();
    } catch {
      notify.error('Không thể tạo công việc, thử lại sau');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await crmApi.tasks.complete(id);
      onChanged();
    } catch {
      notify.error('Không thể hoàn thành công việc');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">Công việc đang chờ</h3>
        <Can permission={PERMISSIONS.CRM_MANAGE_TASKS}>
          <button onClick={() => setAdding((v) => !v)} className="text-xs flex items-center gap-1 text-accent hover:underline">
            <Plus size={14} /> Thêm
          </button>
        </Can>
      </div>

      {adding && (
        <div className="flex gap-2 mb-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề công việc"
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
          <button onClick={handleAdd} disabled={saving} className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm disabled:opacity-50">Lưu</button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Không có công việc nào đang chờ.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 rounded-lg">
              <button onClick={() => handleComplete(t.id)} title="Hoàn thành" className="text-gray-300 hover:text-green-600">
                <CheckSquare size={18} />
              </button>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{t.title}</p>
                {t.dueDate && <p className="text-xs text-gray-400">Hạn: {formatDateTime(t.dueDate)}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getTaskPriorityColor(t.priority)}`}>{t.priorityName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
