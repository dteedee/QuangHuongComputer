import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Plus, Edit, Trash2, Users, Play, X
} from 'lucide-react';
import { crmApi, type Segment, type CreateSegmentDto } from '../../../api/crm';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [runningAutoAssign, setRunningAutoAssign] = useState(false);

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const data = await crmApi.segments.getList();
      setSegments(data);
    } catch (error) {
      console.error('Failed to load segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa segment này?')) return;
    try {
      await crmApi.segments.delete(id);
      loadSegments();
    } catch (error) {
      console.error('Failed to delete segment:', error);
    }
  };

  const handleRunAutoAssign = async () => {
    try {
      setRunningAutoAssign(true);
      const result = await crmApi.segments.runAutoAssignment();
      alert(`Đã phân công ${result.assignedCount} khách hàng vào segments`);
      loadSegments();
    } catch (error) {
      console.error('Failed to run auto-assignment:', error);
    } finally {
      setRunningAutoAssign(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phân nhóm Khách hàng</h1>
          <p className="text-gray-500">{segments.length} phân nhóm</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAutoAssign}
            disabled={runningAutoAssign}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            <Play size={18} className={runningAutoAssign ? 'animate-spin' : ''} />
            <span>Chạy Auto-Assign</span>
          </button>
          <button
            onClick={() => {
              setEditingSegment(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
          >
            <Plus size={18} />
            <span>Thêm Phân nhóm</span>
          </button>
        </div>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: segment.color + '20' }}
                >
                  <Target size={20} style={{ color: segment.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                  <p className="text-xs text-gray-500 uppercase">{segment.code}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingSegment(segment);
                    setShowModal(true);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Edit size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => handleDelete(segment.id)}
                  className="p-2 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>

            {segment.description && (
              <p className="text-sm text-gray-600 mb-4">{segment.description}</p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-500">
                <Users size={16} />
                <span className="text-sm">{segment.customerCount} khách hàng</span>
              </div>

              {segment.isAutoAssign && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Auto-Assign
                </span>
              )}
            </div>
          </motion.div>
        ))}

        {/* Empty State */}
        {segments.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Target size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Chưa có phân nhóm nào</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-red-600 hover:underline"
            >
              Tạo phân nhóm đầu tiên
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <SegmentModal
          segment={editingSegment}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadSegments();
          }}
        />
      )}
    </div>
  );
}

function SegmentModal({
  segment,
  onClose,
  onSaved
}: {
  segment: Segment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: segment?.name || '',
    code: segment?.code || '',
    description: segment?.description || '',
    color: segment?.color || '#3B82F6',
    sortOrder: segment?.sortOrder || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;

    try {
      setLoading(true);
      if (segment) {
        await crmApi.segments.update(segment.id, {
          name: form.name,
          description: form.description || undefined,
          color: form.color,
          sortOrder: form.sortOrder,
        });
      } else {
        await crmApi.segments.create({
          name: form.name,
          code: form.code,
          description: form.description || undefined,
          color: form.color,
          sortOrder: form.sortOrder,
        });
      }
      onSaved();
    } catch (error) {
      console.error('Failed to save segment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {segment ? 'Sửa Phân nhóm' : 'Tạo Phân nhóm Mới'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên phân nhóm *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã phân nhóm *
            </label>
            <input
              type="text"
              required
              disabled={!!segment}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Màu sắc
              </label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 border border-gray-200 rounded-xl cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thứ tự
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
