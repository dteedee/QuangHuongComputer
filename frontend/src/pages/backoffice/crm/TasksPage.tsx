import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Calendar, AlertCircle, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { crmApi, type Task, type TaskStatus, formatDateTime, getTaskPriorityColor } from '../../../api/crm';
import { notify } from '../../../components/ui/toast';
import { useConfirm } from '../../../context/ConfirmContext';

const STATUS_TABS: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Cần làm' },
  { value: 'InProgress', label: 'Đang làm' },
  { value: 'Completed', label: 'Hoàn thành' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

/** Standalone tasks/follow-ups list (Todo item 6). Filters by status; overdue highlighted. */
export default function TasksPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const result = await crmApi.tasks.getList({ status: status || undefined, page, pageSize });
      setTasks(result.items);
      setTotal(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (id: string) => {
    try {
      await crmApi.tasks.complete(id);
      notify.success('Đã hoàn thành công việc');
      load();
    } catch {
      notify.error('Không thể cập nhật công việc');
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirm({ message: 'Hủy công việc này?', variant: 'warning' });
    if (!ok) return;
    try {
      await crmApi.tasks.cancel(id);
      notify.success('Đã hủy công việc');
      load();
    } catch {
      notify.error('Không thể hủy công việc');
    }
  };

  const isOverdue = (t: Task) => t.status === 'Pending' && t.dueDate && new Date(t.dueDate) < new Date();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Công việc &amp; Follow-up</h1>
          <p className="text-gray-500">{total} công việc</p>
        </div>
        <button
          onClick={() => navigate('/backoffice/crm/leads/pipeline')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm"
        >
          Xem Pipeline
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatus(t.value); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${status === t.value ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-gray-500">
            <p>Không tải được danh sách công việc.</p>
            <button onClick={load} className="mt-3 text-accent hover:underline">Thử lại</button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <CheckSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p>Không có công việc nào.</p>
            <p className="text-sm text-gray-400 mt-1">Thêm công việc từ trang chi tiết khách hàng hoặc lead.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{t.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTaskPriorityColor(t.priority)}`}>{t.priorityName}</span>
                    {isOverdue(t) && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        <AlertCircle size={12} /> Quá hạn
                      </span>
                    )}
                  </div>
                  {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {t.dueDate && <span className="flex items-center gap-1"><Calendar size={12} />{formatDateTime(t.dueDate)}</span>}
                    {t.assignedToUserName && <span>Phân công: {t.assignedToUserName}</span>}
                  </div>
                </div>
                {t.status !== 'Completed' && t.status !== 'Cancelled' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleComplete(t.id)} className="p-2 hover:bg-green-100 rounded-lg text-green-600" title="Hoàn thành">
                      <CheckSquare size={16} />
                    </button>
                    <button onClick={() => handleCancel(t.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-400" title="Hủy">
                      <Ban size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
