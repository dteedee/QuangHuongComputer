import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { crmApi, type Segment } from '../../api/crm';
import { useConfirm } from '../../context/ConfirmContext';
import { notify } from '../ui/toast';
import { Can } from '../Can';
import { PERMISSIONS } from '../../constants/permissions';

interface Props {
  customerId: string;
  currentSegments: string[];
  onChanged: () => void;
}

/** Customer 360 "Phân nhóm" card — manual assign/remove against real segment ids. */
export function Customer360SegmentsCard({ customerId, currentSegments, onChanged }: Props) {
  const confirm = useConfirm();
  const [allSegments, setAllSegments] = useState<Segment[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    crmApi.segments.getList().then(setAllSegments).catch(() => setAllSegments([]));
  }, []);

  const bySegmentName = (name: string) => allSegments.find((s) => s.name === name);
  const available = allSegments.filter((s) => !currentSegments.includes(s.name));

  const handleAssign = async (segmentId: string) => {
    try {
      await crmApi.customers.assignToSegment(customerId, segmentId);
      notify.success('Đã gán phân nhóm');
      setAdding(false);
      onChanged();
    } catch {
      notify.error('Không thể gán phân nhóm');
    }
  };

  const handleRemove = async (segmentName: string) => {
    const seg = bySegmentName(segmentName);
    if (!seg) return;
    const ok = await confirm({ message: `Bỏ khách hàng khỏi phân nhóm "${segmentName}"?`, variant: 'warning' });
    if (!ok) return;
    try {
      await crmApi.customers.removeFromSegment(customerId, seg.id);
      notify.success('Đã bỏ phân nhóm');
      onChanged();
    } catch {
      notify.error('Không thể bỏ phân nhóm');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">Phân nhóm</h3>
        <Can permission={PERMISSIONS.CRM_MANAGE_CUSTOMERS}>
          <button onClick={() => setAdding((v) => !v)} className="text-xs flex items-center gap-1 text-accent hover:underline">
            <Plus size={14} /> Gán
          </button>
        </Can>
      </div>
      <div className="flex flex-wrap gap-2">
        {currentSegments.length === 0 && <span className="text-sm text-gray-400">Chưa thuộc phân nhóm nào</span>}
        {currentSegments.map((name) => (
          <span key={name} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
            {name}
            <Can permission={PERMISSIONS.CRM_MANAGE_CUSTOMERS}>
              <button onClick={() => handleRemove(name)} title="Bỏ khỏi phân nhóm"><X size={12} /></button>
            </Can>
          </span>
        ))}
      </div>
      {adding && (
        <div className="mt-3 flex flex-wrap gap-2">
          {available.length === 0 ? (
            <span className="text-xs text-gray-400">Không còn phân nhóm nào để gán</span>
          ) : available.map((s) => (
            <button
              key={s.id}
              onClick={() => handleAssign(s.id)}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-full hover:bg-gray-50"
              style={{ color: s.color }}
            >
              + {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
